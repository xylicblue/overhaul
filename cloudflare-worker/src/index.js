/**
 * ByteStrike API Gateway — Cloudflare Worker
 *
 * Proxies requests to Supabase with:
 * - Rate limiting (in-memory per-worker, KV for distributed)
 * - CORS enforcement
 * - Security headers
 * - Response caching for public market data
 * - Request validation & sanitization
 */

// ── Rate limiter (in-memory, per-worker instance) ────────────────────────
const rateLimitStore = new Map(); // key → { count, resetAt }
const RATE_LIMITS = {
  auth: { max: 20, windowMs: 60_000 },      // 20 req/min for auth
  write: { max: 60, windowMs: 60_000 },      // 60 req/min for mutations
  read: { max: 200, windowMs: 60_000 },      // 200 req/min for reads
  edge: { max: 30, windowMs: 60_000 },       // 30 req/min for edge functions
};

function checkRateLimit(key, tier) {
  const limit = RATE_LIMITS[tier] || RATE_LIMITS.read;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + limit.windowMs });
    return { allowed: true, remaining: limit.max - 1 };
  }

  entry.count++;
  if (entry.count > limit.max) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  return { allowed: true, remaining: limit.max - entry.count };
}

// Clean up stale entries inline (called per-request, cheap check)
let lastCleanup = 0;
function cleanupRateLimits() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return; // Only clean once per minute
  lastCleanup = now;
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  }
}

// ── Classify request tier ────────────────────────────────────────────────
function classifyRequest(pathname, method) {
  // Edge function calls
  if (pathname.startsWith("/functions/v1/")) {
    if (pathname.includes("wallet-auth") || pathname.includes("check-location")) return "auth";
    if (pathname.includes("api-trade")) return "write";
    if (pathname.includes("api-profile")) return "write";
    if (pathname.includes("api-waitlist")) return "write";
    if (pathname.includes("get-sumsub-token")) return "auth";
    return "edge";
  }

  // Auth endpoints
  if (pathname.startsWith("/auth/")) return "auth";

  // REST API writes
  if (method === "POST" || method === "PATCH" || method === "DELETE" || method === "PUT") return "write";

  // Everything else is a read
  return "read";
}

// ── Public data paths that can be cached ─────────────────────────────────
const CACHEABLE_TABLES = [
  "price_data", "b200_index_prices", "h200_index_prices", "a100_index_prices",
  "t4_index_prices", "h100_non_hyperscalers_perp_prices", "h100_hyperscalers_perp_prices",
  "h100_hyperscaler_prices", "b200_provider_prices", "h200_provider_prices",
  "market_stats_24h", "vamm_price_history",
];

function isCacheableRequest(pathname, method) {
  if (method !== "GET") return false;
  return CACHEABLE_TABLES.some(table => pathname.includes(`/rest/v1/${table}`));
}

// ── Security headers ─────────────────────────────────────────────────────
const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

