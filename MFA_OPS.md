# Customer MFA: Operations and Evidence

Covers control 1a (two-factor login for customers). The application code is built;
this note lists the one-time ops steps to activate it, the enforcement model, and
the evidence to capture for the BMA.

## What was built

- `src/services/mfa.js` — wrapper over Supabase TOTP MFA plus backup codes; also
  holds the grace-window policy (`MFA_ENFORCE_NEW_AFTER`, `MFA_GRACE_UNTIL`).
- `src/components/MfaEnroll.jsx` — QR / secret enrolment, code verification, and
  one-time backup codes.
- `src/components/MfaChallenge.jsx` — login step-up when a factor exists but the
  session is aal1.
- `src/components/MfaGate.jsx` — central enforcement, wraps the app in
  `sharedlayout.jsx`.
- `src/components/MfaSettings.jsx` — manage MFA from Settings (enable, regenerate
  codes, disable).
- `supabase/migrations/add_mfa_enforcement.sql` — `is_aal2()` helper, backup-code
  table and RPCs, and the (commented) aal2 RLS policies to apply after staging.

## Activation steps (one-time)

1. In the Supabase dashboard, Authentication settings, enable the TOTP MFA factor.
2. Run `supabase/migrations/add_mfa_enforcement.sql` in the SQL editor.
3. Deploy the frontend build.
4. Enrol MFA on the admin account(s) first, before enabling any aal2 RLS, so
   admins are not locked out.
5. Confirm the grace dates in `mfa.js` with compliance and adjust if needed.

Until step 1 is done the gate fails open (the app is not blocked); enforcement
begins the moment TOTP is enabled and the migration is applied.

## Enforcement model

- Primary: the `MfaGate` blocks any authenticated session from the app until it
  reaches aal2. A session with a factor is challenged at load; a session without
  a factor is sent to enrolment when required.
- Grace: accounts created on or after `MFA_ENFORCE_NEW_AFTER` must enrol
  immediately (no grace); accounts created before it are nudged until
  `MFA_GRACE_UNTIL`, then hard-required.
- Belt-and-suspenders: the aal2 RLS policies in the migration make the data layer
  reject an aal1 API call directly, not just the UI. They are commented out and
  must be applied after staging validation, because a new user writes their
  username (a profile write) during onboarding before enrolling, so either that
  write stays reachable at aal1 or onboarding is reordered to enrol first. Record
  the exact table list here when applied.

## Backup codes and recovery

Ten single-use codes are generated at enrolment and stored only as SHA-256 hashes
(`mfa_backup_codes`, RLS locked, access via RPCs). Redeeming a code
(`mfa_redeem_backup_code`) marks it used but does not by itself elevate the
session to aal2, because only a real factor verification can. Recovery therefore
is: user signs in (aal1), redeems a backup code, and a recovery step unenrols the
lost factor so they can enrol a new one. Two ways to run that unenrol:

- Admin-assisted: support verifies identity and unenrols the factor via the admin
  API. Simplest; no new code.
- Automated: a small edge function (service role) that verifies the redeemed code
  and calls `auth.admin.mfa.deleteFactor`. Build later if self-service recovery is
  wanted.

Decide which with compliance; the admin-assisted path satisfies the requirement
today.

## Wallet-signature accounts

For any signature-only login path, the documented position is that the signed
challenge, carrying a nonce and an expiry, is the possession factor and therefore
satisfies the second-factor requirement without a separate TOTP. The current
customer auth is email and Google OAuth through Supabase, so this is a written
rationale for completeness rather than an active code path.

## Evidence to capture

- Auth config export showing the TOTP factor enabled.
- A test-account walkthrough: create an account, confirm enrolment is forced,
  enrol, sign out, sign in, confirm the challenge is required, verify, reach the
  app. Screenshot each step.
- If aal2 RLS is applied: a screenshot of an aal1 API call being rejected on a
  protected table.
