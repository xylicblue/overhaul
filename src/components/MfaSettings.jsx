import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ShieldCheck, ShieldOff, RefreshCw } from "lucide-react";
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
      <div className="bg-surface-1 border border-line-subtle rounded-2xl p-5">
        <MfaEnroll onComplete={async () => { setEnrolling(false); await refresh(); }} onCancel={() => setEnrolling(false)} />
      </div>
    );
  }

  return (
    <div className="bg-surface-1 backdrop-blur-md border border-line-subtle rounded-2xl p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {status?.enrolled ? <ShieldCheck size={22} className="text-up" /> : <ShieldOff size={22} className="text-ink-faint" />}
          <div>
            <h4 className="font-bold text-ink text-sm">Two-Factor Authentication</h4>
            <p className="text-xs text-ink-faint mt-0.5">
              {status == null ? "Checking…"
                : status.unavailable ? "Not available on this account yet."
                : status.enrolled ? `Enabled. ${remaining ?? "?"} backup codes remaining.`
                : "Not enabled. Protect your account with an authenticator app."}
            </p>
          </div>
        </div>
        {status && !status.enrolled && !status.unavailable && (
          <button onClick={() => setEnrolling(true)} className="shrink-0 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-[12px] font-medium">
            Enable
          </button>
        )}
      </div>

      {status?.enrolled && (
        <div className="mt-4 pt-4 border-t border-line-subtle flex flex-wrap gap-2">
          <button onClick={regen} disabled={busy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-2 border border-line text-ink-muted text-[12px] hover:text-ink disabled:opacity-50">
            <RefreshCw size={13} /> Regenerate backup codes
          </button>
          <button onClick={disable} disabled={busy} className="px-3 py-1.5 rounded-md bg-surface-2 border border-down/30 text-down text-[12px] hover:bg-down/10 disabled:opacity-50">
            Disable
          </button>
        </div>
      )}

      {newCodes && (
        <div className="mt-4 pt-4 border-t border-line-subtle">
          <p className="text-[12px] text-warn mb-2">Save these now. They replace any previous codes and are shown once.</p>
          <div className="grid grid-cols-2 gap-1.5 bg-surface-2 border border-line rounded-md p-3">
            {newCodes.map((c) => <code key={c} className="text-[13px] text-ink num text-center">{c}</code>)}
          </div>
        </div>
      )}
    </div>
  );
}
