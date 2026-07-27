import React, { useCallback, useEffect, useState } from "react";
import { Ban } from "lucide-react";
import { supabase } from "../creatclient";

// Account-suspension gate. If the signed-in user's profile is frozen, block the
// app with a suspension screen and end their session. Wrap the authenticated
// surface with this (outside MfaGate).
//
// Fail-open: if the frozen-status read fails (transient, or the column not yet
// migrated), render children. Enforcement activates once the migration is applied;
// rolling it out cannot brick the app. A normal (unfrozen) account is unaffected.
export default function AccountGate({ session, children }) {
  const [state, setState] = useState({ phase: "checking" }); // checking | ok | frozen
  const userId = session?.user?.id;

  const evaluate = useCallback(async () => {
    if (!userId) { setState({ phase: "ok" }); return; }
    try {
      const { data, error } = await supabase
        .from("profiles").select("frozen, frozen_reason").eq("id", userId).single();
      if (error) throw error;
      if (data?.frozen === true) {
        setState({ phase: "frozen", reason: data.frozen_reason || null });
        // End the session so the account cannot continue to act.
        await supabase.auth.signOut().catch(() => {});
      } else {
        setState({ phase: "ok" });
      }
    } catch (e) {
      console.warn("[AccountGate] frozen check failed, allowing through:", e?.message);
      setState({ phase: "ok" });
    }
  }, [userId]);

  useEffect(() => { evaluate(); }, [evaluate]);

  if (state.phase === "checking") {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-line border-t-blue-500 animate-spin" />
      </div>
    );
  }

  if (state.phase === "frozen") {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center px-4">
        <div className="bg-surface-1 border border-line-subtle rounded-xl p-6 max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-full bg-down/10 border border-down/25 flex items-center justify-center mx-auto mb-3">
            <Ban size={20} className="text-down" />
          </div>
          <h1 className="text-[16px] font-semibold text-ink mb-1">Account suspended</h1>
          <p className="text-[12px] text-ink-muted">
            This account has been suspended and cannot trade or access the platform.
            {state.reason ? ` Reason: ${state.reason}.` : ""} If you believe this is an error, contact support.
          </p>
        </div>
      </div>
    );
  }

  return children;
}
