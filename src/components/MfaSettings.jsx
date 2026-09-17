import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { RefreshCw } from "lucide-react";
import { getMfaStatus, disableMfa, regenerateBackupCodes, backupCodesRemaining } from "../services/mfa";
import MfaEnroll from "./MfaEnroll";

// Self-contained MFA management card for the Settings page: shows current state,
// lets the user enrol, regenerate backup codes, or disable (disable requires an
// aal2 session, which the account already has if it is enrolled).
export default function MfaSettings() {
  const [status, setStatus] = useState(null);
  const [remaining, setRemaining] = useState(null);
  const [enrolling, setEnrolling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newCodes, setNewCodes] = useState(null);

  const refresh = async () => {
    try {
      const s = await getMfaStatus();
      setStatus(s);
      if (s.enrolled) setRemaining(await backupCodesRemaining());
    } catch {
      setStatus({ enrolled: false, unavailable: true });
    }
  };
  useEffect(() => { refresh(); }, []);

  const disable = async () => {
    if (!status?.factorId) return;
    if (!window.confirm("Disable two-factor authentication? Your account will be less secure and you may be required to re-enable it.")) return;
    setBusy(true);
    try { await disableMfa(status.factorId); toast.success("Two-factor disabled."); setNewCodes(null); await refresh(); }
    catch (e) { toast.error(e?.message || "Could not disable."); }
    finally { setBusy(false); }
  };

  const regen = async () => {
    setBusy(true);
    try {
      const codes = await regenerateBackupCodes();
      setNewCodes(codes);
      setRemaining(codes.length); // we just wrote them; no need for another RPC
      toast.success("New backup codes generated.");
    } catch (e) {
      const rateLimited = e?.status === 429 || /429|too many/i.test(e?.message || "");
      toast.error(rateLimited ? "Rate limited by the gateway. Wait a minute and try again." : (e?.message || "Could not regenerate codes."));
    } finally {
      setBusy(false);
    }
  };

  if (enrolling) {
    return (
      <div className="overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#121216] p-5 sm:p-6">
        <MfaEnroll onComplete={async () => { setEnrolling(false); await refresh(); }} onCancel={() => setEnrolling(false)} />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#121216]">
      <div className="flex flex-col gap-4 px-5 py-[18px] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-[15px] font-medium text-ink">Two-factor authentication</h3>
            {status?.enrolled && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">On</span>}
          </div>
          <p className="mt-1 text-[13px] leading-5 text-ink-faint">
              {status == null ? "Checking…"
                : status.unavailable ? "Not available on this account yet."
                : status.enrolled ? `Enabled. ${remaining ?? "?"} backup codes remaining.`
                : "Not enabled. Protect your account with an authenticator app."}
          </p>
        </div>
        {status && !status.enrolled && !status.unavailable && (
          <button onClick={() => setEnrolling(true)} className="shrink-0 rounded-lg bg-[#0a84ff] px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#3096ff]">
            Enable
          </button>
        )}
      </div>

      {status?.enrolled && (
        <div className="flex flex-wrap gap-2 border-t border-white/[0.07] px-5 py-4">
          <button onClick={regen} disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-white/[0.07] px-3 py-2 text-[12px] font-medium text-ink-muted transition-colors hover:bg-white/[0.11] hover:text-ink disabled:opacity-50">
            <RefreshCw size={13} /> Regenerate backup codes
          </button>
          <button onClick={disable} disabled={busy} className="rounded-lg px-3 py-2 text-[12px] font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50">
            Disable
          </button>
        </div>
      )}

      {newCodes && (
        <div className="border-t border-white/[0.07] px-5 py-4">
          <p className="mb-3 text-[12px] text-warn">Save these now. They replace any previous codes and are shown once.</p>
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-black/20 p-3">
            {newCodes.map((c) => <code key={c} className="text-[13px] text-ink num text-center">{c}</code>)}
          </div>
        </div>
      )}
    </div>
  );
}
