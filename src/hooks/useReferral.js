import { useState, useEffect, useCallback } from "react";
import { supabase } from "../creatclient";

const STORAGE_KEY = "bst_referral_code";

/** Capture ?ref=CODE from the current URL and persist to localStorage */
export function captureReferralFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("ref");
  if (code) {
    localStorage.setItem(STORAGE_KEY, code.toUpperCase());
  }
}

/** Read the stored referral code (set by someone else's link) */
export function getStoredReferralCode() {
  return localStorage.getItem(STORAGE_KEY) || "";
}

/** Clear after it's been consumed */
export function clearStoredReferralCode() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Record a referral on signup.
 * Call this right after supabase.auth.signUp() succeeds.
 * @param {string} referredUserId  — the newly signed-up user's id
 * @param {string} codeUsed       — the referral code they entered
 */
export async function recordReferral(referredUserId, codeUsed) {
  if (!codeUsed) { console.log("[Referral] No code provided, skipping."); return; }
  const code = codeUsed.trim().toUpperCase();
  console.log("[Referral] Recording via RPC — code:", code, "user:", referredUserId);

  const { data, error } = await supabase.rpc("record_referral", {
    p_referred_id: referredUserId,
    p_code:        code,
  });

  if (error) {
    console.error("[Referral] RPC failed:", error.message);
    return;
  }

  console.log("[Referral] RPC result:", data); // 'ok' | 'invalid_code' | 'self_referral'
  if (data === "ok") {
    console.log("[Referral] ✅ Referral recorded!");
    clearStoredReferralCode();
  }
}

/**
 * Mark the current user's referral as wallet_connected.
 * Call this after a successful wallet connection.
 * @param {string} userId
 */
export async function markWalletConnected(userId) {
  if (!userId) return;
  await supabase
    .from("referrals")
    .update({
      status: "wallet_connected",
      wallet_connected_at: new Date().toISOString(),
    })
    .eq("referred_id", userId)
    .eq("status", "signed_up"); // only upgrade if still pending
}

/**
 * useReferralDashboard — for the referral settings panel.
 * Loads the user's own code + their referral history.
 */
export function useReferralDashboard(userId) {
  const [code, setCode]           = useState("");
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading]     = useState(true);

  const fetch = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const [codeRes, referralsRes] = await Promise.all([
      supabase
        .from("referral_codes")
        .select("code")
        .eq("user_id", userId)
        .single(),
      supabase
        .from("referrals")
        .select("id, status, signed_up_at, wallet_connected_at")
        .eq("referrer_id", userId)
        .order("signed_up_at", { ascending: false }),
    ]);

    if (codeRes.data) setCode(codeRes.data.code);
    if (referralsRes.data) setReferrals(referralsRes.data);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch]);

  const referralLink = code
    ? `${window.location.origin}/?ref=${code}`
    : "";

  const stats = {
    total:           referrals.length,
    walletConnected: referrals.filter((r) => r.status !== "signed_up").length,
    rewarded:        referrals.filter((r) => r.status === "rewarded").length,
  };

  return { code, referralLink, referrals, stats, loading };
}
