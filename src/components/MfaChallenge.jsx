import React, { useState } from "react";
import { ShieldCheck, KeyRound, CheckCircle2 } from "lucide-react";
import { supabase } from "../creatclient";
import { verifyChallenge, recoverWithBackupCode } from "../services/mfa";

// Login step-up: the user has a verified factor but the session is still aal1.
//
// Two ways through this screen:
//   - a correct TOTP code elevates the session to aal2 (the normal path);
//   - a valid backup code removes the factor entirely, because a backup code
//     cannot produce aal2. The gate then treats the account as having no factor
//     and requires immediate re-enrolment, which is the recovery path for a lost
//     authenticator.
//
// `onVerified` runs on success in both cases; the gate re-evaluates from there.
export default function MfaChallenge({ factorId, onVerified }) {
  const [mode, setMode] = useState("totp"); // totp | backup
  const [code, setCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [recovered, setRecovered] = useState(null); // success message after recovery

  const switchMode = (next) => {
    setMode(next);
    setErr("");
  };

  const submitTotp = async (e) => {
    e.preventDefault();
    if (code.trim().length < 6) return;
    setBusy(true); setErr("");
    try {
      await verifyChallenge(factorId, code.trim());
      onVerified?.();
    } catch (e) {
      setErr(e?.message || "Incorrect code. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const submitBackup = async (e) => {
    e.preventDefault();
    if (!backupCode.trim()) return;
    setBusy(true); setErr("");
    try {
      const { message } = await recoverWithBackupCode(backupCode);
      setRecovered(message || "Two-factor authentication has been removed.");
    } catch (e) {
      setErr(e?.message || "That backup code could not be used.");
    } finally {
      setBusy(false);
    }
  };

  // ── Recovery complete ─────────────────────────────────────────────────────
  if (recovered) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center px-4">
        <div className="bg-surface-1 border border-line-subtle rounded-xl p-6 max-w-sm w-full">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={18} className="text-emerald-400" />
            <h1 className="text-[16px] font-semibold text-ink">Backup code accepted</h1>
          </div>
          <p className="text-[12px] text-ink-muted mb-3">{recovered}</p>
          <p className="text-[12px] text-ink-muted mb-4">
            Your account is no longer protected by two-factor authentication. You will be asked to set
            up a new authenticator now, which will also issue a fresh set of backup codes.
          </p>
          <button
            onClick={() => onVerified?.()}
            className="w-full px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-medium"
          >
            Continue to set-up
          </button>
        </div>
      </div>
    );
  }

  // ── Backup code entry ─────────────────────────────────────────────────────
  if (mode === "backup") {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center px-4">
        <div className="bg-surface-1 border border-line-subtle rounded-xl p-6 max-w-sm w-full">
          <div className="flex items-center gap-2 mb-2">
            <KeyRound size={18} className="text-blue-400" />
            <h1 className="text-[16px] font-semibold text-ink">Use a backup code</h1>
          </div>
          <p className="text-[12px] text-ink-muted mb-4">
            Enter one of the backup codes you saved when you set up two-factor authentication. Each
            code works once.
          </p>
          <form onSubmit={submitBackup}>
            <input
              autoComplete="one-time-code" autoFocus maxLength={13} spellCheck={false}
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value)}
              placeholder="3f9a1-c20de"
              className="w-full bg-surface-2 border border-line rounded-md px-3 py-2 text-[15px] tracking-[0.15em] text-center font-mono text-ink placeholder:text-ink-faint focus:outline-none focus:border-blue-500/50 mb-2"
            />
            {err && <p className="text-[12px] text-down mb-2">{err}</p>}
            <button
              type="submit" disabled={busy || !backupCode.trim()}
              className="w-full px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-medium disabled:opacity-50"
            >
              {busy ? "Checking…" : "Use backup code"}
            </button>
          </form>
          <p className="mt-3 text-[11px] text-ink-faint leading-relaxed">
            Using a backup code turns off two-factor authentication so you can regain access. You will
            be required to set it up again straight away.
          </p>
          <div className="mt-4 pt-3 border-t border-line-subtle">
            <button
              onClick={() => switchMode("totp")}
              className="block text-blue-400 hover:text-blue-300 text-[12px]"
            >
              Use an authenticator code instead
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              className="mt-2 block text-ink-faint hover:text-ink-muted text-[12px]"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Authenticator code (default) ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center px-4">
      <div className="bg-surface-1 border border-line-subtle rounded-xl p-6 max-w-sm w-full">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={18} className="text-blue-400" />
          <h1 className="text-[16px] font-semibold text-ink">Two-factor verification</h1>
        </div>
        <p className="text-[12px] text-ink-muted mb-4">
          Enter the 6-digit code from your authenticator app to continue.
        </p>
        <form onSubmit={submitTotp}>
          <input
            inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus
            value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            className="w-full bg-surface-2 border border-line rounded-md px-3 py-2 text-[16px] tracking-[0.3em] text-center text-ink focus:outline-none focus:border-blue-500/50 mb-2"
          />
          {err && <p className="text-[12px] text-down mb-2">{err}</p>}
          <button type="submit" disabled={busy || code.length < 6} className="w-full px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-medium disabled:opacity-50">
            {busy ? "Verifying…" : "Verify"}
          </button>
        </form>
        <div className="mt-4 pt-3 border-t border-line-subtle">
          <p className="text-[11px] text-ink-faint mb-2">Lost access to your authenticator?</p>
          <button
            onClick={() => switchMode("backup")}
            className="block text-blue-400 hover:text-blue-300 text-[12px]"
          >
            Use a backup code
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="mt-2 block text-ink-faint hover:text-ink-muted text-[12px]"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
