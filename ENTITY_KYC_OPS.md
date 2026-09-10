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
   # Optional override used only for entity-KYC invitation links:
   ENTITY_KYC_APP_URL=http://localhost:5173
   ```

   `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are
   provided to deployed Supabase Edge Functions by the project environment.

3. Deploy the functions from the `overhaul` directory:

   ```bash
   npx supabase functions deploy entity-kyc
   npx supabase functions deploy connected-person-kyc --no-verify-jwt
   npx supabase functions deploy sumsub-webhook --no-verify-jwt
   npx supabase functions deploy api-profile
   ```

   `connected-person-kyc` uses its own high-entropy, expiring invitation token.
   `sumsub-webhook` authenticates Sumsub using the payload HMAC. They therefore
   must accept requests that do not contain a Supabase user JWT.

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
   verify the dashboard-side level configuration.

6. Confirm that `EMAIL_FROM` belongs to a domain verified in Resend. SPF and DKIM
   should pass before sending real invitations.

## Acceptance test

Use a non-admin entity application and email addresses controlled by the test
team.

1. Submit the entity forms and confirm the next page is Identity verification.
2. Confirm the primary contact can open Sumsub inside the onboarding page.
3. Confirm every connected-person record receives one email and that the link
   opens the limited verification page without creating a platform account.
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
