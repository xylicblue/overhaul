# Trading Agents (Testnet Simulation) — End-to-End Plan

**Status:** Plan only — nothing built yet.
**Scope:** Automated agents that place real trades on the **Sepolia testnet** deployment of the ByteStrike GPU‑futures exchange, to generate realistic trading activity, load, and data for testing the contracts, the indexer, the risk/PnL accounting, and the dashboards.

---

## 0. TL;DR — the one decision that matters

**Agents should NOT drive the web frontend, and you do NOT need to build a new trade API.**

A trade on this exchange is simply an **on-chain transaction to the `ClearingHouse` contract, signed by a wallet's private key.** The website is just a UI wrapper around that signature. Therefore the correct, robust approach is:

> Each agent holds its **own funded testnet wallet (private key)** and calls the **smart contracts directly** (`openPosition`, `closePosition`, `addMargin`, collateral deposit) using a headless signer (viem/ethers). **The contract ABI on Sepolia _is_ the API.**

Everything else (Supabase, the Cloudflare Worker gateway, the React app) is off-chain convenience and is **not** in the trade-execution path. Bonus: because agents trade on-chain, your existing **canonical indexer → `canonical_pnl_events` → admin dashboard** pipeline will capture and display agent activity automatically, with zero extra wiring.

---

## 1. Feasibility: High

Almost everything needed already exists in this repo / deployment:

| Need | Already have it? | Where |
|---|---|---|
| Deployed perp contracts on a testnet | ✅ | `ClearingHouse 0xDf4DDD…40a0d`, `CollateralVault`, per-market `vAMM`, `MarketRegistry`, mock USDC (`src/contracts/addresses.js`) |
| Contract ABIs | ✅ | `src/contracts/abis/*.json` |
| The exact trade call | ✅ | `ClearingHouse.openPosition(marketId, isLong, size, amountLimit)` (`hooks/useClearingHouse` → `useOpenPosition`) |
| Read methods for decisions | ✅ | `getPosition`, vAMM `getMarkPrice`, oracle `getPrice`, `MarketRegistry.getMarket` (fee/quote), risk params (IMR/MMR) |
| Pre-trade simulation pattern | ✅ | the frontend does an `eth_call` simulate before sending — we reuse the same idea |
| Order sizing / slippage math | ✅ | `src/utils/orderPreview.js` (`buildOpenOrderPreview`, `findMaxOpenSize`, `findBaseSizeForNotional`) — portable to Node |
| Test collateral | ✅ | mock USDC mint (the "Mint 10K USDC" flow) + Sepolia ETH faucet |
| Monitoring of agent trades | ✅ | canonical indexer → `canonical_pnl_events` → **/admin dashboard** |

**The actual build is the "agent runner": a standalone headless service.** It does not touch the frontend or the DB. Risk is low and well-contained because it's testnet-only and decoupled.

---

## 2. The architectural question, answered directly

**"Can the agents interact with our frontend to trade, or do we need to set up an API?"**

Three options, with a clear recommendation:

1. **Drive the browser/frontend (Playwright + an automated wallet extension).** ❌ **Don't.**
   - Requires automating a browser wallet (e.g. headless MetaMask via Synpress) to sign — brittle, slow, hard to scale to many agents, and constantly breaks on UI changes.
   - Adds zero correctness benefit: the contract is the source of truth, not the UI.

2. **Build/use an off-chain "trade API" (Supabase / Cloudflare Worker).** ❌ **Not needed for execution.**
   - Your Supabase + CF gateway handle **auth and off-chain data** (sessions, `trade_history` mirror, market-data cache). They cannot move funds or open positions — only a signed on-chain tx can.
   - You may **optionally read** market data through the CF gateway/Supabase for convenience, but **writes = contract calls**.

3. **Agents call the contracts directly with their own wallets (viem/ethers).** ✅ **Recommended.**
   - This is exactly what the dApp does under the hood, minus the browser.
   - Fully programmatic, scalable to many agents, deterministic, and reuses your ABIs/addresses/preview math.

> Note: Supabase **wallet-auth (SIWE)** is only for logging into the *website*. Agents trading on-chain **do not need a website session** at all. Their trades will appear in `canonical_pnl_events` (and the admin dashboard) but **not** in the app-written `trade_history`/`trades` tables (those are written by the frontend) — which is fine, since canonical is the source of truth.

---

## 3. Target architecture (the agent runner)

A new, separate service — suggested as a sibling package/repo (e.g. `agents/`), **not** inside the React app.

