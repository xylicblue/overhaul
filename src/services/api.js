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
const API_BASE = import.meta.env.VITE_API_GATEWAY_URL || import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ── Helper: get current session token ────────────────────────────────────
async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

// ── Helper: call edge function through gateway ───────────────────────────
async function callEdgeFunction(functionName, payload, options = {}) {
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
 * Record a trade (open position) through the api-trade edge function.
 * Validates tx_hash on-chain before inserting.
 */
export async function recordTrade({ userAddress, market, side, size, price, notional, txHash, pnl, fundingEarned, feesPaid }, vammData = null) {
  return callEdgeFunction("api-trade", {
    action: "record-trade",
    tradeData: {
      user_address: userAddress.toLowerCase(),
      market,
      side,
      size,
      price,
      notional,
      tx_hash: txHash,
      ...(pnl !== undefined && { pnl }),
      ...(fundingEarned !== undefined && { funding_earned: fundingEarned }),
      ...(feesPaid !== undefined && { fees_paid: feesPaid }),
    },
    vammData,
  }, { auth: false }); // No Supabase auth needed — validates tx on-chain
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
 * Update wallet address on the profile.
 * Pass null to disconnect.
 */
export async function updateWallet(walletAddress) {
  return callEdgeFunction("api-profile", { action: "update-wallet", wallet_address: walletAddress });
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