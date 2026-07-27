// MFA service wrapper.
//
// Thin layer over Supabase Auth's native TOTP MFA plus our own backup codes.
// Supabase does the cryptography; this centralises the flows so the UI and the
// enforcement gate share one source of truth.
//
// Assurance levels: a password or OAuth login lands at aal1. Verifying a TOTP
// factor elevates the session to aal2, which is stamped into the JWT `aal` claim
// and is what the app gate and the RLS policies key off.
import { supabase } from "../creatclient";

// Grace policy, documented here so the thresholds are explicit.
//  - Accounts created on/after MFA_ENFORCE_NEW_AFTER (the launch date) must enrol
//    immediately: no grace. This satisfies "enforced for all new logins".
//  - Accounts created before launch get a 7-day window (set 2026-07-28) to enrol.
//    After MFA_GRACE_UNTIL enrolment is hard-required for everyone — the gate then
//    blocks the app (and therefore opening/closing positions) until they enrol.
// Adjust with the compliance team.
export const MFA_ENFORCE_NEW_AFTER = new Date("2026-07-26T00:00:00Z");
export const MFA_GRACE_UNTIL = new Date("2026-08-04T00:00:00Z"); // 7 days for existing accounts

/** Whether a no-factor account must enrol now, versus still within its grace window. */
export function enrolmentRequired(accountCreatedAt, now = new Date()) {
  const created = accountCreatedAt ? new Date(accountCreatedAt) : null;
  if (created && created >= MFA_ENFORCE_NEW_AFTER) return true; // new account, no grace
  return now >= MFA_GRACE_UNTIL; // existing account, grace expired
}

const BACKUP_CODE_COUNT = 10;

/**
 * Current MFA posture for the signed-in user.
 * Returns { enrolled, currentLevel, nextLevel, needsChallenge, factorId }.
 *   needsChallenge: a factor exists but the session is still aal1 (login step-up).
 */
export async function getMfaStatus() {
  const [{ data: aal, error: aalErr }, { data: factors, error: facErr }] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ]);
  if (aalErr) throw aalErr;
  if (facErr) throw facErr;

  // Only fully verified TOTP factors count. An unverified factor is a stalled
  // enrolment and must not be treated as protection.
  // NOTE: listFactors() returns each factor with `.id` (enroll() also returns
  // `.id`); read `.factorId` as a defensive fallback across SDK versions.
  const verified = (factors?.totp ?? []).filter((f) => f.status === "verified");
  const enrolled = verified.length > 0;
  return {
    enrolled,
    factorId: verified[0]?.id ?? verified[0]?.factorId ?? null,
    currentLevel: aal?.currentLevel ?? null,
    nextLevel: aal?.nextLevel ?? null,
    // Factor exists but the session has not been elevated this login.
    needsChallenge: enrolled && aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2",
    unverifiedFactors: (factors?.totp ?? []).filter((f) => f.status !== "verified"),
  };
}

/**
 * Begin TOTP enrolment. Returns { factorId, qrSvg, secret, uri }.
 * The caller shows the QR / secret, then calls verifyEnrollment with a code.
 * Clears any stalled unverified factors first so re-enrolment cannot pile them up.
 */
export async function startEnrollment() {
  const { data: existing } = await supabase.auth.mfa.listFactors();
  for (const f of existing?.totp ?? []) {
    if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id ?? f.factorId });
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `authenticator-${Date.now()}` });
  if (error) throw error;
  return { factorId: data.id, qrSvg: data.totp.qr_code, secret: data.totp.secret, uri: data.totp.uri };
}

/**
 * Finish enrolment: challenge the new factor and verify the user's code. On
 * success the session becomes aal2 and backup codes are generated and returned
 * (shown to the user exactly once).
 */
export async function verifyEnrollment(factorId, code) {
  const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
  if (chErr) throw chErr;
  const { error: vErr } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code });
  if (vErr) throw vErr;
  // The factor is now verified and the session is aal2 (2FA is active). Backup
  // codes are best-effort: a failure here (e.g. the RPC not yet deployed) must
  // NOT undo a successful enrolment. Surface it so the user can retry later.
  try {
    const codes = await regenerateBackupCodes();
    return { backupCodes: codes, backupError: null };
  } catch (e) {
    return { backupCodes: [], backupError: e?.message || "Backup codes could not be generated." };
  }
}

/**
 * Login step-up: challenge an existing factor and verify the code to reach aal2.
 */
export async function verifyChallenge(factorId, code) {
  const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
  if (chErr) throw chErr;
  const { error: vErr } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code });
  if (vErr) throw vErr;
  return true;
}

/** Remove the user's TOTP factor (requires an aal2 session; used from settings). */
export async function disableMfa(factorId) {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
  // Best-effort cleanup of stored backup codes. This MUST NOT fail the disable:
  // the factor is already removed by this point. Note supabase.rpc() returns a
  // builder that is awaitable but has no .catch(), so await and inspect instead.
  try {
    const { error: clearErr } = await supabase.rpc("mfa_clear_backup_codes");
    if (clearErr) console.warn("[mfa] could not clear backup codes:", clearErr.message);
  } catch (e) {
    console.warn("[mfa] backup-code cleanup threw:", e?.message);
  }
}

// ── Backup codes ────────────────────────────────────────────────────────────
// Codes are shown to the user once and stored only as SHA-256 hashes, so a
// database read never exposes a usable code. Redemption is handled server-side
// (see mfa_redeem_backup_code / the recovery edge function).

function randomCode() {
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 5)}-${hex.slice(5, 10)}`; // e.g. 3f9a1-c20de
}

async function sha256Hex(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Generate a fresh set of backup codes, replacing any previous set. */
export async function regenerateBackupCodes() {
  const codes = Array.from({ length: BACKUP_CODE_COUNT }, randomCode);
  const hashes = await Promise.all(codes.map(sha256Hex));
  const { error } = await supabase.rpc("mfa_set_backup_codes", { p_hashes: hashes });
  if (error) throw error;
  return codes; // plaintext, shown once
}

/** How many unused backup codes remain (for the settings display). */
export async function backupCodesRemaining() {
  const { data, error } = await supabase.rpc("mfa_backup_codes_remaining");
  if (error) return null;
  return Number(data ?? 0);
}
