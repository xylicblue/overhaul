# Agentic Trading System — Full Architecture (for review)

**Status:** Design only — review before implementation.
**Builds on:** `TRADING_AGENTS_PLAN.md` (feasibility, the "direct-to-contract" execution decision, cadence/gas budgeting). This document is the deep, A-to-Z architecture: the 8 agent archetypes, the market-structure controller that holds **OI : Volume : TVL = 1 : 1.20 : 0.55**, the full component design, and a per-decision **cost model** with a recommended configuration.
**Environment:** Sepolia testnet. Execution = each agent signs on-chain `ClearingHouse` transactions directly (no frontend, no new trade API).

---

## 1. Recap of the load-bearing decision
Trades are on-chain transactions to `ClearingHouse` signed by a wallet key. Agents therefore hold their own funded wallets and call the contracts directly via viem/ethers (or web3.py). The frontend, Supabase, and the CF Worker are **not** in the execution path. Agent activity automatically flows into the **canonical indexer → `canonical_pnl_events` → `/admin` dashboard**, so monitoring is largely free.

> ⚠️ **Mechanism note (affects two archetypes):** this exchange is a **vAMM** (constant-product; price = f(reserves); every trade moves the mark along the curve). It is **not** a central-limit order book. So there are **no resting quotes** and **no matching engine / matching-path latency**. The "Market maker" and parts of the "HFT" archetype below are therefore re-mapped to vAMM reality (counter-flow liquidity + mark-dislocation arb). **Confirm this** — if you actually run an order book or expose vAMM LP, the MM design changes (see §4).

---

## 2. High-level architecture

```
                         ┌──────────────────────────────────────────────────────────┐
                         │                  MARKET-STRUCTURE CONTROLLER               │
                         │   targets per market: OI:Vol:TVL = 1 : 1.20 : 0.55         │
                         │   measures actuals → sets per-archetype "knobs"            │
                         └───────────────┬──────────────────────────────────────────┘
                                         │ knobs (build-rate, churn-rate, target-leverage)
        ┌────────────────────────────────┼───────────────────────────────────────────┐
        │                         ORCHESTRATOR / SCHEDULER                              │
        │   poisson cadence per agent · concurrency · rate limits · kill switch         │
        └───┬───────────────┬───────────────┬───────────────┬───────────────┬─────────┘
            │               │               │               │               │
         Agent 1 …      Agent k …        Agent m …       Agent n …       Agent z …   (8 archetypes)
            │               │               │               │               │
            ▼ each agent:  PERSONA → DECISION ENGINE → RISK/GUARDRAILS → EXECUTION
                                   (rule-based or LLM)        (hard caps)   (sign+send)
            │
   ┌────────┴─────────┐   ┌──────────────────┐   ┌──────────────────────┐   ┌──────────────────┐
   │ Market-data layer│   │ Wallet & Treasury │   │ Agent Registry       │   │ Observability    │
   │ (mark/index/     │   │ (HD wallets, gas  │   │ (id, archetype,      │   │ (canonical +     │
   │  funding/reserves│   │  + USDC funding,  │   │  params, visibility) │   │  /admin + ctrl   │
   │  /risk, multicall│   │  deposits)        │   │                      │   │  metrics)        │
   └──────────────────┘   └──────────────────┘   └──────────────────────┘   └──────────────────┘
                                         │ JSON-RPC
                                         ▼
            Sepolia ── ClearingHouse / CollateralVault / vAMM / MarketRegistry / mock USDC
                                         │ logs
                                         ▼
                       canonical-pnl-indexer → Supabase → /admin dashboard
```

**Layered per-agent pipeline:** Persona → Decision engine (rule or LLM) → Risk/guardrails (hard caps, enforced regardless of decision source) → Execution (size + slippage + simulate + sign + send) → Chain.

**Cross-cutting services:** market-data, wallet/treasury, registry, observability, and the **controller** (the new brain that steers the ensemble to the target market structure).

---

## 3. The 8 agent archetypes

Each archetype = a **persona** (behavioral intent) + a **strategy module** + a **risk budget** + **controller knobs** the supervisor can turn. Decision type is **rule-based** unless noted; rule-based = near-zero marginal cost (see §11).

