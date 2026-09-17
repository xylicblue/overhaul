import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
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
