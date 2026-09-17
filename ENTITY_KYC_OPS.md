# Entity and Connected-Person KYC Operations

## Purpose

This flow starts after the entity information and connected-person records have
been submitted. The authenticated primary contact completes Sumsub verification
inside ByteStrike. Each connected-person record receives a private seven-day link
to their own Sumsub verification. The link does not create a ByteStrike account
and grants no access to entity information, wallets or trading.

Completion of all identity checks moves the application to `under_review`. It
does not approve the entity automatically. Compliance approval remains a
separate human decision, and customer wallet linking remains unavailable until
the application status is `approved`.

## Deployment

1. Run `supabase/migrations/add_entity_kyc.sql` in the Supabase SQL editor.
   If it has not already been applied, run
   `supabase/migrations/fix_entity_kyc_provider_trigger.sql` immediately after
   it.
   For the entity risk engine, then run these migrations in order:

   ```text
   supabase/migrations/add_entity_risk_scoring.sql
   supabase/migrations/add_entity_risk_input_derivation.sql
   supabase/migrations/complete_entity_risk_automation.sql
   supabase/migrations/add_entity_scorechain_screening.sql
   ```
2. Configure the following Edge Function secrets. Use the existing Sumsub and
   Resend credentials where they are already configured:

   ```text
   SUMSUB_APP_TOKEN=<Sumsub application token>
   SUMSUB_SECRET_KEY=<Sumsub secret key>
   SUMSUB_WEBHOOK_SECRET=<a separate high-entropy webhook secret>
   SUMSUB_PRIMARY_CONTACT_LEVEL=<configured individual verification level>
   SUMSUB_CONNECTED_PERSON_LEVEL=<configured individual verification level>
   RESEND_API_KEY=<Resend API key>
   EMAIL_FROM=ByteStrike Compliance <compliance@byte-strike.com>
   APP_URL=https://byte-strike.com
   # Set this explicitly in production. It is used only for entity-KYC links:
   ENTITY_KYC_APP_URL=https://byte-strike.com
   SCORECHAIN_API_KEY=<Scorechain production API key with Risk Scoring access>
   # Optional; defaults to https://api.scorechain.com/v1
   SCORECHAIN_API_URL=https://api.scorechain.com/v1
   # Optional; defaults to 10 and limits provider spend per application
   SCORECHAIN_MAX_ADDRESSES=10
   # Optional fallback if this API key cannot call /publicKeys
   SCORECHAIN_PUBLIC_KEY=<current Scorechain RSA public key in PEM format>
   ```

   For local Edge Function testing only, use both of the following. Never set
   `ENTITY_KYC_ALLOW_LOCAL_URL` in the production project:

   ```text
   ENTITY_KYC_APP_URL=http://localhost:5173
   ENTITY_KYC_ALLOW_LOCAL_URL=true
   ```

   `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are
   provided to deployed Supabase Edge Functions by the project environment.

3. Deploy the functions from the `overhaul` directory:

   ```bash
   npx supabase functions deploy entity-kyc
   npx supabase functions deploy connected-person-kyc --no-verify-jwt
   npx supabase functions deploy sumsub-webhook --no-verify-jwt
   npx supabase functions deploy entity-wallet-screening
   npx supabase functions deploy api-profile
   ```

   `connected-person-kyc` uses its own high-entropy, expiring invitation token.
   `sumsub-webhook` authenticates Sumsub using the payload HMAC. They therefore
   must accept requests that do not contain a Supabase user JWT.

   Before sending a real invitation, open
   `https://byte-strike.com/verify-connected-person` directly and confirm the
   production host serves the React application rather than a 404. The project
   includes `public/_redirects` for hosts compatible with Cloudflare Pages or
   Netlify SPA redirects. Configure an equivalent rewrite to `/index.html` on
   any other static host.

