import React, { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "../creatclient";
import { getEntityAccessState } from "../services/entityOnboarding";

// Staged entity-only gate for customer trading surfaces. It requires a complete
// entity submission but does not pretend that compliance approval, scoring or
// on-chain allowlisting exists in this phase. Those controls can later narrow
// ACCESSIBLE_STATUSES to "approved" without redesigning the onboarding flow.
export default function EntityTradingGate({ children }) {
  const location = useLocation();
  const [state, setState] = useState({ phase: "checking" });

  useEffect(() => {
    let active = true;
    const evaluate = async (session) => {
      if (!active) return;
      if (!session?.user) {
        setState({ phase: "guest" });
        return;
      }
      try {
        const access = await getEntityAccessState(session.user.id);
        if (!active) return;
        // Narrow rollout exception: a frontend-first deployment can coexist
        // briefly with a genuinely missing table. Once the schema exists,
        // inability to verify onboarding fails closed instead of permitting a
        // trade under an unknown compliance state.
        if (!access.schemaAvailable && !access.isAdmin) {
          console.warn("[EntityTradingGate] onboarding schema is not available yet");
          setState({ phase: "guest" });
        } else if (access.membershipFound && !access.mfaComplete) {
          setState({ phase: "mfa" });
        } else {
          setState({ phase: access.onboardingComplete ? "allowed" : "onboarding" });
        }
      } catch (error) {
        if (!active) return;
        console.warn("[EntityTradingGate] onboarding check unavailable:", error.message);
        setState({ phase: "unavailable" });
      }
    };
    supabase.auth.getSession().then(({ data }) => evaluate(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => evaluate(session));
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (state.phase === "checking") {
    return (
      <div className="min-h-[60vh] grid place-items-center text-indigo-400">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }
  if (state.phase === "onboarding") {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/onboarding?next=${encodeURIComponent(next)}`} replace />;
  }
  if (state.phase === "mfa") {
    return (
      <div className="min-h-[60vh] grid place-items-center px-5">
        <div className="max-w-md rounded-[20px] border border-white/10 bg-white/[0.035] p-7 text-center shadow-[0_24px_80px_rgba(0,0,0,0.3)]">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300">
            <ShieldCheck size={20} />
          </span>
          <h1 className="mt-5 text-[16px] font-semibold tracking-[-0.02em] text-white">Secure your approved account</h1>
          <p className="mt-2 text-[12px] leading-5 text-zinc-500">
            Your entity membership has been recognized. Enable multi-factor authentication to access trading and portfolio features.
          </p>
          <Link to="/settings?tab=security" className="mt-5 inline-flex h-10 items-center rounded-xl bg-white px-4 text-[12px] font-semibold text-black hover:bg-white/90">
            Set up multi-factor authentication
          </Link>
        </div>
      </div>
    );
  }
  if (state.phase === "unavailable") {
    return (
      <div className="min-h-[60vh] grid place-items-center px-5">
        <div className="max-w-md rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <h1 className="text-sm font-semibold text-white">Unable to verify entity status</h1>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Trading is temporarily unavailable because your onboarding status could not be verified. Please try again shortly.
          </p>
          <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black">
            Try again
          </button>
        </div>
      </div>
    );
  }
  return children;
}
