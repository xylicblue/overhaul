import React, { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { supabase } from "../creatclient";
import { verifyChallenge } from "../services/mfa";

// Login step-up: the user has a verified factor but the session is still aal1.
// A correct TOTP code elevates the session to aal2. `onVerified` runs on success.
export default function MfaChallenge({ factorId, onVerified }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
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
        <form onSubmit={submit}>
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
        <div className="mt-4 pt-3 border-t border-line-subtle text-[11px] text-ink-faint">
          Lost access to your authenticator? Use a backup code by signing out and starting account recovery, or contact support.
          <button
            onClick={() => supabase.auth.signOut()}
            className="mt-2 block text-blue-400 hover:text-blue-300 text-[12px]"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
