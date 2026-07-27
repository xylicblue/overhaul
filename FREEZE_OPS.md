# Freeze a Single Account: Operations and Evidence

Covers control 3 (freeze a single account). An admin can suspend one account for
fraud, abuse, or compliance; the suspension blocks new sessions and platform
orders, and every freeze/unfreeze is logged. The audited contracts are untouched.

## What was built

- `supabase/migrations/add_account_freeze.sql` — `frozen` flag + reason/at/by on
  profiles; `account_freeze_log` audit table; `admin_set_account_frozen`,
  `admin_account_freeze_log`, `admin_lookup_account` RPCs (all is_admin gated);
  `is_self_frozen()` helper; and staged (commented) aal-style RLS teeth.
- `src/components/AccountGate.jsx` — signs a frozen user out and shows a
  suspension screen; wraps the app in `sharedlayout.jsx` (outside MfaGate).
- `src/components/AdminAccountFreeze.jsx` — admin freeze/unfreeze control plus the
  audit log, mounted in the admin dashboard.
- `supabase/functions/api-trade` and `api-close` — fail-open freeze guard: a
  suspended account's order record is rejected; any lookup error proceeds.

## Enforcement layers (all block ONLY when frozen is true)

1. Session / UI: `AccountGate` ends the session and shows suspension. First line.
2. Orders: the edge guards reject a frozen account in `api-trade` / `api-close`.
   Fail-open, so a lookup error never blocks a normal trade.
3. RLS teeth (staged): block a frozen account's direct-to-Supabase writes. Left
   commented in the migration; apply after staging validation.

Scope: this is a platform-level suspension. It cannot stop a user from calling
the immutable contracts directly with their own wallet (that would need
contract-level account gating, which the frozen contracts do not have). It blocks
the account from using the platform, which is what the control requires.

## Why normal trading is unaffected

`frozen` defaults false, so every check is a no-op for a normal account. The edge
guards fail open (a DB error proceeds), the app gate fails open, and the on-chain
trade path is not touched. The agent swarm does not use these edge functions.

## Activation

1. Run `add_account_freeze.sql` in the Supabase SQL editor.
2. Deploy the two edge functions (`supabase functions deploy api-trade api-close`)
   and the frontend build.
3. Decide with compliance whether to apply the staged RLS teeth (after staging).

## Freeze test on a dummy account (evidence)

1. Create a dummy account and confirm it can load the app and (optionally) record
   a test trade.
2. As an admin, open the admin dashboard, Account Controls, search the dummy by
   wallet or username, enter a reason, click Freeze.
3. Confirm: the dummy's next page load shows the suspension screen and it is
   signed out; a trade/close attempt returns "Account suspended" (403 from the
   edge function); the freeze appears in the audit log with actor, reason, time.
4. Unfreeze and confirm normal access is restored.
5. Confirm a DIFFERENT normal account can still trade throughout (fail-open path
   unaffected).

Capture screenshots of the suspension screen, the 403, and the audit-log row.
