import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Contract, JsonRpcProvider, getAddress, hashMessage, verifyMessage } from "npm:ethers@6.15.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const EIP1271_MAGIC_VALUE = "0x1626ba7e";
const EIP1271_ABI = ["function isValidSignature(bytes32 hash, bytes signature) view returns (bytes4)"];
const BUCKET = "entity-onboarding-documents";

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

function randomHex(bytes = 20): string {
  const values = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(values, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizeAddress(value: unknown): string | null {
  const address = String(value || "").trim().toLowerCase();
  return /^0x[0-9a-f]{40}$/.test(address) ? address : null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Missing authorization token" }, 401);
    const jwt = authHeader.slice(7).trim();
    if (jwtClaim(jwt, "aal") !== "aal2") return json({ error: "Two-factor authentication is required" }, 403);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Invalid or expired token" }, 401);

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");
    const { data: profile } = await admin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    const isAdmin = profile?.is_admin === true;

    if (action === "verify_signature") {
      const challengeId = String(body?.challenge_id || "");
      const signature = String(body?.signature || "").trim();
      if (!challengeId || !/^0x[0-9a-fA-F]+$/.test(signature)) return json({ error: "A valid challenge and signature are required" }, 422);

      const { data: challenge, error: challengeError } = await admin
        .from("entity_wallet_ownership_challenges")
        .select("*, entity_applications!inner(entity_legal_name, primary_contact_user_id, status)")
        .eq("id", challengeId)
        .maybeSingle();
      if (challengeError) throw challengeError;
      if (!challenge || challenge.requested_by !== user.id || challenge.entity_applications?.primary_contact_user_id !== user.id) {
        return json({ error: "Wallet ownership challenge not found" }, 404);
      }
      if (challenge.consumed_at) return json({ error: "This signing challenge has already been used" }, 409);
      if (new Date(challenge.expires_at).getTime() <= Date.now()) return json({ error: "This signing challenge has expired" }, 410);

      let proofMethod = "";
      try {
        if (verifyMessage(challenge.message, signature).toLowerCase() === challenge.wallet_address) {
          proofMethod = "eoa_signature";
        }
      } catch {
        // A contract-wallet signature is not expected to recover to the wallet address.
      }

      if (!proofMethod) {
        const rpcUrl = Deno.env.get("ENTITY_WALLET_RPC_URL") || Deno.env.get("ETHEREUM_RPC_URL");
        if (!rpcUrl) return json({ error: "Contract-wallet verification is temporarily unavailable" }, 503);
        const provider = new JsonRpcProvider(rpcUrl, Number(challenge.chain_id));
        const code = await provider.getCode(getAddress(challenge.wallet_address));
        if (code === "0x") return json({ error: "The signature does not match the declared wallet" }, 422);
        const contract = new Contract(getAddress(challenge.wallet_address), EIP1271_ABI, provider);
        const result = String(await contract.isValidSignature(hashMessage(challenge.message), signature)).toLowerCase();
        if (result !== EIP1271_MAGIC_VALUE) return json({ error: "The smart-contract wallet rejected the signature" }, 422);
        proofMethod = "eip1271_signature";
      }

      const now = new Date().toISOString();
      const { data: proof, error: proofError } = await admin
        .from("entity_wallet_ownership_proofs")
        .upsert({
          application_id: challenge.application_id,
          wallet_address: challenge.wallet_address,
          chain_id: challenge.chain_id,
          proof_method: proofMethod,
          status: "verified",
          challenge_id: challenge.id,
          evidence: {
            message_hash: challenge.message_hash,
            signature_hash: await sha256(signature),
            verification_standard: proofMethod === "eip1271_signature" ? "EIP-1271" : "EIP-191",
          },
          submitted_by: user.id,
          verified_at: now,
          reviewed_by: null,
          reviewed_at: null,
          review_rationale: null,
        }, { onConflict: "application_id,wallet_address" })
        .select()
        .single();
      if (proofError) throw proofError;
      const { error: consumeError } = await admin.from("entity_wallet_ownership_challenges")
        .update({ consumed_at: now }).eq("id", challenge.id).is("consumed_at", null);
      if (consumeError) throw consumeError;
      const { error: eventError } = await admin.from("entity_wallet_ownership_events").insert({
        application_id: challenge.application_id,
        proof_id: proof.id,
        wallet_address: challenge.wallet_address,
        event_type: "signature_verified",
        actor_id: user.id,
        details: { proof_method: proofMethod, message_hash: challenge.message_hash },
      });
      if (eventError) throw eventError;
      return json({ proof });
    }

    const applicationId = String(body?.application_id || "");
    const walletAddress = normalizeAddress(body?.wallet_address);
    if (!applicationId) return json({ error: "Application is required" }, 422);
    const { data: application, error: applicationError } = await admin
      .from("entity_applications")
      .select("id, entity_legal_name, primary_contact_user_id, status, crypto_wallet_addresses")
      .eq("id", applicationId)
      .maybeSingle();
    if (applicationError) throw applicationError;
    if (!application) return json({ error: "Entity application not found" }, 404);
    const ownsApplication = application.primary_contact_user_id === user.id;
    if (!ownsApplication && !isAdmin) return json({ error: "Forbidden" }, 403);

    if (action === "challenge") {
      if (!ownsApplication) return json({ error: "Only the applicant may sign for a declared wallet" }, 403);
      if (!walletAddress) return json({ error: "Enter a valid Ethereum-compatible address" }, 422);
      const declared = (application.crypto_wallet_addresses || []).map((value: string) => value.toLowerCase());
      if (!declared.includes(walletAddress)) return json({ error: "Save this wallet in the application before proving ownership" }, 409);
      if (!["draft", "in_progress", "information_requested"].includes(application.status)) {
        return json({ error: "This application is not open for wallet changes" }, 409);
      }
      const { count: recentChallengeCount, error: recentChallengeError } = await admin
        .from("entity_wallet_ownership_challenges")
        .select("id", { count: "exact", head: true })
        .eq("requested_by", user.id)
        .gte("created_at", new Date(Date.now() - 10 * 60_000).toISOString());
      if (recentChallengeError) throw recentChallengeError;
      if ((recentChallengeCount || 0) >= 10) return json({ error: "Too many signing challenges. Wait a few minutes and try again." }, 429);

      const issuedAt = new Date();
      const expiresAt = new Date(issuedAt.getTime() + 10 * 60_000);
      const chainId = Number(body?.chain_id || 11155111);
      if (!Number.isSafeInteger(chainId) || chainId <= 0) return json({ error: "Invalid wallet network" }, 422);
      const nonce = randomHex();
      const message = [
        "ByteStrike wallet ownership confirmation",
        "",
        `Entity: ${application.entity_legal_name}`,
        `Application ID: ${application.id}`,
        `Wallet: ${walletAddress}`,
        `Chain ID: ${chainId}`,
        "Purpose: I confirm that this wallet is controlled by or held for the entity named above and is declared for its ByteStrike application.",
        "No funds will move by signing this message.",
        `Nonce: ${nonce}`,
        `Issued at: ${issuedAt.toISOString()}`,
        `Expires at: ${expiresAt.toISOString()}`,
      ].join("\n");
      const { data: challenge, error } = await admin.from("entity_wallet_ownership_challenges").insert({
        application_id: application.id,
        wallet_address: walletAddress,
        chain_id: chainId,
        message,
        message_hash: await sha256(message),
        requested_by: user.id,
        expires_at: expiresAt.toISOString(),
      }).select("id, wallet_address, chain_id, message, expires_at").single();
      if (error) throw error;
      return json({ challenge });
    }

    if (action === "submit_fallback") {
      if (!ownsApplication) return json({ error: "Only the applicant may submit wallet evidence" }, 403);
      if (!walletAddress) return json({ error: "Enter a valid Ethereum-compatible address" }, 422);
      const declared = (application.crypto_wallet_addresses || []).map((value: string) => value.toLowerCase());
      if (!declared.includes(walletAddress)) return json({ error: "This wallet is not declared in the application" }, 409);
      const method = String(body?.proof_method || "");
      if (!["custodian_confirmation", "test_transaction"].includes(method)) return json({ error: "Unsupported fallback method" }, 422);
      const evidence: Record<string, unknown> = {};
      if (method === "custodian_confirmation") {
        const storagePath = String(body?.storage_path || "");
        const expectedPrefix = `${user.id}/${application.id}/wallet-proof/${walletAddress}/`;
        if (!storagePath.startsWith(expectedPrefix)) return json({ error: "Invalid evidence path" }, 422);
        const fileName = storagePath.slice(expectedPrefix.length);
        const { data: files, error: listError } = await admin.storage.from(BUCKET).list(expectedPrefix.replace(/\/$/, ""), { search: fileName, limit: 2 });
        if (listError || !files?.some((file) => file.name === fileName)) return json({ error: "The custodian confirmation upload could not be verified" }, 422);
        evidence.storage_path = storagePath;
        evidence.original_filename = String(body?.original_filename || "Custodian confirmation").slice(0, 255);
      } else {
        const txHash = String(body?.transaction_hash || "").trim().toLowerCase();
        if (!/^0x[0-9a-f]{64}$/.test(txHash)) return json({ error: "Enter a valid transaction hash" }, 422);
        evidence.transaction_hash = txHash;
        evidence.note = String(body?.note || "").trim().slice(0, 1000);
      }

      const { data: proof, error: proofError } = await admin.from("entity_wallet_ownership_proofs").upsert({
        application_id: application.id,
        wallet_address: walletAddress,
        chain_id: Number(body?.chain_id || 11155111),
        proof_method: method,
        status: "pending_review",
        challenge_id: null,
        evidence,
        submitted_by: user.id,
        verified_at: null,
        reviewed_by: null,
        reviewed_at: null,
        review_rationale: null,
      }, { onConflict: "application_id,wallet_address" }).select().single();
      if (proofError) throw proofError;
      const { error: eventError } = await admin.from("entity_wallet_ownership_events").insert({
        application_id: application.id,
        proof_id: proof.id,
        wallet_address: walletAddress,
        event_type: "fallback_submitted",
        actor_id: user.id,
        details: { proof_method: method },
      });
      if (eventError) throw eventError;
      return json({ proof });
    }

    if (action === "review_fallback") {
      if (!isAdmin) return json({ error: "Only Compliance may review fallback evidence" }, 403);
      const proofId = String(body?.proof_id || "");
      const decision = String(body?.decision || "");
      const rationale = String(body?.rationale || "").trim();
      if (!proofId || !["verified", "rejected"].includes(decision) || rationale.length < 10) {
        return json({ error: "Select a decision and provide a clear rationale" }, 422);
      }
      const now = new Date().toISOString();
      const { data: proof, error: proofError } = await admin.from("entity_wallet_ownership_proofs")
        .update({ status: decision, verified_at: decision === "verified" ? now : null, reviewed_by: user.id, reviewed_at: now, review_rationale: rationale })
        .eq("id", proofId).eq("application_id", application.id).eq("status", "pending_review").select().maybeSingle();
      if (proofError) throw proofError;
      if (!proof) return json({ error: "Fallback evidence is no longer awaiting review" }, 409);
      const { error: eventError } = await admin.from("entity_wallet_ownership_events").insert({
        application_id: application.id,
        proof_id: proof.id,
        wallet_address: proof.wallet_address,
        event_type: decision === "verified" ? "fallback_verified" : "fallback_rejected",
        actor_id: user.id,
        details: { rationale },
      });
      if (eventError) throw eventError;
      return json({ proof });
    }

    if (action === "evidence_url") {
      const proofId = String(body?.proof_id || "");
      const { data: proof, error: proofError } = await admin.from("entity_wallet_ownership_proofs")
        .select("id, evidence").eq("id", proofId).eq("application_id", application.id).maybeSingle();
      if (proofError) throw proofError;
      const storagePath = proof?.evidence?.storage_path;
      if (!storagePath) return json({ error: "This proof has no uploaded document" }, 404);
      const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(storagePath, 300);
      if (error || !data?.signedUrl) return json({ error: "Could not open the evidence document" }, 500);
      return json({ signed_url: data.signedUrl });
    }

    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    console.error("Entity wallet ownership error", error);
    return json({ error: error instanceof Error ? error.message : "Wallet ownership request failed" }, 500);
  }
});
