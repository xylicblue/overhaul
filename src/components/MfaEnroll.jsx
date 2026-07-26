import React, { useEffect, useState } from "react";
import { ShieldCheck, Copy, Check, AlertTriangle } from "lucide-react";
import { startEnrollment, verifyEnrollment } from "../services/mfa";

// TOTP enrolment: show the QR / secret, verify a 6-digit code to activate the
// factor (which elevates the session to aal2), then reveal one-time backup codes.
// `onComplete` is called once enrolment is finished and codes acknowledged.
export default function MfaEnroll({ onComplete, onCancel }) {
  const [phase, setPhase] = useState("loading"); // loading | scan | codes | error
  const [enroll, setEnroll] = useState(null); // { factorId, qrSvg, secret, uri }
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [backupCodes, setBackupCodes] = useState([]);
  const [backupError, setBackupError] = useState("");
  const [copied, setCopied] = useState(false);
  const [savedAck, setSavedAck] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const e = await startEnrollment();
        if (!cancelled) { setEnroll(e); setPhase("scan"); }
      } catch (e) {
        if (!cancelled) { setErr(e?.message || "Could not start enrolment."); setPhase("error"); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const verify = async (e) => {
    e.preventDefault();
    if (code.trim().length < 6) return;
    setBusy(true); setErr("");
    try {
      const { backupCodes: codes, backupError: bErr } = await verifyEnrollment(enroll.factorId, code.trim());
      setBackupCodes(codes);
      setBackupError(bErr || "");
      setPhase("codes");
    } catch (e) {
      setErr(e?.message || "That code was not accepted. Check your authenticator and try again.");
    } finally {
      setBusy(false);
    }
  };

  const copyCodes = async () => {
    try { await navigator.clipboard.writeText(backupCodes.join("\n")); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
  };

  const qr = enroll?.qrSvg;
  const qrIsImg = typeof qr === "string" && qr.startsWith("data:");
  const qrIsSvg = typeof qr === "string" && qr.includes("<svg");

  return (
    <div className="bg-surface-1 border border-line-subtle rounded-xl p-5 max-w-md w-full">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck size={18} className="text-blue-400" />
        <h2 className="text-[15px] font-semibold text-ink">Set up two-factor authentication</h2>
      </div>

      {phase === "loading" && <p className="text-[13px] text-ink-faint">Preparing enrolment…</p>}

      {phase === "error" && (
        <div className="text-[13px] text-down">
          {err}
          <div className="mt-3">
            <button onClick={onCancel} className="px-3 py-1.5 rounded-md bg-surface-2 border border-line text-ink-muted text-[12px]">Close</button>
          </div>
        </div>
      )}

      {phase === "scan" && enroll && (
        <form onSubmit={verify}>
          <p className="text-[12px] text-ink-muted mb-3">
            Scan this with an authenticator app (Google Authenticator, Authy, 1Password), then enter the 6-digit code it shows.
          </p>
          <div className="flex justify-center mb-3">
            <div className="bg-white p-2 rounded-lg">
              {qrIsImg ? <img src={qr} alt="TOTP QR code" width={168} height={168} />
                : qrIsSvg ? <div style={{ width: 168, height: 168 }} dangerouslySetInnerHTML={{ __html: qr }} />
                : <div className="text-[11px] text-black p-4">Scan not available; use the key below.</div>}
            </div>
          </div>
          <div className="mb-3">
            <div className="text-[10px] uppercase tracking-widest text-ink-faint mb-1">Or enter this key manually</div>
            <code className="block text-[12px] text-ink bg-surface-2 border border-line rounded-md px-2 py-1.5 break-all">{enroll.secret}</code>
          </div>
          <input
            inputMode="numeric" autoComplete="one-time-code" maxLength={6}
            value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            className="w-full bg-surface-2 border border-line rounded-md px-3 py-2 text-[15px] tracking-[0.3em] text-center text-ink focus:outline-none focus:border-blue-500/50 mb-2"
          />
          {err && <p className="text-[12px] text-down mb-2">{err}</p>}
          <div className="flex items-center gap-2">
            <button type="submit" disabled={busy || code.length < 6} className="flex-1 px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-medium disabled:opacity-50">
              {busy ? "Verifying…" : "Verify & enable"}
            </button>
            {onCancel && <button type="button" onClick={onCancel} className="px-3 py-2 rounded-md bg-surface-2 border border-line text-ink-muted text-[13px]">Cancel</button>}
          </div>
        </form>
      )}

      {phase === "codes" && (
        <div>
          <div className="flex items-start gap-2 mb-3 text-[12px] text-up">
            <ShieldCheck size={15} className="shrink-0 mt-0.5" />
            <span>Two-factor authentication is now active on your account.</span>
          </div>

          {backupError ? (
            <div className="mb-3">
              <div className="flex items-start gap-2 text-[12px] text-warn mb-2">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>Backup codes could not be generated ({backupError}). Your 2FA still works. Generate backup codes later from Settings once this is resolved.</span>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2 mb-3 text-[12px] text-warn">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>Save these backup codes now. Each works once if you lose your authenticator. They will not be shown again.</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 mb-3 bg-surface-2 border border-line rounded-md p-3">
                {backupCodes.map((c) => <code key={c} className="text-[13px] text-ink num text-center">{c}</code>)}
              </div>
              <button onClick={copyCodes} className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-2 border border-line text-ink-muted text-[12px] mb-3 hover:text-ink">
                {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy all</>}
              </button>
              <label className="flex items-center gap-2 text-[12px] text-ink-muted mb-3 cursor-pointer">
                <input type="checkbox" checked={savedAck} onChange={(e) => setSavedAck(e.target.checked)} />
                I have saved these codes somewhere safe.
              </label>
            </>
          )}

          <button onClick={() => onComplete?.()} disabled={!backupError && !savedAck} className="w-full px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-medium disabled:opacity-50">
            Done
          </button>
        </div>
      )}
    </div>
  );
}
