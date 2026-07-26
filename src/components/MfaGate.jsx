import React, { useCallback, useEffect, useState } from "react";
import { ShieldAlert, X } from "lucide-react";
import { getMfaStatus, enrolmentRequired } from "../services/mfa";
import MfaChallenge from "./MfaChallenge";
import MfaEnroll from "./MfaEnroll";

// Central MFA enforcement. Wrap the authenticated app surface with this.
//
//   - no session                 -> render children (guests browse; pages prompt
//                                    their own login where needed)
//   - factor exists, aal1        -> block on the login challenge until aal2
//   - no factor, required now     -> block on enrolment
//   - no factor, within grace     -> render children with a dismissible nudge
//   - enrolled and aal2 / MFA off -> render children
//
// Fail-open: if the status check throws (e.g. MFA not yet enabled in the Supabase
// project), we render children. Enforcement activates once MFA is enabled and the
// migration applied, so rolling this out cannot brick the app beforehand.
export default function MfaGate({ session, children }) {
  const [state, setState] = useState({ phase: "checking" }); // checking | ok | challenge | enroll | nudge | error
  const [dismissed, setDismissed] = useState(false);

  const userId = session?.user?.id;
  const createdAt = session?.user?.created_at;

  const evaluate = useCallback(async () => {
    if (!userId) { setState({ phase: "ok" }); return; }
    try {
      const status = await getMfaStatus();
      if (status.needsChallenge) { setState({ phase: "challenge", factorId: status.factorId }); return; }
      if (status.enrolled) { setState({ phase: "ok" }); return; }
      // No factor. Required now, or still within grace?
      if (enrolmentRequired(createdAt)) setState({ phase: "enroll" });
      else setState({ phase: "nudge" });
    } catch (e) {
      // MFA likely not enabled yet, or a transient error. Do not block the app.
      console.warn("[MfaGate] status check failed, allowing through:", e?.message);
      setState({ phase: "ok" });
    }
  }, [userId, createdAt]);

  useEffect(() => { evaluate(); }, [evaluate]);

  if (state.phase === "checking") {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-line border-t-blue-500 animate-spin" />
      </div>
    );
  }

  if (state.phase === "challenge") {
    return <MfaChallenge factorId={state.factorId} onVerified={evaluate} />;
  }

  if (state.phase === "enroll") {
    return (
      <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center px-4 gap-4">
        <p className="text-[13px] text-ink-muted text-center max-w-md">
          Two-factor authentication is required to continue. Set it up now to protect your account.
        </p>
        <MfaEnroll onComplete={evaluate} />
      </div>
    );
  }

  return (
    <>
      {state.phase === "nudge" && !dismissed && (
        <div className="bg-warn/10 border-b border-warn/25 px-4 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[12px] text-warn">
            <ShieldAlert size={15} className="shrink-0" />
            Two-factor authentication will soon be required. Enable it in Settings to secure your account.
          </div>
          <button onClick={() => setDismissed(true)} className="text-warn/80 hover:text-warn shrink-0" aria-label="Dismiss">
            <X size={15} />
          </button>
        </div>
      )}
      {children}
    </>
  );
}
