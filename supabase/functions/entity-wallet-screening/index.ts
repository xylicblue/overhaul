import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ScorechainApiError,
  screenEthereumAddress,
  walletKeyForSeverity,
  worstSeverity,
} from "../_shared/scorechain.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

function jwtClaim(token: string, claim: string): unknown {
  try {
    const part = token.split(".")[1];
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")))?.[claim] ?? null;
  } catch {
    return null;
  }
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function mapWithConcurrency<T, R>(values: T[], limit: number, mapper: (value: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(values.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (next < values.length) {
      const index = next++;
      results[index] = await mapper(values[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let runId = "";
  let admin: ReturnType<typeof createClient> | null = null;
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Missing authorization token" }, 401);
    const jwt = authHeader.slice("Bearer ".length).trim();
    if (jwtClaim(jwt, "aal") !== "aal2") {
      return json({ error: "Two-factor authentication is required", code: "mfa_required" }, 403);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Invalid or expired token" }, 401);

    admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const requestedApplicationId = typeof body?.application_id === "string" ? body.application_id : null;
    const force = body?.force === true;

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) return json({ error: "Could not verify wallet-screening access" }, 500);
    const isAdmin = profile?.is_admin === true;
    if (force && !isAdmin) return json({ error: "Only Compliance may force a new screening" }, 403);

    let applicationQuery = admin
      .from("entity_applications")
      .select("id, primary_contact_user_id, status, crypto_wallet_addresses, entity_legal_name");
    if (requestedApplicationId) applicationQuery = applicationQuery.eq("id", requestedApplicationId);
    else applicationQuery = applicationQuery.eq("primary_contact_user_id", user.id);
    const { data: application, error: applicationError } = await applicationQuery.maybeSingle();
    if (applicationError) return json({ error: "Could not load the entity application" }, 500);
    if (!application) return json({ error: "Entity application not found" }, 404);
    if (!isAdmin && application.primary_contact_user_id !== user.id) return json({ error: "Forbidden" }, 403);
    if (!["submitted", "under_review", "approved"].includes(application.status)) {
      return json({ error: "Submit the entity application before wallet screening" }, 409);
    }

    const addresses = [...new Set((application.crypto_wallet_addresses || [])
      .map((value: unknown) => String(value).trim().toLowerCase())
      .filter(Boolean))]
      .sort();
    if (!addresses.length) return json({ error: "No intended wallet addresses were supplied" }, 422);
    const configuredMaximum = Number(Deno.env.get("SCORECHAIN_MAX_ADDRESSES") || 10);
    const maximumAddresses = Number.isInteger(configuredMaximum) && configuredMaximum > 0
      ? configuredMaximum
      : 10;
    if (addresses.length > maximumAddresses) {
      return json({ error: `At most ${maximumAddresses} wallet addresses can be screened per application` }, 422);
    }
    const invalidAddress = addresses.find((address) => !/^0x[0-9a-f]{40}$/.test(address));
    if (invalidAddress) {
      return json({
        error: `Wallet ${invalidAddress} is not a valid Ethereum-compatible address`,
        code: "invalid_wallet_address",
      }, 422);
    }

    // Ownership proof is a mandatory upstream control. Do not allow a direct
    // function call, an admin retry, or a stale browser to screen a wallet
    // before control of every currently declared address has been verified.
    const { data: ownershipProofs, error: ownershipError } = await admin
      .from("entity_wallet_ownership_proofs")
      .select("wallet_address, status")
      .eq("application_id", application.id)
      .in("wallet_address", addresses);
    if (ownershipError) throw ownershipError;
    const verifiedWallets = new Set((ownershipProofs || [])
      .filter((proof) => proof.status === "verified")
      .map((proof) => String(proof.wallet_address).toLowerCase()));
    const unverifiedWallets = addresses.filter((address) => !verifiedWallets.has(address));
    if (unverifiedWallets.length) {
      return json({
        error: "Wallet ownership must be verified before Scorechain screening",
        code: "wallet_ownership_required",
        unverified_wallets: unverifiedWallets,
      }, 409);
    }

    const inputFingerprint = await sha256(JSON.stringify({
      addresses,
      blockchain: "ETHEREUM",
      coin: "ALL",
      analysis_type: "FULL",
      depth: 6,
    }));
    const { data: existing, error: existingError } = await admin
      .from("entity_scorechain_screening_runs")
      .select("*")
      .eq("application_id", application.id)
      .eq("input_fingerprint", inputFingerprint)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing?.status === "completed" && !force) {
      return json({
        ok: true,
        cached: true,
        wallet_key: existing.wallet_key,
        screened_addresses: existing.addresses,
        completed_at: existing.completed_at,
      });
    }
    const processingIsFresh = existing?.status === "processing" && existing.started_at &&
      Date.now() - new Date(existing.started_at).getTime() < 5 * 60 * 1000;
    if (processingIsFresh) {
      return json({ error: "Wallet screening is already in progress", code: "screening_in_progress" }, 409);
    }

    const now = new Date().toISOString();
    if (existing?.status === "processing") {
      const { error: staleError } = await admin
        .from("entity_scorechain_screening_runs")
        .update({
          status: "failed",
          last_error_code: "stale_run_replaced",
          last_error_message: "A stale processing run was replaced by a new attempt.",
          completed_at: now,
          updated_at: now,
        })
        .eq("id", existing.id)
        .eq("status", "processing");
      if (staleError) throw staleError;
    }

    const { data: claimed, error: claimError } = await admin
      .from("entity_scorechain_screening_runs")
      .insert({
        application_id: application.id,
        input_fingerprint: inputFingerprint,
        status: "processing",
        addresses,
        blockchain: "ETHEREUM",
        coin: "ALL",
        analysis_type: "FULL",
        depth: 6,
        requested_by: user.id,
        started_at: now,
        attempt_count: Number(existing?.attempt_count || 0) + 1,
      })
      .select("id")
      .single();
    if (claimError?.code === "23505") {
      return json({ error: "Wallet screening was started by another request", code: "screening_in_progress" }, 409);
    }
    if (claimError) throw claimError;
    runId = claimed.id;

    const addressResults = await mapWithConcurrency(addresses, 3, screenEthereumAddress);
    const severity = worstSeverity(addressResults.map((result) => result.severity));
    const walletKey = walletKeyForSeverity(severity);
    const providerAnalysisIds = addressResults.map((result) => result.analysisId).filter(Boolean);
    const evidence = {
      source: "Scorechain Risk Scoring API",
      endpoint: "/scoringAnalysis",
      blockchain: "ETHEREUM",
      coin: "ALL",
      analysis_type: "FULL",
      depth: 6,
      aggregate_severity: severity,
      input_fingerprint: inputFingerprint,
      response_authenticity_verified: addressResults.every((result) => result.signatureVerified),
      address_results: addressResults.map((result) => ({
        address: result.address,
        analysis_id: result.analysisId,
        lowest_score: result.lowestScore,
        severity: result.severity,
        components: result.components,
      })),
    };
    const providerReference = providerAnalysisIds.join(",");
    const { data: recorded, error: recordError } = await admin.rpc("service_record_entity_wallet_screening", {
      p_application_id: application.id,
      p_wallet_key: walletKey,
      p_provider_reference: providerReference || null,
      p_screened_addresses: addresses,
      p_evidence: evidence,
    });
    if (recordError) throw recordError;

    const completedAt = new Date().toISOString();
    const { error: completeError } = await admin
      .from("entity_scorechain_screening_runs")
      .update({
        status: "completed",
        wallet_key: walletKey,
        provider_analysis_ids: providerAnalysisIds,
        results: evidence,
        completed_at: completedAt,
        updated_at: completedAt,
      })
      .eq("id", runId);
    if (completeError) throw completeError;

    return json({
      ok: true,
      cached: false,
      wallet_key: walletKey,
      severity,
      screened_addresses: addresses,
      provider_analysis_ids: providerAnalysisIds,
      automatic_assessment: recorded?.automatic_assessment || null,
      completed_at: completedAt,
    });
  } catch (error) {
    const providerError = error instanceof ScorechainApiError ? error : null;
    const errorMessage = error instanceof Error
      ? error.message
      : String((error as { message?: unknown } | null)?.message || "Wallet screening failed");
    console.error("Entity wallet screening failed", providerError?.providerCode || "internal_error", error);
    if (admin && runId) {
      await admin
        .from("entity_scorechain_screening_runs")
        .update({
          status: "failed",
          last_error_code: providerError?.providerCode || "internal_error",
          last_error_message: errorMessage.slice(0, 500),
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", runId);
    }
    const status = providerError?.status === 401 || providerError?.status === 403 ? 502 : providerError?.status || 500;
    return json({
      error: providerError?.message || "Wallet screening could not be completed",
      code: providerError?.providerCode || "wallet_screening_failed",
    }, status);
  }
});
