# ByteStrike Entity Continuous Monitoring System

## 1. What has been built

ByteStrike now has a separate off-chain monitoring layer for approved entity customers. It observes confirmed protocol activity, recalculates a customer’s live risk, records rule results and presents alerts and account controls to Compliance. It does not modify the audited smart contracts, submit blockchain transactions or change liquidation behaviour.

The implementation has four connected parts:

1. A standalone monitoring worker reads finalized ClearingHouse events.
2. Supabase stores immutable events, risk snapshots, alerts, screening schedules and decision evidence.
3. The Compliance Portal explains the current classification, its drivers and its history, and permits governed manual action.
4. The Trade and Portfolio interfaces check the customer’s current transaction permission immediately before asking the wallet to sign.

The transaction-monitoring model remains in **shadow mode**. A triggered rule records evidence and proposes an action, but does not automatically restrict the customer. This is intentional while thresholds and outcomes are being observed. Compliance can apply or revoke a restriction with a written rationale and supporting documents.

No contract source, ABI deployment, proxy implementation or on-chain authority was changed.

## 2. How information moves through the system

The monitoring worker is located in `entity-monitoring-worker/` and is independent of the existing `indexer/` directory. It watches finalized `TradeExecuted`, `CollateralDeposited` and `CollateralWithdrawn` events emitted by the audited ClearingHouse.

For each event, the worker:

1. waits for the configured number of confirmations;
2. normalizes the wallet, token, amount, block and transaction evidence;
3. rejects an unexpected collateral token instead of assuming that it is USD;
4. calculates aggregate account equity;
5. sends the event to a service-role-only Supabase function; and
6. advances its checkpoint only after the event range has been processed.

Events are idempotent. Replaying the same block range cannot create a second copy of the same event. A database lease also ensures that only one worker instance actively processes the chain while another instance may remain available as standby.

The worker additionally performs a scheduled refresh every 15 minutes by default. This matters because unrealized P&L and pending funding can change while the customer makes no new transaction. The database identifies approved customer wallets whose latest risk snapshot is stale, and the worker recalculates their current equity and risk.

### Account equity calculation

Before the first trade, the AUM basis is net deposited collateral: confirmed deposits less confirmed withdrawals.

After the first trade, the basis becomes aggregate effective account equity. The worker starts with the ClearingHouse free account value and then adds the effective margin of every open market position. Effective position margin is reconstructed from the contract-reported notional and margin ratio. Since the margin ratio already reflects position margin, unrealized P&L and pending funding, the resulting aggregate follows the agreed live-equity definition without changing the contracts.

All configured market IDs are held in `entity-monitoring-worker/config/markets.sepolia.json`. A market addition or removal therefore requires a reviewed configuration change and worker deployment.

## 3. Live risk calculation

The live customer classification uses the latest approved onboarding assessment and the transactional score:

- before the first transaction, the onboarding classification remains the operative rating;
- after trading starts, onboarding contributes 30%; and
- transactional activity contributes 70%.

The latest approved CDD assessment supplies the onboarding component. It is not permanently tied to the customer’s original application rating: a later approved CDD review becomes the new 30% input.

Only the five factors confirmed through row 25 of the monitoring workbook contribute to the numeric transactional score:

- aggregate account equity: 10% of the transactional model;
- collateral-deposit volume: 15%;
- collateral-deposit count: 15%;
- collateral-withdrawal volume: 15%; and
- collateral-withdrawal count: 15%.

Those weights total 70% in the workbook and are normalized to a transactional score out of 10 before applying the 30/70 composed calculation. The established bands remain:

- Low: 0 to 3.30;
- Medium: above 3.30 to 6.70; and
- High: above 6.70 to 10.

Every recalculation creates a new immutable snapshot. The snapshot retains the onboarding assessment used, individual factor scores, observed rolling-window values, account-equity basis, model version, final score and band. The Compliance Portal shows both the latest result and the lineage of earlier results.

Expected monthly deposits are optional. When Compliance has collected a meaningful customer-specific baseline, it can be stored with a rationale and used by the purpose-sensitive rule. A missing estimate does not create a fabricated zero baseline.

## 4. Rules, alerts and review deadlines

The following confirmed transaction rules are now evaluated in shadow mode:

- activity outside the declared primary purpose and expected-deposit baseline;
- rapid deposit followed by an equal or larger withdrawal within 24 hours;
- a material withdrawal at least seven times the customer’s prior 90-day withdrawal median;
- withdrawal of at least 70% of the pre-withdrawal balance;
- a collateral deposit or withdrawal of at least USD 50,000;
- three or more collateral movements between USD 40,000 and USD 50,000 in 30 days;
- four or more withdrawals totaling at least USD 25,000 in 24 hours; and
- the existing balance and 30/90-day cash-in and cash-out limits.

Trade notional is not treated as cash-in or cash-out. Cash-in means confirmed collateral deposited into the protocol, and cash-out means confirmed collateral withdrawn. Margin changes are not used as transaction-monitoring cash flows.

Pattern, jurisdiction and screening rules are alert/action controls and do not add a numeric risk score. This preserves the confirmed distinction between the five score factors and the later workbook rows.

Every generated alert receives a deadline automatically:

- sanctions-related alerts: 24 hours; and
- all other alerts: three business days, calculated as UTC weekdays.

