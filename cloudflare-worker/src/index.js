/**
 * ByteStrike API Gateway — Cloudflare Worker
 *
 * Proxies requests to Supabase with:
 * - Rate limiting (KV-backed, globally distributed)
 * - CORS enforcement
 * - Security headers
 * - KV response caching for public market data
 * - Request validation & sanitization
 */

// ── Rate-limit config ────────────────────────────────────────────────────
const RATE_LIMITS = {
  auth: { max: 20, windowSec: 60 },      // 20 req/min for auth
  write: { max: 60, windowSec: 60 },      // 60 req/min for mutations
  read: { max: 200, windowSec: 60 },      // 200 req/min for reads
  edge: { max: 30, windowSec: 60 },       // 30 req/min for edge functions
};

// In-memory fallback when KV is unavailable (keeps old behaviour)
const memStore = new Map();

async function checkRateLimit(key, tier, kv) {
  const limit = RATE_LIMITS[tier] || RATE_LIMITS.read;
  const now = Date.now();

  // ── Try KV first (distributed, accurate) ─────────────────────────
  if (kv) {
    try {
      const kvKey = `rl:${key}`;
      const raw = await kv.get(kvKey, "json");
      const entry = raw || { count: 0, resetAt: now + limit.windowSec * 1000 };

      // Window expired → reset
      if (now > entry.resetAt) {
        entry.count = 1;
        entry.resetAt = now + limit.windowSec * 1000;
      } else {
        entry.count++;
      }

      if (entry.count > limit.max) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        // Still persist the over-limit count so it doesn't reset on next read
        await kv.put(kvKey, JSON.stringify(entry), { expirationTtl: limit.windowSec + 5 });
        return { allowed: false, remaining: 0, retryAfter };
      }

      // Fire-and-forget write (don't block request)
      await kv.put(kvKey, JSON.stringify(entry), { expirationTtl: limit.windowSec + 5 });
      return { allowed: true, remaining: limit.max - entry.count };
    } catch {
      // KV failure → fall through to in-memory
    }
  }

  // ── In-memory fallback ───────────────────────────────────────────
  const entry = memStore.get(key);
  if (!entry || now > entry.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + limit.windowSec * 1000 });
    return { allowed: true, remaining: limit.max - 1 };
  }
  entry.count++;
  if (entry.count > limit.max) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { allowed: true, remaining: limit.max - entry.count };
}

// ── Classify request tier ────────────────────────────────────────────────
function classifyRequest(pathname, method) {
  if (pathname.startsWith("/functions/v1/")) {
    if (pathname.includes("wallet-auth") || pathname.includes("check-location")) return "auth";
    if (pathname.includes("api-trade")) return "write";
    if (pathname.includes("api-profile")) return "write";
    if (pathname.includes("api-waitlist")) return "write";
    if (pathname.includes("get-sumsub-token")) return "auth";
    return "edge";
  }
  if (pathname.startsWith("/auth/")) return "auth";
  if (method === "POST" || method === "PATCH" || method === "DELETE" || method === "PUT") return "write";
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
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const method = request.method;
    const kv = env.CACHE || null; // KV binding (null if not configured)

    // ── CORS ───────────────────────────────────────────────────────────
    const allowedOrigins = (env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim());
    const isAllowedOrigin = allowedOrigins.includes(origin) || origin.includes("localhost");

    const corsHeaders = {
      "Access-Control-Allow-Origin": isAllowedOrigin ? origin : allowedOrigins[0] || "",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, prefer, x-request-id",
      "Access-Control-Max-Age": "86400",
      "Access-Control-Expose-Headers": "x-ratelimit-remaining, x-ratelimit-reset, x-cache",
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

    // ── Rate limiting (KV-backed with in-memory fallback) ──────────────
    const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";
    const tier = classifyRequest(url.pathname, method);
    const rateLimitKey = `${clientIP}:${tier}`;
    const rl = await checkRateLimit(rateLimitKey, tier, kv);

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
    const forwardHeaders = ["authorization", "content-type", "prefer", "x-client-info", "accept"];
    for (const h of forwardHeaders) {
      const val = request.headers.get(h);
      if (val) proxyHeaders.set(h, val);
    }

    proxyHeaders.set("apikey", env.SUPABASE_ANON_KEY || "");

    // Edge functions always need Authorization
    if (url.pathname.startsWith("/functions/v1/")) {
      if (!proxyHeaders.has("authorization")) {
        proxyHeaders.set("authorization", `Bearer ${env.SUPABASE_ANON_KEY}`);
      }
    }

    // ── KV Cache: check for cached public data ─────────────────────────
    const cacheTtl = parseInt(env.CACHE_TTL || "30", 10);
    const cacheable = isCacheableRequest(url.pathname, method) && cacheTtl > 0;

    if (cacheable && kv) {
      try {
        const cacheKey = `data:${url.pathname}${url.search}`;
        const cached = await kv.get(cacheKey);
        if (cached) {
          return new Response(cached, {
            status: 200,
            headers: {
              ...corsHeaders,
              ...SECURITY_HEADERS,
              "Content-Type": "application/json",
              "X-Cache": "HIT",
              "X-RateLimit-Remaining": String(rl.remaining),
            },
          });
        }
      } catch {
        // KV read failure → just fetch from Supabase
      }
    }

    // ── Proxy the request ──────────────────────────────────────────────
    let body = null;
    if (method !== "GET" && method !== "HEAD") {
      body = await request.text();

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

    for (const [k, v] of Object.entries(corsHeaders)) responseHeaders.set(k, v);
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) responseHeaders.set(k, v);
    responseHeaders.set("X-RateLimit-Remaining", String(rl.remaining));
    responseHeaders.set("X-Cache", "MISS");

    // Remove Supabase's own CORS to avoid duplicates, then re-set ours
    responseHeaders.delete("access-control-allow-origin");
    for (const [k, v] of Object.entries(corsHeaders)) responseHeaders.set(k, v);

    // ── KV Cache: store cacheable responses ────────────────────────────
    if (cacheable && kv && proxyResponse.ok) {
      const responseBody = await proxyResponse.text();

      // Fire-and-forget KV write
      const cacheKey = `data:${url.pathname}${url.search}`;
      ctx.waitUntil(kv.put(cacheKey, responseBody, { expirationTtl: cacheTtl }));

      return new Response(responseBody, {
        status: proxyResponse.status,
        headers: responseHeaders,
      });
    }

    return new Response(proxyResponse.body, {
      status: proxyResponse.status,
      headers: responseHeaders,
    });
  },
};
