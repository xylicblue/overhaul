import React, { useCallback, useEffect, useState } from "react";
import { ShieldAlert, ShieldCheck, LockKeyhole, X, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { getMfaStatus, enrolmentRequired } from "../services/mfa";
import MfaChallenge from "./MfaChallenge";
import MfaEnroll from "./MfaEnroll";
import logo from "../assets/ByteStrikeLogoFinal.png";

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
      <main className="min-h-screen bg-[radial-gradient(circle_at_50%_-20%,rgba(71,102,255,0.15),transparent_34rem)] bg-[#070708] text-ink">
        <header className="flex h-16 items-center justify-between border-b border-white/[0.07] bg-[#070708]/80 px-[30px] backdrop-blur-xl max-sm:px-[17px]">
          <Link to="/" className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#6377ed]/50" aria-label="Return to ByteStrike home">
            <img src={logo} alt="ByteStrike" className="h-[31px] w-auto" />
          </Link>
          <div className="flex items-center gap-2 text-xs font-semibold text-ink-muted">
            <ShieldCheck size={15} />
            <span className="max-sm:hidden">Secure account setup</span>
          </div>
        </header>

        <div className="mx-auto grid w-[min(1060px,calc(100%-40px))] grid-cols-[270px_minmax(0,1fr)] items-start gap-16 py-14 max-md:w-[min(680px,calc(100%-28px))] max-md:grid-cols-1 max-md:gap-7 max-md:py-8">
          <aside className="pt-5 max-md:pt-0">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#7c91ff]">Account security</p>
            <h1 className="mb-3 text-2xl font-semibold tracking-[-0.035em] text-[#f5f5f7]">Protect your account</h1>
            <p className="text-[13px] leading-6 text-[#8d8d96]">
              Set up two-factor authentication before continuing to your entity application.
            </p>

            <div className="mt-8 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
              <div className="flex items-start gap-2.5">
                <LockKeyhole size={16} className="mt-0.5 shrink-0 text-[#70d7a9]" />
                <p className="text-[11px] leading-[1.55] text-[#777780]">
                  Your authenticator adds a second layer of protection to sensitive account actions.
                </p>
              </div>
            </div>
          </aside>

          <section className="rounded-[22px] border border-white/[0.085] bg-[#131316]/90 p-9 shadow-[0_24px_80px_rgba(0,0,0,0.28)] max-sm:rounded-[17px] max-sm:p-[22px]">
            <MfaEnroll onComplete={evaluate} />
          </section>
        </div>
      </main>
    );
  }

  return (
    <>
      {state.phase === "nudge" && !dismissed && (
        <div className="bg-warn/10 border-b border-warn/25 px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[12px] text-warn min-w-0">
            <ShieldAlert size={15} className="shrink-0" />
            <span className="truncate">
              Two-factor authentication will soon be required to open or close positions. Enable it now to keep trading.
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              to="/settings?tab=security"
              className="inline-flex items-center gap-1 pl-3 pr-2 py-1.5 rounded-lg bg-warn/20 hover:bg-warn/30 text-warn text-[12px] font-semibold transition-colors"
            >
              Enable 2FA
              <ChevronRight size={13} />
            </Link>
            <button onClick={() => setDismissed(true)} className="text-warn/70 hover:text-warn p-1" aria-label="Dismiss">
              <X size={15} />
            </button>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
