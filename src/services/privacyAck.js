// ─────────────────────────────────────────────────────────────────────────────
// First-trade consent acknowledgements.
//
// Records, per account, that the user has accepted BOTH the Market Rules / Risk
// Disclosure and the Privacy Policy before placing their first ever trade.
// Primary store is the `profiles` table; if the columns don't exist yet (e.g.
// migration not run) it transparently falls back to localStorage so the gate
// still works and the app never breaks.
//
//   Migration to run in Supabase:
//     alter table public.profiles
//       add column if not exists trading_privacy_accepted_at timestamptz,
//       add column if not exists trading_risk_accepted_at    timestamptz;
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from "../creatclient";

const LS_PREFIX = "bs_trading_consent"; // per-user local fallback flag

async function currentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * Returns true only if the signed-in user has accepted BOTH the Risk Disclosure
 * and the Privacy Policy. Falls back to localStorage if the DB columns are absent.
 */
export async function hasAcceptedTradingConsent() {
  const userId = await currentUserId();
  if (!userId) return false;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("trading_privacy_accepted_at, trading_risk_accepted_at")
      .eq("id", userId)
      .single();
    if (error) throw error;
    return !!data?.trading_privacy_accepted_at && !!data?.trading_risk_accepted_at;
  } catch {
    // Columns may not exist yet — fall back to a per-user local flag.
    try {
      return localStorage.getItem(`${LS_PREFIX}:${userId}`) === "true";
    } catch {
      return false;
    }
  }
}

/**
 * Persists acceptance of both documents for the signed-in user (DB first,
 * localStorage fallback). Returns the ISO timestamp recorded.
 */
export async function acceptTradingConsent() {
  const userId = await currentUserId();
  if (!userId) return null;

  const acceptedAt = new Date().toISOString();
  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        trading_privacy_accepted_at: acceptedAt,
        trading_risk_accepted_at: acceptedAt,
      })
      .eq("id", userId);
    if (error) throw error;
  } catch {
    // Columns may not exist yet — record locally so the user isn't re-prompted.
    try {
      localStorage.setItem(`${LS_PREFIX}:${userId}`, "true");
    } catch {
      /* ignore storage failures */
    }
  }
  return acceptedAt;
}