| # | Archetype | Core logic | Cadence | Size / leverage | Side bias | Decision | Drives | Controller knob |
|---|---|---|---|---|---|---|---|---|
| 1 | **Datacenter hedger** (short) | Hedge schedule; sell perps to lock forward revenue; roll near expiry/funding; price-insensitive on entry | Slow (hours) | Large clips, low lev | Structural **short**, sits & rolls | Rule (opt. LLM timing) | **OI**, funding | net short build-rate |
| 2 | **Compute buyer / AI lab** (long) | Mirror hedge; buy perps to cap procurement; lumpy, directional | Slow (hours), lumpy | Large, low lev | Structural **long** | Rule (opt. LLM timing) | **OI**, funding | net long build-rate |
| 3 | **Basis / cash-and-carry arb** | Trade when `funding + basis` vs threshold pays; long perp/short ref (or inverse); unwind on convergence | Medium, event-driven | Medium, sized to edge | Mean-reverting, peg-tightening | Rule (pure math) | mark-to-index **peg**, some Vol | threshold/aggressiveness |
| 4 | **Momentum / CTA** | Trend signals (MA cross, breakout); scale in on continuation, cut on reversal; fat tails | Medium | Pyramiding, fat-tailed | Directional w/ the trend | Rule | **Vol**, volatility, OI swings | trend gain / max add |
| 5 | **Market maker / liquidity** | On vAMM: **counter-flow inventory mean-reverter** — fades mark deviations from index, absorbs others' flow, manages net inventory; backs off in stress | Fast-ish, continuous | Many small, inventory-capped | ~Flat target | Rule (must be cheap/fast) | **Vol**, liquidity/depth realism | inventory band / participation |
| 6 | **Stat-arb / HFT taker** | Many small round-trips on transient mark dislocations / microstructure | **Fast** (seconds) | Small, high turnover | Flat-ish | Rule (HFT — never LLM) | **Vol**, **TPS**, nonce/RPC stress | round-trips/min |
| 7 | **Macro / directional** | Large conviction one-directional position, held; moderate lev, big size | Slow, rare entries | **Big**, concentrated | Strong directional | **LLM** (discretionary) | **OI** concentration, vAMM impact, insurance-fund test | conviction size cap |
| 8 | **Overleveraged degen** (liq. feedstock) | Deliberately thin-margin; opens near max lev, holds into liquidation | Bursty | Tiny margin, **max lev** | Random/with-trend | Rule | **liquidation/ADL/neg-balance**, lowers TVL ratio | spawn rate / margin thinness |

