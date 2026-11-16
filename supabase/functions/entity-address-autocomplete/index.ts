import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AddressSuggestion = {
  place_id: string;
  address: string;
  primary_text: string;
  secondary_text: string;
};

type PhotonFeature = {
  properties?: Record<string, unknown>;
};

const responseCache = new Map<string, { expiresAt: number; suggestions: AddressSuggestion[] }>();
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_LIMIT = 250;

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

function textValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function uniqueParts(parts: string[]): string[] {
  const seen = new Set<string>();
  return parts.filter((part) => {
    const normalized = part.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function formatFeature(feature: PhotonFeature, index: number): AddressSuggestion | null {
  const properties = feature.properties || {};
  const name = textValue(properties.name);
  const street = textValue(properties.street) || name;
  const houseNumber = textValue(properties.housenumber);
  const primary = uniqueParts([
    houseNumber && street ? `${houseNumber} ${street}` : street,
    !street ? name : "",
  ])[0] || "";
  const locality = textValue(properties.city)
    || textValue(properties.locality)
    || textValue(properties.district)
    || textValue(properties.county);
  const secondary = uniqueParts([
    locality,
    textValue(properties.state),
    textValue(properties.postcode),
    textValue(properties.country),
  ]);
  const address = uniqueParts([primary, ...secondary]).join(", ");
  if (!address) return null;

  const osmType = textValue(properties.osm_type) || "feature";
  const osmId = textValue(properties.osm_id) || String(index);
  return {
    place_id: `photon:${osmType}:${osmId}`,
    address,
    primary_text: primary || address,
    secondary_text: secondary.join(", "),
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

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

  const body = await req.json().catch(() => ({}));
  const input = String(body?.input || "").trim().slice(0, 180);
  const countryCode = String(body?.country_code || "").trim().toLowerCase();
  if (input.length < 3) return json({ suggestions: [], provider: "photon" });
  if (countryCode && !/^[a-z]{2}$/.test(countryCode)) return json({ error: "Invalid country code" }, 422);

  const cacheKey = `${countryCode}:${input.toLowerCase()}`;
  const cached = responseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return json({ suggestions: cached.suggestions, provider: "photon" });
  }
  if (cached) responseCache.delete(cacheKey);

  const endpoint = new URL("https://photon.komoot.io/api/");
  endpoint.searchParams.set("q", input);
  endpoint.searchParams.set("limit", "10");
  endpoint.searchParams.set("lang", "en");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  let response: Response;
  try {
    response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        "User-Agent": "ByteStrike-Onboarding/1.0 (address autocomplete)",
      },
      signal: controller.signal,
    });
  } catch (error) {
    console.error("Photon address autocomplete failed", error);
    return json({ error: "Address suggestions are temporarily unavailable" }, 502);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const providerBody = await response.text();
    console.error("Photon address autocomplete failed", response.status, providerBody.slice(0, 500));
    return json({ error: "Address suggestions are temporarily unavailable" }, 502);
  }

  const payload = await response.json();
  const features = Array.isArray(payload?.features) ? payload.features as PhotonFeature[] : [];
  const countryMatches = countryCode
    ? features.filter((feature) => textValue(feature.properties?.countrycode).toLowerCase() === countryCode)
    : features;
  const selectedFeatures = countryCode ? countryMatches : features;
  const suggestions = selectedFeatures
    .map(formatFeature)
    .filter((item): item is AddressSuggestion => Boolean(item))
    .slice(0, 5);

  if (responseCache.size >= CACHE_LIMIT) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) responseCache.delete(oldestKey);
  }
  responseCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, suggestions });

  return json({ suggestions, provider: "photon" });
});