```
                ┌─────────────────────────────────────────────┐
                │              Agent Runner (Node)             │
                │                                              │
   config ─────▶│  Orchestrator / Scheduler                   │
                │     │                                        │
                │     ├─▶ Agent[i]  (persona + strategy + key) │
                │     │     │                                  │
                │     │     ├─ Decision layer ───┐             │
                │     │     │   • rule-based bot  │            │
                │     │     │   • OR Claude (LLM) │            │
                │     │     │                     ▼            │
                │     │     └─ Execution layer (guardrailed)   │
                │     │           • size + amountLimit         │
                │     │           • eth_call simulate          │
                │     │           • sign + send + retry        │
                │     ▼                                        │
                │  Market-data layer  ◀── reads ──┐            │
                │  Wallet & funding manager       │            │
                └─────────────────────────────────┼────────────┘
                                                   │ JSON-RPC (signed txns + reads)
                                                   ▼
                       Sepolia ── ClearingHouse / CollateralVault / vAMM / MarketRegistry / mock USDC
                                                   │ emits logs
                                                   ▼
                       canonical-pnl-indexer (Railway) ─▶ Supabase canonical_pnl_events ─▶ /admin dashboard
```

**Components**

1. **Wallet & funding manager** — derive N agent wallets from one HD mnemonic; keep each topped up with Sepolia ETH (gas) and mock USDC (collateral); handle ERC-20 `approve` + `CollateralVault` deposit.
2. **Market-data layer** — read mark/index/funding/reserves/risk params per market (the same reads the dApp uses), batched via multicall.
3. **Decision layer** — per-agent strategy (rule-based and/or LLM). Outputs an *intent* (market, side, size, target leverage, or "do nothing"/"close").
4. **Execution layer** — turns intent into a safe transaction: compute size + `amountLimit` (slippage bound), **simulate via `eth_call`**, manage nonce/gas, send, wait for receipt, retry. This is the only thing that signs.
5. **Orchestrator/scheduler** — runs agents on intervals with concurrency limits, per-agent config, and a global kill switch.
6. **Observability** — structured logs + **reuse your existing dashboard** (agent trades are just on-chain trades).

---

## 4. Agent design & "agentic workflows"

An **agent = persona + strategy + wallet + risk budget.**

### 4a. Strategy options (mix them for good test coverage)
- **Noise/random trader** — random side/size within limits. Great for raw volume and load.
- **Momentum / mean-reversion** — react to recent mark-price moves. Produces directional flow and realistic PnL distribution.
- **Market maker** — opens balanced long/short flow around the index; exercises both sides + funding.
- **Liquidation bait / high-leverage** — opens near max leverage to deliberately trigger MMR/liquidation paths (tests the risk engine + liquidation accounting).
- **Funding arber** — trades the side that *earns* funding; exercises the funding-settlement path.

### 4b. Rule-based vs LLM-driven
- **Rule-based bots** — deterministic, cheap, fast, infinitely scalable, repeatable. **Best for load, coverage, and edge cases.**
- **LLM-driven agents (the "agentic" part)** — an observe → decide → act loop where **Claude** reasons over a market snapshot and calls tools. More realistic/varied behavior and good for "does our data look like real users?", at the cost of money, latency, and nondeterminism.

**LLM agent loop (tool use):**
- Tools exposed to the model (each one enforces guardrails server-side, the model is *never* trusted to bypass limits):
  - `get_market_snapshot()`, `get_my_positions()`, `get_balance()`
  - `open_position(market, side, notional|size, target_leverage)`
  - `close_position(market, fraction)`, `adjust_margin(market, delta)`, `noop(reason)`
- The execution layer behind those tools does the same sizing/simulation/guardrail checks as the rule-based path.
- **Models (Anthropic API / Claude Agent SDK):** `claude-haiku-4-5` for cheap high-frequency agents, `claude-sonnet-4-6` for balanced decision-making, `claude-opus-4-8` for the few "smart" agents doing multi-step reasoning. Use **tool use** + **prompt caching** for the static strategy/market context to cut cost. (Confirm current pricing/limits in the Anthropic console before scaling.)

**Recommendation:** **Hybrid.** Run mostly deterministic bots for volume/coverage/repeatability, plus a handful of Claude agents for realistic, varied decisions. Keep **execution deterministic and guardrailed regardless of who decides.**

---

## 5. Per-trade execution flow (mirror the dApp's proven flow)