// ── Main handler ─────────────────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    cleanupRateLimits();
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const method = request.method;

    // ── CORS ───────────────────────────────────────────────────────────
    const allowedOrigins = (env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim());
    const isAllowedOrigin = allowedOrigins.includes(origin) || origin.includes("localhost");

    const corsHeaders = {
      "Access-Control-Allow-Origin": isAllowedOrigin ? origin : allowedOrigins[0] || "",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, prefer, x-request-id",
      "Access-Control-Max-Age": "86400",
      "Access-Control-Expose-Headers": "x-ratelimit-remaining, x-ratelimit-reset",
    };

    // Preflight
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Block disallowed origins in production
    if (!isAllowedOrigin && !url.hostname.includes("localhost")) {
      return new Response(JSON.stringify({ error: "Forbidden origin" }), {
        status: 403,
        headers: { ...corsHeaders, ...SECURITY_HEADERS, "Content-Type": "application/json" },
      });
    }

    // ── Rate limiting ──────────────────────────────────────────────────
    const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";
    const tier = classifyRequest(url.pathname, method);
    const rateLimitKey = `${clientIP}:${tier}`;
    const rl = checkRateLimit(rateLimitKey, tier);

    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
        status: 429,
        headers: {
          ...corsHeaders,
          ...SECURITY_HEADERS,
          "Content-Type": "application/json",
          "Retry-After": String(rl.retryAfter || 60),
          "X-RateLimit-Remaining": "0",
        },
      });
    }

    // ── Build proxy URL ────────────────────────────────────────────────
    const supabaseUrl = env.SUPABASE_URL;
    if (!supabaseUrl) {
      return new Response(JSON.stringify({ error: "Gateway misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, ...SECURITY_HEADERS, "Content-Type": "application/json" },
      });
    }

    const proxyUrl = new URL(url.pathname + url.search, supabaseUrl);

    // ── Proxy headers ──────────────────────────────────────────────────
    const proxyHeaders = new Headers();

    // Forward essential headers
    const forwardHeaders = ["authorization", "content-type", "prefer", "x-client-info", "accept"];
    for (const h of forwardHeaders) {
      const val = request.headers.get(h);
      if (val) proxyHeaders.set(h, val);
    }

    // ALWAYS inject the anon key (clients no longer need it)
    proxyHeaders.set("apikey", env.SUPABASE_ANON_KEY || "");

    // For edge function calls, ensure apikey + Authorization are always set
    if (url.pathname.startsWith("/functions/v1/")) {
      proxyHeaders.set("apikey", env.SUPABASE_ANON_KEY || "");
      // Supabase requires an Authorization header even for --no-verify-jwt functions.
      // If the client didn't send one, use the anon key as a bearer token.
      if (!proxyHeaders.has("authorization")) {
        proxyHeaders.set("authorization", `Bearer ${env.SUPABASE_ANON_KEY}`);
      }
    }

    // ── Caching for public market data ─────────────────────────────────
    const cacheTtl = parseInt(env.CACHE_TTL || "30", 10);
    if (isCacheableRequest(url.pathname, method) && cacheTtl > 0) {
      const cache = caches.default;
      const cacheKey = new Request(url.toString(), { method: "GET" });
      const cached = await cache.match(cacheKey);

      if (cached) {
        const resp = new Response(cached.body, cached);
        // Add our headers
        for (const [k, v] of Object.entries(corsHeaders)) resp.headers.set(k, v);
        for (const [k, v] of Object.entries(SECURITY_HEADERS)) resp.headers.set(k, v);
        resp.headers.set("X-Cache", "HIT");
        resp.headers.set("X-RateLimit-Remaining", String(rl.remaining));
        return resp;
      }
    }

    // ── Proxy the request ──────────────────────────────────────────────
    let body = null;
    if (method !== "GET" && method !== "HEAD") {
      body = await request.text();

      // Basic body size limit (1MB)
      if (body.length > 1_048_576) {
        return new Response(JSON.stringify({ error: "Request body too large" }), {
          status: 413,
          headers: { ...corsHeaders, ...SECURITY_HEADERS, "Content-Type": "application/json" },
        });
      }
    }

    const proxyResponse = await fetch(proxyUrl.toString(), {
      method,
      headers: proxyHeaders,
      body,
    });

    // ── Build response ─────────────────────────────────────────────────
    const responseHeaders = new Headers(proxyResponse.headers);

    // Add our headers
    for (const [k, v] of Object.entries(corsHeaders)) responseHeaders.set(k, v);
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) responseHeaders.set(k, v);
    responseHeaders.set("X-RateLimit-Remaining", String(rl.remaining));
    responseHeaders.set("X-Cache", "MISS");

    // Remove Supabase's own CORS headers to avoid duplicates
    responseHeaders.delete("access-control-allow-origin");

    // Re-set our CORS
    for (const [k, v] of Object.entries(corsHeaders)) responseHeaders.set(k, v);

    const response = new Response(proxyResponse.body, {
      status: proxyResponse.status,
      headers: responseHeaders,
    });

    // Cache public data responses
    if (isCacheableRequest(url.pathname, method) && proxyResponse.ok && cacheTtl > 0) {
      const cacheResponse = response.clone();
      cacheResponse.headers.set("Cache-Control", `public, max-age=${cacheTtl}`);
      const cache = caches.default;
      ctx.waitUntil(cache.put(new Request(url.toString(), { method: "GET" }), cacheResponse));
    }

    return response;
  },
};
