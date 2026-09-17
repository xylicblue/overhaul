# Entity Onboarding, Phase 1

This build implements the collection stages requested in `amlatf/instructions.md`:

1. Step 0: authorised primary contact and entity shell.
2. Step 1: entity data and supporting documents.
3. Step 1a: conditional financial institution information and EDD notice.
4. Step 2: connected natural persons and government-issued identification.

Sumsub screening, automatic Tier 2 or Tier 3 classification from ISIC, EDD execution, Scorechain screening, risk scoring, compliance approval, connected-person invitation accounts and on-chain wallet allowlisting are not represented as complete controls in this phase.

## Deployment order

1. Confirm `add_mfa_enforcement.sql` has already been applied. The new write policies call `public.is_aal2()`.
2. Run `supabase/migrations/add_entity_onboarding.sql` in the Supabase SQL Editor.
3. Confirm the private Storage bucket `entity-onboarding-documents` was created by the migration.
4. Deploy the `api-profile` Edge Function. It enforces entity status before issuing or accepting a wallet-link challenge.
5. Deploy the frontend.
6. Test with a newly created account and an existing account before enabling the flow for demonstrations.

The migration is additive. It does not alter existing trading, market, profile or protocol tables. The frontend gate permits the existing flow only when the new table is genuinely absent, which prevents a frontend-first deployment from taking the existing exchange offline. Once the table exists, an operational lookup failure blocks the trading screen until entity status can be verified.

## Current access behavior

Authenticated users may view `/trade` before submitting an entity application, but its order panel remains read-only and wallet connection redirects to onboarding. `/portfolio` remains behind the entity-submission gate. Public pages, market information, settings and administration are not placed behind this gate.

Accounts whose own `profiles.is_admin` value is `true` are exempt from entity onboarding. This exemption is intended for authorised ByteStrike team accounts used for demonstrations and protocol testing. It is resolved from the authenticated profile and is not based on an email address, wallet address or browser flag. Admin accounts that arrive at `/welcome` or `/onboarding` are sent directly to their intended destination.

For non-admin accounts, entity onboarding now precedes KYC. Attempting to launch identity verification before submitting the entity application redirects the user to `/onboarding`. The website checks this both when the verification control is selected and again at its Sumsub token-request boundary. Sumsub screening itself remains part of the deferred integration phase; when its Edge Function source is brought into this repository, the same ordering must also be enforced inside that server endpoint before issuing a verification token.

For this staged build, `submitted`, `under_review` and `approved` application statuses pass the website gates. Wallet linking is also enforced by `api-profile`, while the trade page remains a read-only preview before submission. When the Compliance review and wallet-allowlisting phase is implemented, access must be narrowed to `approved` and enforced at the transaction authorization layer. The current order-panel gate is a workflow control, not an on-chain permission boundary.

## Acceptance test

1. Create or sign into a test account.
2. Navigate to `/trade` and confirm market data remains visible while the order panel asks the user to complete onboarding.
3. Complete MFA when prompted.
4. Complete Step 0 and confirm an `entity_applications` row exists for the user.
5. Upload one valid PDF or image and confirm the object is private and stored under the user's UUID folder.
6. Confirm another authenticated user cannot read that application, connected-person record or document object.
7. Select a non-financial entity type and confirm Step 1a is skipped.
8. Select a financial entity type in a separate test and confirm Step 1a and the EDD notice appear.
9. Add a connected person, save the record and upload identification.
10. Confirm submission is rejected until every required field and document is present.
11. Complete all requirements, submit, and confirm the application becomes read-only and wallet connection becomes available after KYC.
12. Sign in as an account with `profiles.is_admin = true` and confirm `/trade`, `/portfolio`, `/welcome` and `/onboarding` do not require an entity application.
13. Sign in as a non-admin account without a submitted application, select Verify/KYC from the profile menu and confirm redirection to entity onboarding without opening Sumsub.
14. Confirm a newly authenticated incomplete account lands on `/welcome`, sees the onboarding explanation and can either start onboarding or continue browsing the landing page.
15. Attempt to link a wallet by calling `api-profile` directly for an incomplete non-admin account and confirm the function returns `entity_onboarding_required`.
