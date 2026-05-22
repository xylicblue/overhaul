import { useEffect, useRef } from "react";
import { supabase } from "../creatclient";
import { useAuthModalStore } from "../stores/useAuthModalStore";
import { silentRefresh } from "./useWalletAuth";
import toast from "react-hot-toast";

const WARN_BEFORE_MS    = 5 * 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 1000;

async function getWalletInfo() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const address = user.user_metadata?.wallet_address;
  const chain   = user.user_metadata?.wallet_type || "ethereum";
  if (!address) return null;
  return { address, chain };
}

export function useSessionRefresh() {
  const openLogin      = useAuthModalStore((s) => s.openLogin);
  const warnedRef      = useRef(false);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    // Reset state when a fresh session is installed (after any sign-in)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        warnedRef.current      = false;
        isRefreshingRef.current = false;
        toast.dismiss("session-expiring");
        toast.dismiss("session-expired");
      }
    });

    const attemptSilentRefresh = async (context) => {
      if (isRefreshingRef.current) return;
      isRefreshingRef.current = true;

      const walletInfo = await getWalletInfo();

      if (!walletInfo) {
        // Not a wallet session (email/Google user) — just open the login modal
        isRefreshingRef.current = false;
        if (context === "expired") openLogin();
        return;
      }

      try {
        // Wallet is connected — attempt silent re-sign (triggers wallet popup)
        await silentRefresh(walletInfo.address, walletInfo.chain);
        // onAuthStateChange fires SIGNED_IN, which resets warnedRef and isRefreshingRef
      } catch {
        // Wallet locked, disconnected, or user rejected — fall back to manual login
        isRefreshingRef.current = false;
        warnedRef.current       = true;
        showFallbackToast(context, openLogin);
      }
    };

    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const msLeft = session.expires_at * 1000 - Date.now();

      // Already expired — try silent refresh immediately
      if (msLeft <= 0 && !warnedRef.current && !isRefreshingRef.current) {
        warnedRef.current = true;
        await attemptSilentRefresh("expired");
        return;
      }

      // About to expire — try silent refresh proactively
      if (msLeft > 0 && msLeft <= WARN_BEFORE_MS && !warnedRef.current && !isRefreshingRef.current) {
        warnedRef.current = true;
        await attemptSilentRefresh("expiring");
      }
    };

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, [openLogin]);
}

// ── Fallback toast (only shown when silent refresh fails) ────────────────────

function showFallbackToast(context, openLogin) {
  if (context === "expired") {
    toast.error(
      (t) => (
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          Session expired.
          <button
            onClick={() => { toast.dismiss(t.id); openLogin(); }}
            className="underline cursor-pointer bg-transparent border-none text-inherit text-sm font-semibold"
          >
            Sign in again
          </button>
        </span>
      ),
      { id: "session-expired", duration: Infinity }
    );
  } else {
    toast(
      (t) => (
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          Session expiring soon.
          <button
            onClick={() => { toast.dismiss(t.id); openLogin(); }}
            className="underline cursor-pointer bg-transparent border-none text-inherit text-sm font-semibold"
          >
            Renew
          </button>
        </span>
      ),
      { id: "session-expiring", duration: 30000 }
    );
  }
}
