# Deployment

1. Apply the Supabase migrations for the live-monitoring foundation, worker runtime and completed controls through `20261015163709_schedule_entity_monitoring_screenings.sql`.
2. Deploy this directory as its own Node.js service or Docker container. Do not use the existing `indexer/` service as its start command.
3. Copy `.env.example` into the platform's environment settings and provide the production values. Keep `SUPABASE_SERVICE_ROLE_KEY` secret.
4. Confirm `CLEARING_HOUSE_ADDRESS`, `COLLATERAL_TOKEN_ADDRESS`, `CHAIN_ID` and the contract's actual deployment block in `START_BLOCK` before starting. Keep `MARKET_CONFIG_PATH=./config/markets.sepolia.json` unless deploying a separately reviewed market register.
5. Start with `DRY_RUN=true` and `RUN_ONCE=true`. Review logs, then set both to `false` for continuous ingestion.
6. Set `RISK_REFRESH_INTERVAL_MS` (15 minutes by default) and `RISK_REFRESH_BATCH_SIZE` for scheduled equity/risk refreshes.
7. Run `npm run check` and `npm test`, then verify `/health` returns HTTP 200 and confirm the worker heartbeat, checkpoint and new risk snapshots in Supabase.

Only one instance holds the database lease at a time. A standby instance remains idle until the lease expires. Events are processed after `FINALITY_CONFIRMATIONS`, in bounded block chunks, and the database RPC provides event-level idempotency.

The service is still a shadow monitor: it records scores, rule evidence and recommended actions but does not automatically apply customer restrictions. Compliance applies or revokes a restriction in the portal with a rationale. Daily sanctions/PEP/adverse-media schedules are stored in Supabase, but the production vendor connector remains a separate deployment step once vendor credentials and list coverage are confirmed.
