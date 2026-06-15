// ─────────────────────────────────────────────────────────────────────────────
// First-trade Privacy Disclosure acceptance.
//
// Records, per account, that the user has read and accepted the Privacy Policy
// before placing their first ever trade. Primary store is the `profiles` table
// (column `trading_privacy_accepted_at timestamptz`); if that column does not
// exist yet (e.g. migration not run), it transparently falls back to
// localStorage so the gate still works and the app never breaks.
//
//   Migration to run in Supabase:
//     alter table public.profiles
//       add column if not exists trading_privacy_accepted_at timestamptz;
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from "../creatclient";

const LS_PREFIX = "bs_trading_privacy_accepted";

async function currentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * Returns true if the signed-in user has already accepted the trade-time
 * Privacy Disclosure. Falls back to localStorage if the DB column is absent.
 */
export async function hasAcceptedTradingPrivacy() {
  const userId = await currentUserId();
  if (!userId) return false;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("trading_privacy_accepted_at")
      .eq("id", userId)
      .single();
    if (error) throw error;
    return !!data?.trading_privacy_accepted_at;
  } catch {
    // Column may not exist yet — fall back to a per-user local flag.
    try {
      return localStorage.getItem(`${LS_PREFIX}:${userId}`) === "true";
    } catch {
      return false;
    }
  }
}

/**
 * Persists acceptance for the signed-in user (DB first, localStorage fallback).
 * Returns the ISO timestamp recorded.
 */
export async function acceptTradingPrivacy() {
  const userId = await currentUserId();
  if (!userId) return null;

  const acceptedAt = new Date().toISOString();
  try {
    const { error } = await supabase
      .from("profiles")
      .update({ trading_privacy_accepted_at: acceptedAt })
      .eq("id", userId);
    if (error) throw error;
  } catch {
    // Column may not exist yet — record locally so the user isn't re-prompted.
    try {
      localStorage.setItem(`${LS_PREFIX}:${userId}`, "true");
    } catch {
      /* ignore storage failures */
    }
  }
  return acceptedAt;
}
