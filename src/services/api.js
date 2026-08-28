/**
 * API Service Layer — Centralized API calls through the gateway.
 *
 * In development, calls go directly to Supabase.
 * In production, calls go through the Cloudflare Worker proxy.
 *
 * Edge functions (api-trade, api-profile) are always called via Supabase
 * functions URL (proxied through the gateway in production).
 */

import { supabase } from "../creatclient";

// Base URL: use proxy in production, direct Supabase in dev
function normalizeSupabaseUrl(value) {
  const url = value?.trim().replace(/^['"]|['"]$/g, "");
  if (!url || /^https?:\/\//i.test(url)) return url;
  if (/^[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) return `https://${url.replace(/\/$/, "")}`;
  return url;
}

const SUPABASE_URL = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL);
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_PUBLIC_KEY;
const API_BASE = import.meta.env.VITE_API_GATEWAY_URL || SUPABASE_URL;
const MARKET_STATS_API_BASE = import.meta.env.VITE_MARKET_STATS_API_URL;

// ── Helper: get current session token ────────────────────────────────────
async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

// ── Helper: call edge function through gateway ───────────────────────────
export async function callEdgeFunction(functionName, payload, options = {}) {
  const url = `${API_BASE}/functions/v1/${functionName}`;
  const headers = {
    "Content-Type": "application/json",
    apikey: ANON_KEY,
  };

  // Add auth header if we have a session
  if (options.auth !== false) {
    const token = await getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Edge function returned non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    throw new Error(data.error || `Edge function error: ${res.status}`);
  }

  return data;
}

// ═══════════════════════════════════════════════════════════════════════════
// TRADE API — Routes through api-trade edge function
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Record pending trade metadata through the api-trade edge function.
 * Canonical PnL, funding, and fees are filled by the event indexer.
 */
export async function recordTrade({ userAddress, market, side, size, price, notional, txHash }, vammData = null) {
  const tradeData = {
    user_address: userAddress.toLowerCase(),
    market,
    side,
    size,
    price,
    notional,
    tx_hash: txHash,
  };
  return callEdgeFunction("api-trade", {
    action: "record-trade",
    tradeData,
    vammData,
  }, { auth: false });
}

// ═══════════════════════════════════════════════════════════════════════════
// CLOSE API — Calls api-close edge function directly on Supabase,
// bypassing the Cloudflare Worker proxy.
// ═══════════════════════════════════════════════════════════════════════════

export async function recordClose({
  userAddress, market, side, size,
  entryPrice, closePrice, notional,
  pnl, fundingEarned, feesPaid, txHash,
}) {
  const url = `${SUPABASE_URL}/functions/v1/api-close`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": ANON_KEY,
      "Authorization": `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({
      userAddress,
      market,
      side,
      size,
      entryPrice,
      closePrice,
      notional,
      pnl,
      fundingEarned,
      feesPaid,
      txHash,
    }),
  });

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(data.error || `api-close error: ${res.status}`);
  return data;
}

// ═══════════════════════════════════════════════════════════════════════════
// PROFILE API — Routes through api-profile edge function
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the current user's profile.
 */
export async function getProfile() {
  return callEdgeFunction("api-profile", { action: "get-profile" });
}

/**
 * Update profile fields (username, display_name, avatar_url, bio).
 */
export async function updateProfile(updates) {
  return callEdgeFunction("api-profile", { action: "update-profile", updates });
}

/**
 * Set username for new users (onboarding).
 */
export async function setUsername(username) {
  return callEdgeFunction("api-profile", { action: "set-username", username });
}

/**
 * F-11: request a server-issued signing challenge for linking a wallet.
 * Returns { nonce, message, expires_at } — the caller signs `message` with
 * the wallet and passes both `message`'s signature and the address to
 * updateWallet().
 */
export async function getWalletLinkNonce(walletAddress, chain = "ethereum") {
  return callEdgeFunction("api-profile", {
    action: "get-wallet-link-nonce",
    wallet_address: walletAddress,
    chain,
  });
}

/**
 * Update the wallet address on the profile.
 * - To LINK: pass ({ walletAddress, signature, chain }). The signature must
 *   be produced by signing the message returned from getWalletLinkNonce().
 * - To DISCONNECT: pass ({ walletAddress: null }); signature not required.
 */
export async function updateWallet(walletAddress, opts = {}) {
  const payload = { action: "update-wallet", wallet_address: walletAddress };
  if (walletAddress !== null) {
    payload.signature = opts.signature;
    payload.chain = opts.chain || "ethereum";
  }
  return callEdgeFunction("api-profile", payload);
}

/**
 * Check if a username is available.
 */
export async function checkUsername(username) {
  return callEdgeFunction("api-profile", { action: "check-username", username });
}

// ═══════════════════════════════════════════════════════════════════════════
// WAITLIST API — Routes through api-waitlist edge function
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Submit interest form (waitlist signup).
 * Validates email and sanitizes input server-side.
 */
export async function submitInterest({ name, email, role, interest }) {
  return callEdgeFunction("api-waitlist", { name, email, role, interest }, { auth: false });
}

// ═══════════════════════════════════════════════════════════════════════════
// GEO-BLOCKING — Routes check-location edge function through gateway
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if the user's location is allowed.
 */
export async function checkLocation() {
  return callEdgeFunction("check-location", {}, { auth: false });
}

// ═══════════════════════════════════════════════════════════════════════════
// KYC — Routes get-sumsub-token edge function through gateway
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get a Sumsub verification token for the current user.
 */
export async function getSumsubToken() {
  return callEdgeFunction("get-sumsub-token", {});
}

// ═══════════════════════════════════════════════════════════════════════════
// MARKET STATS API — Prefer Railway indexer, fallback to direct Supabase
// ═══════════════════════════════════════════════════════════════════════════

export async function getMarketStats24h() {
  // Primary source: derive 24h stats live from canonical_pnl_events, which the
  // deployed indexer keeps current (same source the admin dashboard aggregates).
  // The legacy market_stats_24h table is no longer being written — it reads back
  // all zeros, which is why 24h volume/change showed $0.00 / +0.00% everywhere.
  try {
    const { data, error } = await supabase.rpc("get_market_stats_24h");
    if (error) throw error;
    if (Array.isArray(data) && data.length > 0) return data;
  } catch (rpcError) {
    console.warn("get_market_stats_24h RPC unavailable, falling back:", rpcError?.message);
  }

  // ── Fallbacks (kept so nothing breaks if the migration isn't applied yet) ──
  if (MARKET_STATS_API_BASE) {
    try {
      const res = await fetch(`${MARKET_STATS_API_BASE.replace(/\/$/, "")}/api/markets/stats`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        throw new Error(`Market stats API error: ${res.status}`);
      }
      const payload = await res.json();
      return payload.data || [];
    } catch (error) {
      console.warn("Market stats API unavailable, falling back to Supabase:", error);
    }
  }

  const { data, error } = await supabase.from("market_stats_24h").select("*");
  if (error) throw error;
  return data || [];
}

export async function getMarketStat24h(marketId) {
  const stats = await getMarketStats24h();
  const needle = marketId?.toLowerCase();
  return stats.find((stat) => stat.market_id?.toLowerCase() === needle) || null;
}