**Notes**
- **1 & 2** create the structural hedging imbalance the **funding rate** must clear — they're your funding-rate engine and the base of OI.
- **3** is the truth test: if the funding mechanism holds the peg, basis arb earns little and stays small; if it doesn't, basis arb scales up and reveals it.
- **4** manufactures the volatility gaps you want for **liquidation testing** (feeds #8).
- **5** is the counterparty everyone hits; tune its inventory limits to **study how liquidity evaporates under load** (back-off behavior).
- **6** is your **trade-count / TPS** generator — exercises nonce throughput, RPC limits, and confirmation latency hardest.
- **7** is your **single-name concentration** test (OI, price-impact curve, insurance-fund exposure if underwater).
- **8** must be **registry-flagged internal-only** and clearly synthetic — never surfaced externally.

---

## 4. Decision engines

**Deterministic strategy modules (archetypes 1–6, 8).** Each is a small, testable function: `(market state, agent state, knobs) → intent {market, side, size, target_leverage} | hold | close`. No framework needed. Fast, free, repeatable, and the only sane choice for the MM and HFT (latency/cost). Pure-math agents (basis arb, momentum) are literally formulas.

**LLM decision layer (archetype 7 + optional supervisor).** An observe → decide → act loop where Claude reasons over a market snapshot and calls **guardrailed tools**:
- Tools: `get_market_snapshot()`, `get_my_positions()`, `get_balance()`, `open_position(market, side, notional, target_lev)`, `close_position(market, fraction)`, `noop(reason)`.
- The model is **never trusted** to bypass limits — the tool layer re-applies the same risk caps and sizing as the rule path.
- **Why only #7 (and maybe a supervisor)?** Discretionary macro conviction is where an LLM adds realistic, varied behavior; it's also **low frequency + big size = very few decisions**, so LLM cost is negligible. Putting LLMs on HFT/MM would be slow and expensive for zero benefit.

**Recommendation:** **7 of 8 archetypes deterministic; LLM only on Macro (#7).** Optionally a single low-frequency **LLM "regime supervisor"** that runs every ~15–30 min to set a market regime (risk-on/off, vol expectation) the deterministic agents read — cheap and adds global realism. Keep the **market-structure controller itself deterministic** (below); an LLM controller would be costly and hard to stabilize.

---

## 5. Market-structure controller — holding OI : Vol : TVL = 1 : 1.20 : 0.55

This is the part that makes the swarm produce *realistic, targeted* market structure instead of random noise.

### 5.1 Definitions (per market, USD)
- **OI** = Σ |position notional| outstanding (one side; long-OI should ≈ short-OI). Read from the runner's own position ledger, reconciled on-chain via `getPosition` and against `canonical_pnl_events`.
- **Volume** = Σ traded notional over a rolling window (define the window — **24h** recommended). Tracked from the runner's executed trades (and cross-checked vs canonical).
- **TVL** = Σ collateral/margin locked backing positions in that market (CollateralVault + per-position margin).

### 5.2 What the ratios imply
- **Vol : OI = 1.20** → daily turnover ≈ 1.2× OI (moderate churn; avg hold ≈ 20h). Driven by the **churn agents** (HFT, stat-arb, MM, momentum entries).
- **TVL : OI = 0.55** → collateral ≈ 55% of notional → **ensemble average leverage ≈ 1/0.55 ≈ 1.8×**. Driven by the **collateral/target-leverage knob** (and #8 lowers it).
- **The "1" needs an absolute anchor** — e.g. *target OI = $X per market*. **This is an open decision (§15).** Everything else scales off it.

### 5.3 The control loop (deterministic, runs every ~30–60s)
1. **Measure** actual `OI, Vol, TVL` per market.
2. **Compute targets** from the anchor: `OI* = anchor`, `Vol* = 1.20·OI*`, `TVL* = 0.55·OI*`.
3. **Error** for each metric (with a **deadband**, e.g. ±5%, so it doesn't chase noise).
4. **Actuate** by setting per-archetype knobs (proportional control, **rate-limited** to avoid oscillation):
   - `OI low`  → raise hedgers' (#1/#2) and macro (#7) **net build-rate**; `OI high` → bias them to close/roll down.
   - `Vol low` → raise **churn-rate** of HFT/stat-arb/MM/momentum; `Vol high` → throttle them.
   - `TVL off` (i.e. leverage wrong) → adjust the **target-leverage / collateral-deposit knob** (more deposits ⇒ higher TVL/lower lev; thinner margin / #8 ⇒ lower TVL/higher lev).
5. Repeat. Each metric has a **dominant lever**, so the system is near-decoupled and stable.

### 5.4 Actuation order (because the metrics are coupled)
Building OI also makes volume; churn makes volume without OI; collateral sets TVL. So actuate in this order each cycle: **TVL (slow, via deposits) → OI (medium, via net builds) → Volume (fast, top up via churn).** This prevents the fast churn knob from masking a structural OI/TVL miss.

### 5.5 Cold start (bootstrapping a market)
1. Fund + **deposit collateral** to hit `TVL*` (sets the leverage envelope).
2. Turn on **hedgers + macro** to build net positions to `OI*` (balanced long/short so funding stays sane).
3. Switch on **churn agents** to lift Volume to `1.20·OI*`.
4. Hand control to the steady-state loop with deadbands.

### 5.6 Stability guards
Deadbands, per-knob rate limits (max % change/cycle), clamps (min/max knob), and an anti-windup on the integral term if you use PI. Log the controller's measured-vs-target each cycle for the dashboard.

---

## 6. Execution layer (deepened)
Mirrors the dApp's proven flow, hardened for many wallets:
- **Sizing:** port `utils/orderPreview` math (`findMaxOpenSize`, `buildOpenOrderPreview`, `findBaseSizeForNotional`) to compute base size + `amountLimit` (slippage bound).
- **Preflight:** `eth_call` simulate every order; abort on revert.
- **Per-agent sequential nonce** (one in-flight tx per wallet) + a nonce manager; EIP-1559 gas with low tip (testnet); exponential-backoff retries; idempotency keys so a retried decision can't double-open.
- **Collateral management:** mint mock USDC → `approve` (max, once) → `CollateralVault` deposit, gated by the TVL knob.
- **vAMM-aware MM (#5):** since there are no quotes, the MM **takes counter-flow** to fade mark-vs-index deviation and manages its net inventory back toward a band; it "pulls quotes" by **widening its activation threshold / reducing participation** as inventory or vol grows (the realistic analog of pulling liquidity in stress).

---

## 7. Wallet, treasury & funding (per archetype)
- One **HD mnemonic** → deterministic N wallets; a **treasury** wallet disperses Sepolia ETH and tops up when low; sweep idle ETH back (see `TRADING_AGENTS_PLAN.md` §7).
- **Per-archetype funding profile:** hedgers/macro need **large USDC** (big positions, low lev → high TVL); degens need **tiny USDC** (thin margin); HFT needs **lots of gas** (many txns) but little collateral; MM needs medium collateral + steady gas.
- Gas is **$0 on testnet** but faucet-supply-constrained → size the swarm to your ETH inflow (HFT is the gas hog; throttle via its churn knob).

---

## 8. Agent registry & identity
A registry (config file + optional small DB table) per agent: `id, archetype, wallet_address, params, knob_state, status, visibility`.
- **`visibility`** flag: most agents internal; **the degen (#8) is internal-only and clearly synthetic** — never shown externally, and easy to exclude from any outward-facing stat.
- Lets the controller address agents by archetype, lets the dashboard label wallets (e.g. `mm-03`, `cta-01`) instead of raw addresses, and gives you a clean kill/include switch per agent or archetype.

---

## 9. Observability
- Agent trades already land in `canonical_pnl_events` → **`/admin` dashboard** shows volume, fees, funding, PnL, liquidations, OI, positions for free.
- Add: a **controller panel** (per-market actual-vs-target OI/Vol/TVL over time, current knob values), **per-archetype attribution** (volume/PnL/OI by archetype via the registry), and runner-side decision logs (especially LLM reasoning).
- Label agent wallets via the registry so the dashboard is readable.

---

## 10. Cost model — what you actually pay per decision

**On testnet the real money is LLM + RPC + hosting. Gas is $0 (faucet-constrained, not billed).** A "decision" = one agent evaluation cycle (which may or may not produce a trade).

> Rates below are **representative order-of-magnitude** to frame the model — **confirm current Anthropic + RPC pricing before budgeting.** Everything is expressed as `tokens × rate` / `requests × rate` so you can drop in exact numbers. (I can pull exact current Claude pricing on request.)

### 10.1 Per-decision cost by type
| Decision type | Work per decision | LLM tokens | Approx $ / decision |
|---|---|---|---|
| **Rule-based eval, no trade** | 1 batched multicall read | — | ~**$0.00001–0.0001** (RPC compute units) — effectively free |
| **Rule-based eval → trade** | reads + 1 tx send + 1 receipt poll | — | ~**$0.0001–0.0005** RPC; **gas $0** (testnet) |
| **LLM decision — Haiku, cached** | reads + 1 model call | ~3k in (≈90% cached) + ~400 out | ~**$0.001–0.003** |
| **LLM decision — Sonnet, cached** | same | same | ~**$0.005–0.02** |
| **LLM decision — Opus, cached** | same | same | ~**$0.03–0.10** |

Key cost facts:
- **Rule-based ≈ free** — it's just an RPC read; the marginal $ is rounding error.
- **Prompt caching** makes the static persona/tool/instruction block ~10% price on repeat calls — essential for LLM agents.
- **Cheaper model + lower cadence** dominate LLM cost far more than prompt tweaks.

### 10.2 Aggregate under the **recommended configuration**
Assume ~**20 agents** total: 7 deterministic archetypes (≈18–19 agents) + **1 macro LLM agent** + **1 LLM regime supervisor**, across a handful of markets.

| Cost center | Driver | Approx / month |
|---|---|---|
| **LLM inference** | Macro agent (~every 5–10 min) + supervisor (~every 15–30 min), Haiku-default w/ caching, occasional Sonnet | ~**$10–40** |
| **RPC** | reads (all agents, multicall, ~30s) + writes; **HFT TPS is the swing factor** | ~**$50–200** (keyed tier; low if HFT throttled, higher at high TPS) |
| **Hosting** | Railway container for the runner (alongside the indexer) | ~**$5–20** |
| **Database** | Supabase (already running) | ~**$0 incremental** |
| **Gas (Sepolia)** | testnet ETH from faucets/treasury | **$0** (operational constraint, not a bill) |
| **Total** | | ~**$65–260 / month** |

**The dominant cost is RPC, and the dominant RPC driver is the HFT/stat-arb TPS.** LLM is small because only 1–2 low-frequency agents use it. If you escalate the macro agent to Sonnet/Opus or add many LLM agents, LLM cost rises roughly linearly with (decisions × token-rate).

### 10.3 Recommended choice (cost-optimal, still realistic)
- **Decision engines:** deterministic for archetypes 1–6 & 8; **LLM only on Macro (#7)** + **one LLM regime supervisor**. Controller deterministic.
- **Model tiering:** **Claude Haiku 4.5** (`claude-haiku-4-5`) as the default LLM brain (cheap, fast); **Sonnet 4.6** (`claude-sonnet-4-6`) for the periodic supervisor / regime calls; **Opus 4.8** (`claude-opus-4-8`) reserved for occasional deep strategy reviews only. **Prompt caching on** for all.
- **RPC:** one **keyed Sepolia endpoint** (Alchemy/Infura) with multicall batching; keep the **HFT churn knob** as the throttle that bounds RPC spend.
- **Cadence:** poisson scheduling (per `TRADING_AGENTS_PLAN.md` §7) so cost scales with *trades/decisions*, not loop ticks.
- **Net:** a realistic 8-archetype swarm for **~$100–200/month**, with HFT TPS as the dial you trade off cost vs throughput-stress.

---

## 11. Tech stack
Two viable paths (you leaned Python/LangGraph earlier — both are fine):
- **Python** + `web3.py` (execution) + **LangGraph** + `langchain-anthropic` for the macro/supervisor LLM. Cost: re-port the `orderPreview` sizing math to Python and test it via simulate. Best if the team is Python-first.
- **TypeScript** + **viem** (reuses the dApp's exact ABIs/addresses/preview math — no re-port). Best to minimize duplication/risk.
- Either way: **deterministic strategies + the controller need no framework**; LangGraph only earns its keep on the LLM agents. Containerize; run on **Railway** next to the indexer. Secrets = testnet mnemonic + Anthropic key + RPC key in env, never committed.

---

## 12. Phased build plan & timeline (1 engineer)
| Phase | Deliverable | Est. |
|---|---|---|
| **0 — PoC** | 1 wallet: fund → mint → deposit → open/close on one market, visible in `/admin`. | 2–4 days |
| **1 — Execution core** | sizing+`amountLimit`+simulate+nonce/gas/retry; wallet/treasury+funding; registry skeleton. | 1–1.5 wks |
| **2 — Deterministic archetypes** | implement archetypes 1–6 & 8 as strategy modules + orchestrator (poisson, limits, kill switch). | 1.5–2 wks |
| **3 — Market-structure controller** | OI/Vol/TVL measurement + control loop + knob wiring + cold-start + stability guards. | 1–1.5 wks |
| **4 — LLM layer** | macro (#7) LLM agent + regime supervisor (tools, guardrails, caching, model tiering). | ~1 wk |
| **5 — Observability & soak** | controller panel + per-archetype attribution + agent labels; soak test; tune to hit the ratios. | 1–1.5 wks |
- **Full system:** ~**6–8 weeks**. **Deterministic-only + controller (no LLM):** ~**4–5 weeks**. PoC trades: **~3–5 days**.

---

## 13. Risks specific to this design
- **Controller oscillation / overshoot** → deadbands, rate limits, decoupled actuation order, log measured-vs-target.
- **vAMM vs order-book mismatch** for MM/HFT → confirm mechanism (§1); adopt counter-flow MM.
- **Runaway HFT cost** (RPC) → bound by the churn knob + global TPS cap.
- **Peg not holding** → surfaced (correctly) by basis arb scaling up; treat as a finding, not a bug in the agents.
- **Degen exposure** → registry `visibility=internal`, never externalize; clearly synthetic.
- **LLM nondeterminism/cost creep** → cap cadence, cheap model default, deterministic fallback, hard tool-layer guardrails.
- **Insurance-fund / negative-balance** stress from macro (#7) + degen (#8) → that's intended; make sure those paths are monitored.

---

## 14. Open decisions for your review
1. **Mechanism:** confirm **vAMM** (no order book / no LP). This sets the MM (#5) and HFT (#6) design.
2. **Absolute anchor:** what is "**1**" — i.e. the **target OI per market** in USD? Everything scales from it.
3. **Volume window:** 24h rolling for the Vol:OI = 1.20 target (or another window)?
4. **LLM scope:** macro-only + supervisor (recommended) vs more LLM agents? Default model = Haiku?
5. **Scale / budget caps:** number of agents, target TPS (drives RPC bill), and a monthly $ ceiling.
6. **Run location & registry storage:** Railway (recommended) + config-file vs DB-table registry.
7. **Language:** Python+LangGraph vs TypeScript+viem.

---

## 15. End-to-end worked example — one full coordination cycle

Concrete trace of how the pieces coordinate over a ~60-second window. Numbers are **illustrative**.

**Setup**
- Market `H100-GPU-PERP`. Anchor **`OI* = $1,000,000`** → `Vol* = $1,200,000 / 24h`, `TVL* = $550,000`.
- Current measured: `OI = $1.00M` (✅), `TVL = $560k` (✅), **`Vol(24h) = $0.90M` (❌ −25%, under-traded)**.
- Registry (this market): 2 short hedgers + 1 long hedger, 1 basis arb, 2 momentum, 2 MM, 3 HFT, 1 macro (LLM), 2 degens.

**T+0s — Controller cycle** (deterministic, every 30–60s)
1. Reads actuals from the runner's ledger (reconciled vs chain + `canonical_pnl_events`).
2. Errors vs target with ±5% deadband: OI ✅, TVL ✅, **Vol −25% ❌**.
3. Actuation order TVL → OI → Vol: TVL/OI in band → no change. Vol low → **raise the churn knob** for HFT/stat-arb/MM/momentum, proportional to the error and rate-limited (e.g. +20% this cycle): HFT round-trips/min `8 → 10`, MM participation `0.40 → 0.50`. Writes new knob values to the orchestrator.
4. Logs measured-vs-target for the dashboard's controller panel.

**T+0s — Orchestrator applies knobs**
- Recomputes each churn agent's **poisson** action rate from the new knob and schedules next action times. Hedgers/macro untouched (their knobs unchanged). Enforces global TPS cap + per-wallet one-in-flight-tx.

**T+3s — HFT `hft-02` fires** (deterministic)
- *Observe:* one multicall read → mark `$4.05`, index `$4.02`, reserves, its position (flat), free collateral.
- *Decide:* mark 0.7% above index → short bias; small clip ($2k notional) per its knob.
- *Guardrails:* within size/leverage/rate caps ✅.
- *Size+slippage:* `orderPreview` → base size + `amountLimit` (≤0.3% slippage).
- *Simulate → sign → send:* `eth_call` ok → sign with `hft-02` nonce → receipt ~1 block later. (Closes in ~30s for a round-trip → **+$4k volume, ~0 net OI**.)

**T+5s — Macro LLM `macro-01` fires** (slow cadence, ~every 8 min)
- *Observe (tools):* `get_market_snapshot()`, `get_my_positions()`, `get_balance()` → context incl. funding + the supervisor's regime tag.
- *LLM call* (Haiku, persona/tools cached) → tool call `open_position(H100, long, $120k, lev 3)`, rationale "funding negative + regime risk-on → add long."
- *Tool layer:* clamps to macro size cap, re-simulates, executes a real tx → **+$120k OI** (big, concentrated → exercises the single-name/insurance-fund test).
- *Cost:* ~$0.002 for this decision; the whole macro loop ≈ pennies/day.

**T+8s — MM `mm-01` reacts** (deterministic counter-flow)
- The HFT short + macro long moved the mark; MM sees the mark-vs-index deviation + its inventory drift and **takes counter-flow** to fade the deviation and stay in its inventory band → adds volume, dampens the mark, is the liquidity others hit (participation raised this cycle by the knob).

**T+12–40s — momentum + more HFT**
- `cta-01` sees the macro-driven up-move and scales into a long (adds OI + volume). HFT keeps doing small round-trips (volume, ~0 OI). A degen opens a thin-margin position (liquidation feedstock if vol spikes).

**Downstream (continuous)**
- Every tx → `ClearingHouse` logs → **canonical-pnl-indexer** → `canonical_pnl_events` → **/admin dashboard** (volume/OI/PnL/positions) + the controller panel showing Vol climbing.

**T+60s — Controller cycle #2 (loop closes)**
- Re-measures: `Vol = $0.97M` (rising), `OI = $1.12M` (macro+momentum pushed +12% → now slightly high), `TVL = $555k`.
- New errors: **OI +12% ❌**, Vol −19% ❌, TVL ✅.
- Actuate: OI high → bias hedgers/macro to **stop adding / roll down** (lower build-rate knob); keep churn elevated for Vol. Rate-limited so it eases rather than slams.
- Over several cycles the swarm self-corrects toward **1 : 1.20 : 0.55** — no single agent ever "knows" the target.

**Who owns what:** the **controller** owns the target and steers the *aggregate* via knobs; each **agent** owns only its persona behavior within knobs; the **execution layer** owns safe on-chain settlement; the **indexer/dashboard** own truth and observability. That separation is the whole design.

---

## 16. How often should each subagent run? (cadence & drivers)

**Two cadences, kept separate** (see `TRADING_AGENTS_PLAN.md` §7):
- **Evaluate / poll cadence** — how often it *observes & thinks*. Cheap reads, **no gas** → can be frequent.
- **Action / trade cadence** — how often it *actually trades*. Costs gas + RPC writes → **poisson-sampled and modulated by the controller**. This is the one to keep low and varied.

> Action cadence is **not hardcoded** — it is `base persona rate × controller knob`, poisson-sampled, then **clamped** by budgets and chain limits.

**Recommended defaults (starting point):**
| Archetype | Evaluate | Trade (base) | Notes |
|---|---|---|---|
| Datacenter hedger | 1–5 min | every few hours (rolls) | structural, slow |
| Compute buyer | 1–5 min | hours, lumpy | structural, slow |
| Basis arb | 15–60 s | event-driven (edge > threshold) | trades only when funding+basis pays |
| Momentum / CTA | 30–60 s | minutes, on signal | bursts in trends |
| Market maker | 5–15 s | frequent counter-flow | near-continuous |
| HFT / stat-arb | 1–5 s | seconds (round-trips) | the volume / TPS engine |
| Macro (LLM) | 5–15 min | rare, big entries | low freq = cheap LLM |
| Degen | 30–60 s | bursty spawns | timed to vol, for liquidation |

**Factors that set / scale cadence**
1. **Persona realism** — the archetype's natural frequency (a hedger trading every second is fake; an hourly HFT is pointless). Cadence must fit the behavior.
2. **Controller targets** — to hold `Vol:OI = 1.20`, the controller computes required turnover and **raises/lowers the churn agents' action rate**; OI agents' rate floats with the OI error. So Vol-/OI-driving cadence is *derived*, not fixed.
3. **Volatility / regime** — momentum, MM, HFT, degens naturally act more in volatile/trending regimes; the LLM regime supervisor can scale the whole swarm up/down.
4. **Gas / ETH budget (testnet)** — more actions = more gas; bounded by treasury inflow. HFT is the gas hog → its cadence is the main throttle.
5. **RPC budget / limits** — read polling + write throughput; the keyed-RPC tier caps sustainable cadence.
6. **LLM budget** — LLM agents' cadence directly sets inference cost; keep them slow.
7. **Chain throughput (hard ceiling)** — Sepolia ~12s blocks + **one in-flight tx per wallet** (nonce) ⇒ a single wallet does at most ~1 tx / ~12–15s. **High TPS comes from *more wallets*, not a faster per-wallet loop** — "HFT cadence" really means *(number of HFT wallets) × (per-wallet rate)*.
8. **Decision type** — LLM decisions are slower/costlier than rule decisions, so LLM archetypes are intrinsically lower-cadence.

**Rule of thumb**
- Set each archetype's **base** action rate from persona realism.
- Let the **controller scale** churn/build rates within clamps to hit the ratios.
- **Hard-cap** everything by per-wallet block limit, gas inflow, and RPC/LLM budgets.
- Keep **evaluation frequent (cheap)** and **action rare + poisson (expensive)** so cost tracks *trades*, not *thinking*.

---

### Appendix — metric sources for the controller
- **OI / TVL:** runner's own position+collateral ledger (fast), reconciled with on-chain `getPosition` / `CollateralVault` and `canonical_pnl_events`.
- **Volume:** runner's executed-trade log over the rolling window, cross-checked vs `canonical_pnl_events`.
- **Mark / index / funding / reserves / risk:** vAMM `getMarkPrice`, oracle `getPrice`, `MarketRegistry.getMarket`, risk params — same reads the dApp uses, batched via multicall.