1. **Read** market state: vAMM reserves, mark, oracle/index, fee bps, risk params (IMR/MMR), existing position.
2. **Decide** side + target size/notional (+ optional target leverage) via the strategy.
3. **Size & slippage**: compute base size and `amountLimit` using ported `orderPreview` math (`findMaxOpenSize`, `buildOpenOrderPreview`, `findBaseSizeForNotional`).
4. **Ensure collateral**: if free collateral is low → mint mock USDC → `approve` → `CollateralVault` deposit.
5. **Preflight**: `eth_call` `openPosition(...)`; abort on revert (same as the frontend's simulate step).
6. **Send**: sign + submit with managed nonce/gas; wait for receipt; retry on transient RPC errors.
7. **(Optional)** `addMargin` to hit a target leverage (the dApp's 2-step pattern).
8. **Lifecycle**: periodically `closePosition`/reduce, add/remove margin, or let high-lev agents ride into liquidation.
9. **Observe**: canonical indexer + `/admin` pick it up; log locally too.

---

## 6. Wallet & funding logistics (the real testnet bottleneck)

This is usually the hardest *operational* part, not the code:
- Each agent needs **Sepolia ETH (gas)** and **mock USDC (collateral)**.
- **Mock USDC**: there's a mint path (the "Mint 10K USDC" function) — script it per agent. Easy.
- **Sepolia ETH**: public faucets are heavily rate-limited. **Fund one "treasury" wallet** well, then run a **disperse script** that sends gas ETH to each agent and tops them up when low. Budget for ongoing gas top-ups.
- **Approvals**: one ERC-20 `approve(CollateralVault, …)` per agent (or per top-up).
- Derive all agents from a **single HD mnemonic** so funding/recovery is deterministic.

> Trade *frequency* (not loop frequency) is what drives gas burn — see **§7** below for the cadence model and treasury sizing.

---

## 7. Trade cadence, rate-limiting & gas budgeting

**Agents must NOT loop every second.** Per-second trading would (a) drain Sepolia ETH in minutes, (b) whipsaw the vAMM mark price (every trade moves a constant-product AMM), and (c) spam the indexer and rate-limit the RPC — degrading the very data you're trying to generate. **Gas should scale with _trades_, not loop ticks.**

### 7.1 Cadence model — poll cheap, trade rarely
- **Decouple reads from writes.** Agents *evaluate* market state on a timer (~15–60s, or on each new block) — those are free `eth_call` reads, **no gas**. A transaction is sent only when a condition/probability fires. **Most evaluations are no-ops.**
- **Poisson inter-arrivals, not clockwork.** Give each agent a target rate (e.g. "3 trades/hour"), then sample the *next* action time from an exponential distribution → realistic, bursty activity with idle gaps instead of a metronome.
- **Hold positions, don't churn.** Open and keep a position for minutes/hours, then close — like a real trader. The tunable is *new positions per hour*, not loop frequency.
- **Event-driven option.** React to new blocks / meaningful price moves rather than busy-polling.

### 7.2 Rate limits & budgets (enforced in the execution layer, not the strategy)
- **Per-agent:** max tx/hour, max gas/day, max open positions.
- **Global:** max tx/minute across all agents + a **kill switch**.
- Throttle reads and writes separately (reads cheap, writes rare).

### 7.3 Gas math — size the sim to your ETH inflow
Rough Sepolia figures (verify against the contract): `openPosition` ≈ 300–600k gas; at ~1–3 gwei ≈ **0.0005–0.0015 ETH/tx**.

```
ETH/day ≈ agents × trades/agent/hr × 24 × ~2 tx/trade (open+close) × ETH/tx
```

| Config | ~Tx/day | ~ETH/day | Verdict |
|---|---|---|---|
| 10 agents × every ~1s | impractical | >1 ETH in *minutes* | ❌ |
| 10 agents × 3 trades/hr | ~720 | ~0.4–1.0 | ✅ sustainable |
| 5 agents × 2 trades/hr | ~300 | ~0.2–0.5 | ✅ easy |

Tune `agents × trades/hr` to match how much Sepolia ETH you can bring in per day.

### 7.4 Sepolia ETH supply
1. **Treasury + disperse + recycle.** Fund one treasury wallet; distribute gas to agents; **top up only when low (to a cap)**; **sweep leftover ETH back** from idle/retired agents.
2. **Stack faucet accounts.** Alchemy / Infura / QuickNode daily drips (more with a mainnet balance) → a few accounts ≈ 1–2 ETH/day. The **pk910 PoW faucet** (`sepolia-faucet.pk910.de`) yields a larger chunk in one sitting.
3. **Keep gas price low** (testnet has spare block space) and **approve max once / deposit once** to avoid repeat-approval gas.
4. **Run in sessions, not 24/7.** A 1–2 hour throttled session usually generates plenty of data — then stop.

### 7.5 Free high-volume testing on a fork
For hammering the strategy/execution code, run `anvil --fork-url <sepolia>` — unlimited "ETH", instant blocks, zero faucet pain.
⚠️ A fork is **not** seen by the Railway indexer or `/admin` (they watch real Sepolia). So: use the fork to harden agent logic cheaply, and use **real Sepolia (throttled)** for the end-to-end runs you want to appear in the dashboard.

### 7.6 Recommended defaults (starting point)
- Evaluate every **~30s** (or per block); **trades via poisson at 2–5 / hour / agent**.
- **5–10 agents** to start; per-agent **gas budget ~0.1 ETH/day**; global kill switch at a treasury-floor.
- Hold positions **minutes–hours**; close/reduce on schedule or signal.
- Develop on a **fork**; run **timed Sepolia sessions** for dashboard-visible data.

---

## 8. Detailed tech stack & tools

| Layer | Recommendation | Why |
|---|---|---|
| Language/runtime | **TypeScript + Node.js** | Reuse the repo's ABIs, `addresses.js`, and `orderPreview` math; share types with the dApp. (Python + web3.py is viable but loses that reuse.) |
| Chain library | **viem** (core), or **ethers v6** (already a dep) | `wagmi` is React-only — not for a headless service. viem has great multicall, accounts, and simulation. |
| Wallets | viem `mnemonicToAccount` / `privateKeyToAccount` | Deterministic N-agent derivation from one mnemonic. |
| Contracts | Import existing ABIs + `SEPOLIA_CONTRACTS`/`MARKET_IDS`/`MARKETS` | No re-deployment; single source of truth. |
| RPC | **Keyed Sepolia endpoint (Alchemy/Infura)** + multicall | The public node will rate-limit under bot load; you already support `VITE_SEPOLIA_RPC_URL`. |
| LLM (optional) | **Anthropic API** (`@anthropic-ai/sdk`) with **tool use**, or the **Claude Agent SDK** | Models: `claude-haiku-4-5` / `claude-sonnet-4-6` / `claude-opus-4-8`. Use prompt caching. |
| Orchestration | Node process w/ scheduler (`setInterval`/`node-cron`); **BullMQ + Redis** only if you scale to many agents | Start simple; add a queue when concurrency demands it. |
| Hosting | **Railway** (you already run the indexer there) in a Docker container | Same ops surface as the existing indexer. |
| Config & secrets | per-agent JSON/env + `dotenv`; **testnet keys only**, never committed | Keep agent personas/limits in config. |
| Logging/metrics | `pino` logs; reuse Supabase `canonical_pnl_events` + `/admin`; optional Grafana/Prometheus | Most monitoring is free via the existing pipeline. |
| Local testing | **anvil/hardhat fork of Sepolia** for dry runs, then live Sepolia | Catch reverts/nonce/gas issues cheaply before going live. |

---

## 9. Observability — mostly free

- Agent trades flow into **`canonical_pnl_events`** automatically (they're on-chain), so the **`/admin` dashboard** already shows their volume, fees, funding, PnL, liquidations, top "traders", and open positions.
- Agents are wallets without Supabase `profiles`, so they'll show as **short addresses**. Optional: seed `profiles`-style labels (or a small agent-label map in the runner) so the dashboard reads "agent-momentum-03" instead of `0x12ab…`.
- Add lightweight runner-side logs/metrics for decision reasoning (especially for LLM agents) that the on-chain data can't capture.

---

## 10. Safety & guardrails (testnet, but still)

- **Chain assertion:** refuse to run unless `chainId === 11155111`. Never load a mainnet key.
- **Per-agent caps:** max position size, max leverage, max open positions, max loss/day → enforced in the execution layer, not the strategy/LLM.
- **Global kill switch** + rate limiting (txns/min per agent and overall).
- **Always simulate before send.** Always set a sane `amountLimit` (slippage bound).
- **Keys:** dedicated testnet mnemonic in env/secrets; isolated from any real funds.

---

## 11. Phased plan & timeline (1 engineer)

| Phase | Deliverable | Est. |
|---|---|---|
| **0 — PoC spike** | One script: fund a wallet, mint USDC, deposit, `openPosition` + `closePosition` on one market, confirmed in `/admin`. | **2–4 days** |
| **1 — Execution core** | Robust execution layer (sizing, `amountLimit`, simulate, nonce/gas/retry) + wallet/funding manager + 1 deterministic bot. | **1–1.5 wks** |
| **2 — Multi-agent** | Orchestrator, several rule-based strategies, per-agent config, safety/guardrails, structured logging. | **1–1.5 wks** |
| **3 — LLM agents** | Tool layer + Claude decision loop + guardrails + a few LLM-driven agents. | **~1 wk** |
| **4 — Soak & polish** | Agent labels in dashboard, soak/load test, tuning, gas/funding automation. | **~1 wk** |

- **Lean PoC generating real agent trades:** ~**3–5 days**.
- **Rule-based-only system (no LLM):** ~**2–3 weeks**.
- **Full vision (rule-based + LLM + monitoring):** ~**4–6 weeks**.
- Estimates assume a reliable keyed RPC and that testnet funding is sorted; the biggest schedule risk is operational (gas/faucet/RPC), not code.

---

## 12. Risks & mitigations

| Risk | Mitigation |
|---|---|
| RPC rate limits under bot load | Keyed endpoint (Alchemy/Infura), batch reads via multicall, backoff/retry |
| Sepolia ETH scarcity / faucet limits | Treasury wallet + disperse/top-up script; budget gas |
| Nonce collisions across concurrent txns | Per-agent sequential nonce manager; one in-flight tx per agent (or managed nonce pool) |
| Reverts / slippage | Simulate (`eth_call`) before send; set `amountLimit` |
| LLM cost / latency / nondeterminism | Cap call rate, prompt caching, cheap model (Haiku) for high-freq, deterministic fallback |
| Indexer lag | Read confirmations from chain for agent logic; treat dashboard as eventual |
| Key leakage | Testnet-only mnemonic, secrets manager, chainId guard |

---

## 13. What NOT to do
- ❌ Don't automate the browser or a wallet extension to place trades.
- ❌ Don't route trades through Supabase/the CF Worker (they can't sign txns).
- ❌ Don't reuse any mainnet/real key.
- ❌ Don't skip the pre-send simulation or the slippage bound.

---

## 14. Suggested repo layout (`agents/` — separate from the dApp)

```
agents/
  src/
    config/           # agent personas, limits, market selection
    chain/            # viem clients, ABIs (re-exported from dApp), addresses
    wallets/          # HD derivation, funding/top-up, approvals, deposits
    market/           # reads: mark/index/funding/reserves/risk (multicall)
    preview/          # ported orderPreview sizing + amountLimit math
    execution/        # simulate → sign → send → retry; nonce/gas mgmt; guardrails
    strategies/       # rule-based: noise, momentum, mean-reversion, mm, liq-bait
    llm/              # Claude tool definitions + decision loop (optional)
    orchestrator/     # scheduler, concurrency, kill switch
    logging/          # pino + optional metrics
  scripts/            # fund-agents, mint-usdc, disperse-eth, run
  .env.example        # TESTNET keys only
  Dockerfile
```

---

## 15. Open decisions for the team
1. **Mix:** how many deterministic bots vs Claude agents? (Recommend mostly bots + a few LLM.)
2. **Scale:** how many agents / target trades-per-hour? (Drives RPC tier + nonce strategy.)
3. **Run location:** Railway service (matches the indexer) vs local vs CI cron.
4. **Agent identity:** label agents in the dashboard (seed `profiles` rows) or keep raw addresses?
5. **LLM budget:** approve Anthropic spend + pick default model tier.
6. **RPC budget:** approve a keyed Sepolia endpoint.

---

### Appendix — key contract entry points the runner will use
- `ClearingHouse.openPosition(marketId, isLong, size, amountLimit)` — open/increase
- `ClearingHouse.closePosition(...)` / reduce
- `ClearingHouse.addMargin(...)` / `removeMargin(...)`
- `ClearingHouse.getPosition(account, marketId)` — position state
- `CollateralVault` deposit / `balanceOf` / `getTokenValueX18`
- `MarketRegistry.getMarket(marketId)` — fee bps, quote token
- vAMM `getMarkPrice()` / reserves; oracle `getPrice()` — pricing
- mock USDC `mint(...)` / `approve(...)` — test collateral

All addresses/ABIs already live in `src/contracts/`.