The portal shows the deadline and highlights overdue unresolved alerts. Business-day holidays are not yet modeled; the current calculation excludes Saturdays and Sundays.

Third-party sender, recipient and routing rules remain explicitly disabled because the approved-wallet design does not permit ordinary third-party deposit or withdrawal activity. They remain in the rule inventory so Compliance can explain why they are not implemented and revisit them if the product model changes.

## 5. Screening operations

Every approved entity receives three monitoring schedules:

- sanctions: daily and intended to run at each transaction;
- PEP: daily; and
- adverse media: daily.

The database includes a service-only queue for due screenings, an immutable result ledger and a vendor-availability register. Each result can retain the provider reference, lists checked, person concerned, evidence, observation time and whether the last available result was used.

If a vendor is unavailable, the status is visible in the Compliance Portal together with the last successful result time and error. The system does not pretend that a fresh screening occurred. The schedule remains available for an ex-post rerun when service returns.

The production vendor connector itself is not activated in this change. It still requires production vendor credentials and confirmation of the exact sanctions and PEP lists, relatives-and-close-associates coverage and update frequency. Until those details are confirmed, the system provides the scheduling, evidence and outage framework without inventing vendor behaviour.

A possible PEP or adverse-media match creates an alert for Compliance confirmation. It does not automatically treat an unconfirmed name match as a final true positive. Confirmed sanctions, PEP and adverse-media results can be recorded with their appropriate high or critical priority and configured action.

## 6. Compliance decisions and customer controls

Only the registered Compliance Officer can revise global monitoring thresholds. The first AAL2 administrator can bootstrap the first Compliance Officer assignment in the portal with a rationale. Once an active officer exists, only that officer can change the assignment. Role events are retained as immutable audit evidence.

Threshold changes create a new monitoring-model version. Previous versions and the reason for each revision remain available. An administrative approval reference may be stored, but the software does not attempt to replace the Company’s separate governance and Risk Committee process.

Compliance can review alerts as reviewing, true positive, false positive, escalated or closed. Every outcome requires a rationale. Supporting evidence can be uploaded using the existing private Compliance-document control, limited to three documents per application for the relevant purpose.

The preferred freeze control is **close-only**. It blocks:

- opening a position;
- changing margin;
- depositing collateral; and
- withdrawing collateral.

It continues to allow a customer to reduce or close an existing position, avoiding a situation where the customer is forced to retain market exposure during a Compliance review. Restrictions can also be applied to a specific activity, or as the older all-activity control where separately justified. Every application and revocation creates an audit action.

The frontend calls `current_entity_transaction_permissions()` immediately before a wallet signature is requested. This avoids relying on an old page-load result. Administrators are exempt so internal operations are not accidentally locked out.

This control is deliberately described as an off-chain platform restriction. A user who directly calls an audited contract outside the ByteStrike interface is outside this enforcement boundary. Closing that gap would require a separately designed and audited contract-level control, which was excluded from this project.

## 7. Deployment, testing and operating checklist

### Database

The production Supabase project has received these migrations:

- `20261015163521_complete_entity_live_monitoring_controls.sql`; and
- `20261015163709_schedule_entity_monitoring_screenings.sql`.

After deployment, the active model contains 17 implemented rules, all existing alerts have deadlines, approved entities have screening schedules, and Sumsub is initially shown as unavailable until a connector reports a successful result. This is transparent by design.

### Worker

Deploy `entity-monitoring-worker/` as its own Node.js service. Follow its `DEPLOYMENT.md` and `.env.example`. The important settings are the Supabase service key, RPC URL, chain and contract addresses, real ClearingHouse deployment block, finality depth, market configuration path and scheduled refresh interval.

Start once with `DRY_RUN=true` and `RUN_ONCE=true`, inspect the normalized events, then enable continuous operation. Confirm:

- `/health` returns HTTP 200;
- the worker heartbeat is current;
- the checkpoint advances only across finalized blocks;
- events appear once;
- scheduled risk snapshots continue even without new transactions; and
- an unexpected collateral token fails rather than being valued as USD.

### Frontend and Compliance testing

Use an AAL2 administrator account to register the initial Compliance Officer. Then test a threshold revision and confirm a new model version appears while the previous version remains in history.

With an approved test entity, apply a close-only restriction. Confirm that opening positions, margin changes, deposits and withdrawals stop before the wallet prompt, while closing an existing position remains available. Revoke the restriction with a rationale and confirm access returns.

Review a monitoring alert and verify its deadline, rationale and status are retained. Upload and reopen supporting evidence. For vendor testing, use the service-only screening RPCs in a non-production test flow until the real connector is ready.

The worker test suite covers event normalization, chain ordering and aggregate-equity arithmetic. The main application test suite and production build should also be run before each release.

### Remaining work

The core monitoring and control framework is operational, but three items remain deliberately open:

1. connect the production screening vendor and confirm the exact lists and coverage;
2. observe shadow alerts, tune thresholds through governed model revisions and approve any move to automated enforcement; and
3. decide whether direct on-chain bypass risk justifies a future, separately audited contract design.

These are visible limitations, not hidden assumptions. The current system records what it knows, distinguishes stale or unavailable vendor data, and keeps Compliance in control of consequential customer actions.
