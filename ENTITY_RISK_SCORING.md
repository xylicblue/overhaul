# Entity risk-scoring engine

This implementation is based on `ByteStrike - Onboarding Flow and Risk Calculator - 06 Aug 2026.xlsx` (SHA-256 `4e8f78a8057dbce8815dacbc05f3d58b38a623a0cd18ff483f73b9465da9f127`). The source workbook is not modified or required at runtime.

## What is implemented

- A versioned database model containing the workbook's five weights, factor categories, 13 gates, and exact 502-code ISIC lookup.
- An authoritative server-side calculator. Browser callers provide controlled category keys; numeric scores and gate actions are always looked up in Postgres.
- Immutable assessment revisions with the original computed score, any manual score override and reason, all factor inputs, all gate outcomes, supporting evidence JSON, model version, actor, and timestamp.
- `BLOCK` before `FORCE-HIGH`, then the numeric band:
  - Low: score `<= 3.30`, review every 18 months.
  - Medium: score `> 3.30` and `<= 6.70`, review every 12 months.
  - High: score `> 6.70`, review every 6 months.
- High ratings and FORCE-HIGH gates require EDD. Tier 3 applications require EDD independently of their numeric rating. Every non-blocked application still requires Compliance review.
- Admin/AAL2-only queue, review context, and assessment creation APIs.
- A separate Compliance portal at `/admin/compliance`, distinct from the trading/platform admin dashboard.
- A complete entity register in that portal, including draft, in-progress, submitted, under-review, approved, and rejected applications.
- Structured onboarding fields for source-of-funds category, ownership structure, country of incorporation, and each connected person's nationality and country of residence.
- Server-side derivation of ISIC, source of funds, ownership, and the worst classified geography. Scorechain wallet results and normalized screening gates remain provider inputs.

## Apply the migration

Open the following files in the Supabase SQL Editor and run them in order after
the entity-onboarding, entity-KYC, and admin-dashboard migrations:

1. `supabase/migrations/add_entity_risk_scoring.sql`
2. `supabase/migrations/add_entity_risk_input_derivation.sql`

If this folder is already incorporated into a timestamped Supabase migration
workflow, deploy them through that workflow instead.

The migration validates that 502 ISIC rules, 95 High ISIC rules, 23 factor rules,
and 13 gate rules were seeded before committing.

## Runtime flow

1. The entity submits onboarding and all connected people complete KYC.
2. Compliance opens `/admin/compliance` and selects the entity. The register also shows incomplete applications for operational visibility, but they cannot be scored.
3. Postgres derives ISIC, source of funds, ownership structure, and worst applicable classified geography from structured application data. Legacy values are recovered only when the mapping is unambiguous; otherwise the portal asks Compliance to resolve the missing category.
4. Until provider integrations are enabled, Compliance selects the Scorechain wallet category and records confirmed screening/sanctions gate outcomes and supporting notes.
5. Postgres computes and stores an immutable assessment revision.
6. A correction or later re-score creates another revision; existing assessments cannot be changed or deleted.

The source statements remain visible as evidence. They are not broadly converted by fuzzy matching. A narrow legacy source-of-funds compatibility rule accepts only recognised category phrases, and legacy UBO-count derivation is explicitly flagged because old records did not encode ownership layers.

## Provider integration boundary

The engine is ready to receive automated results, but the current codebase does not yet contain a Scorechain integration or a maintained FATF/sanctions jurisdiction feed. The current Sumsub webhook records identity-review status, not normalized sanctions, PEP, or adverse-media outcomes. Until those integrations are added, Compliance must confirm those inputs in the admin workspace.

Geography is resolved through `entity_country_risk_rules`, versioned with the risk model. Only Bermuda (`BM`) is seeded from the workbook's target-market rule. Compliance or a provider sync must populate other country classifications with a source and effective date; unclassified countries are surfaced as unresolved rather than being assigned a guessed score.

Do not hard-code changing sanctions or FATF lists as a permanent source. Provider results should include source, list/version, checked-at time, subject, and raw evidence in `p_gate_evidence`.

## Workbook ambiguity requiring Compliance confirmation

The FATF-grey-list rule conflicts within the workbook:

- Geographic Risk row 7 and Gates row 14 say `BLOCK`.
- The note in Gates row 8 says grey-list exposure is `FORCE-HIGH`.

Model `2026-08-06` follows the explicit gate action (`BLOCK`) and records the conflict in its model metadata. If Compliance chooses `FORCE-HIGH`, create a new model version rather than editing historical assessments.