4. In Sumsub, configure the webhook endpoint as:

   ```text
   https://<project-ref>.supabase.co/functions/v1/sumsub-webhook
   ```

   Configure SHA-256 HMAC signing using the exact value held in
   `SUMSUB_WEBHOOK_SECRET`. Subscribe at minimum to applicant created, pending,
   on hold, reset and reviewed events.

5. Confirm that the Sumsub level used for connected persons includes the checks
   required by Compliance: identity document, selfie or liveness and the
   configured sanctions, PEP and adverse-media screening. This repository cannot
   verify the dashboard-side level configuration. The terminal
   `applicantReviewed` webhook is treated as authoritative only on that basis.

6. Confirm that `EMAIL_FROM` belongs to a domain verified in Resend. SPF and DKIM
   should pass before sending real invitations.

## Acceptance test

Use a non-admin entity application and email addresses controlled by the test
team.

1. Submit the entity forms and confirm the next page is Identity verification.
2. Confirm the primary contact can open Sumsub inside the onboarding page.
3. Confirm every connected-person record receives one email and that the link
   opens the limited verification page without creating a platform account.
   New invitation links carry the bearer token in the URL fragment (`#invite=`),
   so it is not sent to the web host or CDN. After the page opens, confirm the
   token disappears from the address bar before Sumsub loads.
4. Confirm a modified, revoked or expired invitation is rejected.
5. Complete one connected-person verification and confirm its status changes to
   Verified after the signed webhook arrives.
6. Confirm the entity remains pending while any required person is incomplete.
7. Complete all checks and confirm the entity changes to `under_review`, not
   `approved`.
8. Confirm wallet linking remains blocked until Compliance separately sets the
   entity application to `approved`.
9. Confirm an admin account retains the existing onboarding exemption.

## Operational safeguards

- Raw invitation tokens are never stored in the database or written to logs.
  Only SHA-256 hashes are retained.
- Resending rotates the token, invalidating the previous link.
- Webhook payloads are accepted only after a constant-time HMAC comparison and
  are deduplicated before status changes are applied.
- Provider-controlled result fields are protected by database triggers against
  direct browser writes.
- Sumsub completion does not automatically approve an entity or grant trading
  access.

## Risk automation

The application supplies the ISIC class, source-of-funds category, ownership
structure and all relevant ISO country codes. Sumsub terminal-review labels are
mapped server-side to the sanctions, PEP, adverse-media and criminal-record
gates. No browser client can write provider results.

The `entity-wallet-screening` Edge Function reads the submitted wallet list
from the database, performs a full Ethereum address analysis (all assets,
incoming and outgoing exposure, depth 6), verifies Scorechain's signed response,
and submits the worst result across every declared wallet through the
service-role-only RPC. `p_wallet_key` is mapped from Scorechain's `NO_RISK`,
`LOW_RISK`, `MEDIUM_RISK`, `HIGH_RISK` or `CRITICAL_RISK` severity.

The onboarding form currently accepts Ethereum-compatible `0x` addresses
because ByteStrike's trading contracts run on Ethereum. Add an explicit chain
field before supporting non-EVM addresses; never infer a chain from a bare
address. The function is idempotent for an unchanged wallet list and Compliance
can explicitly rescreen from the risk-review portal.

The RPC below remains the trusted persistence boundary and is called by the
Edge Function, not the browser:

```js
const { data, error } = await serviceRoleSupabase.rpc(
  "service_record_entity_wallet_screening",
  {
    p_application_id: "<application-uuid>",
    p_wallet_key: "low",
    p_provider_reference: "<scorechain-case-or-request-id>",
    p_screened_addresses: ["0x..."],
    p_evidence: { source: "Scorechain API" },
  },
);
```

This RPC must be called from a trusted backend using the Supabase service-role
key; never expose that key in the website. When KYC, every Sumsub subject, the
wallet result and all application inputs are ready, the database creates one
immutable assessment revision for that exact input fingerprint. The result can
route to Compliance, EDD or blocked, but it never changes the application to
`approved`.
