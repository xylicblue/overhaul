/**
 * ByteStrike API Gateway — Cloudflare Worker
 *
 * Proxies requests to Supabase with:
 * - Rate limiting (KV-backed, globally distributed)
 * - CORS enforcement
 * - Security headers
 * - KV response caching for public market data
 * - Request validation & sanitization
 * - Structured request logging to Axiom
 */

// ── Rate-limit config ────────────────────────────────────────────────────
const RATE_LIMITS = {
  auth:  { max: 20,  windowSec: 60 },
  write: { max: 60,  windowSec: 60 },
  read:  { max: 200, windowSec: 60 },
  edge:  { max: 30,  windowSec: 60 },
};

const memStore = new Map();

async function checkRateLimit(key, tier, kv) {
  const limit = RATE_LIMITS[tier] || RATE_LIMITS.read;
  const now = Date.now();

  if (kv) {
    try {
      const kvKey = `rl:${key}`;
      const raw = await kv.get(kvKey, "json");
      const entry = raw || { count: 0, resetAt: now + limit.windowSec * 1000 };

      if (now > entry.resetAt) {
        entry.count = 1;
        entry.resetAt = now + limit.windowSec * 1000;
      } else {
        entry.count++;
      }

      if (entry.count > limit.max) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        await kv.put(kvKey, JSON.stringify(entry), { expirationTtl: limit.windowSec + 5 });
        return { allowed: false, remaining: 0, retryAfter };
      }

      await kv.put(kvKey, JSON.stringify(entry), { expirationTtl: limit.windowSec + 5 });
      return { allowed: true, remaining: limit.max - entry.count };
    } catch {
      // KV failure → fall through to in-memory
    }
  }

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

function classifyRequest(pathname, method) {
  if (pathname.startsWith("/functions/v1/")) {
    if (pathname.includes("wallet-auth") || pathname.includes("check-location")) return "auth";
    if (pathname.includes("api-trade"))    return "write";
    if (pathname.includes("api-close"))    return "write";
    if (pathname.includes("api-profile"))  return "write";
    if (pathname.includes("api-waitlist")) return "write";
    if (pathname.includes("get-sumsub-token")) return "auth";
    return "edge";
  }
  if (pathname.startsWith("/auth/")) return "auth";
  if (method === "POST" || method === "PATCH" || method === "DELETE" || method === "PUT") return "write";
  return "read";
}

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

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

// ── Axiom log shipping ────────────────────────────────────────────────────
function shipLog(env, ctx, fields) {
  if (!env.AXIOM_TOKEN || !env.AXIOM_DATASET) return;
  ctx.waitUntil(
    fetch(`https://api.axiom.co/v1/datasets/${env.AXIOM_DATASET}/ingest`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.AXIOM_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ _time: new Date().toISOString(), service: "cf-gateway", ...fields }]),
    }).catch(() => {}) // never let logging break the gateway
  );
}

// ── Core request handler ──────────────────────────────────────────────────
async function handleRequest(request, env, ctx, requestId) {
  const url    = new URL(request.url);
  const origin = request.headers.get("Origin") || "";
  const method = request.method;
  const kv     = env.CACHE || null;

  // L-01 remediation: exact allow-list match only. The old fallback
  // `origin.includes("localhost")` was a substring test that accepted
  // hostile origins such as https://localhost.evil.com. Local development
  // is now supported by listing explicit http://localhost:PORT entries in
  // the ALLOWED_ORIGINS environment variable.
  const allowedOrigins  = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  const isAllowedOrigin = allowedOrigins.includes(origin);

  const corsHeaders = {
    "Access-Control-Allow-Origin":   isAllowedOrigin ? origin : allowedOrigins[0] || "",
    "Access-Control-Allow-Methods":  "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":  "authorization, x-client-info, apikey, content-type, content-profile, prefer, x-request-id, x-supabase-api-version, accept-profile, accept-language",
    "Access-Control-Max-Age":        "86400",
    "Access-Control-Expose-Headers": "x-ratelimit-remaining, x-ratelimit-reset, x-cache, x-request-id",
  };

  // Health check — no auth, no logging
  if (url.pathname === "/health") {
    return new Response(JSON.stringify({ status: "ok", ts: Date.now() }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Preflight
  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Block disallowed origins. Same tightening as above: no substring match on
  // the request hostname; only the exact allow-list is trusted.
  if (!isAllowedOrigin) {
    return new Response(JSON.stringify({ error: "Forbidden origin" }), {
      status: 403,
      headers: { ...corsHeaders, ...SECURITY_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Faucet proxy.
  // L-02 remediation: per-IP rate limit is applied at the gateway on this
  // route in its own bucket, and the upstream URL is no longer echoed in
  // error responses. The upstream base is sourced from environment.
  // FCT-03 remediation (gateway side): forward the two allow-listed
  // sub-paths only ("/challenge" and "/request"). The gateway must not
  // expose the faucet's admin endpoints ("/status/admin", "/requests",
  // "/requests/:address") to the internet.
  if (url.pathname.startsWith("/faucet")) {
    if (method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Extract and validate the sub-path.
    const suffix = url.pathname.slice("/faucet".length) || "/request";
    const allowedSuffixes = new Set(["/challenge", "/request"]);
    if (!allowedSuffixes.has(suffix)) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";
    const faucetLimit = await checkRateLimit(`faucet:${clientIp}`, "auth", kv);
    if (!faucetLimit.allowed) {
      return new Response(JSON.stringify({ error: "Too many faucet requests" }), {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": String(faucetLimit.retryAfter),
        },
      });
    }
    const upstreamBase = env.FAUCET_UPSTREAM_URL;
    if (!upstreamBase) {
      return new Response(JSON.stringify({ error: "Faucet not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Strip trailing slash on the base so `/challenge` and `/request`
    // concatenate cleanly. If the operator has configured
    // FAUCET_UPSTREAM_URL as a full URL to /request (the older shape),
    // fall back to POSTing the body to it for /request only.
    const base = upstreamBase.replace(/\/$/, "");
    const upstreamUrl = /\/(request|challenge)$/.test(base)
      ? (suffix === "/request" ? base : base.replace(/\/request$/, "/challenge"))
      : `${base}${suffix}`;
    try {
      const body = await request.text();
      const upstreamRes = await fetch(upstreamUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const data = await upstreamRes.text();
      return new Response(data, {
        status: upstreamRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (_err) {
      return new Response(JSON.stringify({ error: "Faucet unavailable" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Block non-Supabase paths
  const isSupabasePath =
    url.pathname.startsWith("/rest/v1/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/functions/v1/") ||
    url.pathname.startsWith("/storage/") ||
    url.pathname.startsWith("/realtime/v1/");
  if (!isSupabasePath) {
    return new Response(JSON.stringify({ error: "Not found", path: url.pathname }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // WebSocket upgrade — proxy directly to Supabase
  // Workers support WebSocket proxying via fetch; the runtime bridges the connection automatically
  if (request.headers.get("upgrade") === "websocket") {
    const wsUrl = new URL(url.pathname + url.search, supabaseUrl);
    return fetch(wsUrl.toString(), { headers: request.headers, method: request.method });
  }

  // Rate limiting
  const clientIP     = request.headers.get("CF-Connecting-IP") || "unknown";
  const tier         = classifyRequest(url.pathname, method);
  const rateLimitKey = `${clientIP}:${tier}`;
  const rl           = await checkRateLimit(rateLimitKey, tier, kv);

  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
      status: 429,
      headers: {
        ...corsHeaders,
        ...SECURITY_HEADERS,
        "Content-Type": "application/json",
        "Retry-After":          String(rl.retryAfter || 60),
        "X-RateLimit-Remaining": "0",
        "X-Request-ID":          requestId,
      },
    });
  }

  const supabaseUrl = env.SUPABASE_URL;
  if (!supabaseUrl) {
    return new Response(JSON.stringify({ error: "Gateway misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, ...SECURITY_HEADERS, "Content-Type": "application/json" },
    });
  }

  const proxyUrl = new URL(url.pathname + url.search, supabaseUrl);

  const proxyHeaders = new Headers();
  for (const h of ["authorization", "content-type", "content-profile", "prefer", "x-client-info", "accept", "x-supabase-api-version", "accept-profile", "accept-language"]) {
    const val = request.headers.get(h);
    if (val) proxyHeaders.set(h, val);
  }
  proxyHeaders.set("apikey", env.SUPABASE_ANON_KEY || "");
  proxyHeaders.set("x-request-id", requestId);

  if (url.pathname.startsWith("/functions/v1/") && !proxyHeaders.has("authorization")) {
    proxyHeaders.set("authorization", `Bearer ${env.SUPABASE_ANON_KEY}`);
  }

  // KV cache check
  // CACHEABLE_TABLES are all public market data — safe to cache for everyone including
  // authenticated users, since RLS doesn't change the response for these tables.
  // Non-cacheable authenticated requests (profiles, trades etc) are never in CACHEABLE_TABLES.
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
            "Content-Type":          "application/json",
            "X-Cache":               "HIT",
            "X-RateLimit-Remaining": String(rl.remaining),
            "X-Request-ID":          requestId,
          },
        });
      }
    } catch {
      // KV read failure → fetch from Supabase
    }
  }

  // Body size guard
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

  const proxyResponse = await fetch(proxyUrl.toString(), { method, headers: proxyHeaders, body });

  const responseHeaders = new Headers(proxyResponse.headers);
  for (const [k, v] of Object.entries(corsHeaders))     responseHeaders.set(k, v);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) responseHeaders.set(k, v);
  responseHeaders.set("X-RateLimit-Remaining", String(rl.remaining));
  responseHeaders.set("X-Cache",      "MISS");
  responseHeaders.set("X-Request-ID", requestId);
  responseHeaders.delete("access-control-allow-origin");
  for (const [k, v] of Object.entries(corsHeaders)) responseHeaders.set(k, v);

  if (cacheable && kv && proxyResponse.ok) {
    const responseBody = await proxyResponse.text();
    const cacheKey = `data:${url.pathname}${url.search}`;
    ctx.waitUntil(kv.put(cacheKey, responseBody, { expirationTtl: cacheTtl }));
    return new Response(responseBody, { status: proxyResponse.status, headers: responseHeaders });
  }

  return new Response(proxyResponse.body, { status: proxyResponse.status, headers: responseHeaders });
}

// ── Entry point ───────────────────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    const startTime  = Date.now();
    const url        = new URL(request.url);
    const clientIP   = request.headers.get("CF-Connecting-IP") || "unknown";
    const requestId  = request.headers.get("x-request-id") || crypto.randomUUID();

    const response = await handleRequest(request, env, ctx, requestId);

    // Skip logging for health checks and preflight — noise with no signal
    if (url.pathname !== "/health" && request.method !== "OPTIONS") {
      shipLog(env, ctx, {
        requestId,
        method:      request.method,
        path:        url.pathname,
        status:      response.status,
        latencyMs:   Date.now() - startTime,
        tier:        classifyRequest(url.pathname, request.method),
        cached:      response.headers.get("X-Cache") === "HIT",
        rateLimited: response.status === 429,
        ip:          clientIP,
        country:     request.cf?.country || null,
      });
    }

    return response;
  },
};
