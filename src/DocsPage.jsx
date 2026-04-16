import React, { useState, useEffect } from "react";
import {
  BookOpen,
  ChevronRight,
  Code2,
  Layers,
  ShieldCheck,
  ArrowLeftRight,
  BarChart2,
  Landmark,
  Cpu,
  Calculator,
  Circle,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar sections
// ─────────────────────────────────────────────────────────────────────────────
const SECTIONS = [
  { id: "overview",         number: "00", label: "Architecture Overview" },
  { id: "clearinghouse",    number: "01", label: "ClearingHouse"         },
  { id: "vamm",             number: "02", label: "vAMM"                  },
  { id: "collateralvault",  number: "03", label: "CollateralVault"       },
  { id: "marketregistry",   number: "04", label: "MarketRegistry"        },
  { id: "feerouter",        number: "05", label: "FeeRouter"             },
  { id: "insurancefund",    number: "06", label: "InsuranceFund"         },
  { id: "oracle",           number: "07", label: "Oracle System"         },
  { id: "calculations",     number: "08", label: "Calculations Library"  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Reusable primitives (same style as GuidePage)
// ─────────────────────────────────────────────────────────────────────────────
const SectionHeading = ({ number, icon: Icon, children }) => (
  <div className="flex items-center gap-3 mb-6">
    <span className="text-[11px] font-bold font-mono text-zinc-600 tabular-nums">{number}</span>
    <div className="w-px h-4 bg-zinc-800" />
    {Icon && <Icon size={14} className="text-blue-400 shrink-0" />}
    <h2 className="text-xl font-bold text-white tracking-tight">{children}</h2>
  </div>
);

const Card = ({ children, className = "" }) => (
  <div className={`bg-[#0a0a10] border border-zinc-800/80 rounded-xl overflow-hidden ${className}`}>
    {children}
  </div>
);

const CardAccent = ({ color = "blue", children }) => {
  const colors = {
    blue:   "border-blue-500/30 bg-blue-500/5",
    green:  "border-emerald-500/30 bg-emerald-500/5",
    amber:  "border-amber-500/30 bg-amber-500/5",
    purple: "border-purple-500/30 bg-purple-500/5",
    red:    "border-red-500/30 bg-red-500/5",
  };
  return (
    <div className={`border rounded-xl p-4 ${colors[color]}`}>
      {children}
    </div>
  );
};

// A function row inside a contract card
const FnRow = ({ name, params, returns, desc }) => (
  <div className="px-5 py-4 border-b border-zinc-800/50 last:border-b-0">
    <div className="flex flex-wrap items-baseline gap-2 mb-1">
      <code className="text-[12px] font-mono font-bold text-blue-300">{name}</code>
      {params && (
        <code className="text-[10px] font-mono text-zinc-500">({params})</code>
      )}
      {returns && (
        <code className="text-[10px] font-mono text-emerald-500/80">→ {returns}</code>
      )}
    </div>
    <p className="text-[11px] text-zinc-500 leading-relaxed">{desc}</p>
  </div>
);

// A concept / design note row
const ConceptRow = ({ label, children }) => (
  <div className="flex gap-3 items-start px-5 py-3.5 border-b border-zinc-800/50 last:border-b-0">
    <span className="text-[10px] font-bold font-mono text-zinc-600 uppercase tracking-widest mt-0.5 w-24 shrink-0">{label}</span>
    <p className="text-[11px] text-zinc-400 leading-relaxed">{children}</p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// DocsPage
// ─────────────────────────────────────────────────────────────────────────────
const DocsPage = () => {
  const [activeSection, setActiveSection] = useState("overview");

  const scrollToSection = (id) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el)
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.pageYOffset - 90,
        behavior: "smooth",
      });
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.pageYOffset + 130;
      for (let i = SECTIONS.length - 1; i >= 0; i--) {
        const el = document.getElementById(SECTIONS[i].id);
        if (el && el.offsetTop <= scrollY) {
          setActiveSection(SECTIONS[i].id);
          break;
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#06060a] text-zinc-200 font-sans">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative pt-24 pb-14 px-6 overflow-hidden border-b border-zinc-800/60">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.3) 1px,transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#06060a] to-transparent" />

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/8 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-5">
            <Code2 size={11} />
            Smart Contracts
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight leading-tight">
            Contract<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
              Documentation
            </span>
          </h1>
          <p className="text-base text-zinc-500 max-w-lg leading-relaxed mb-8">
            A complete reference for every smart contract powering ByteStrike —
            what each one does, how they fit together, and the functions you can call.
          </p>

          <div className="flex items-center gap-6 text-[11px] font-mono text-zinc-600">
            {[
              { dot: "bg-blue-500",    text: "Solidity 0.8.28"  },
              { dot: "bg-emerald-500", text: "Sepolia Testnet"   },
              { dot: "bg-zinc-500",    text: "UUPS Upgradeable"  },
            ].map(({ dot, text }) => (
              <div key={text} className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-12 flex gap-10">

        {/* Sidebar */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-24">
            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-3 px-1">
              Contracts
            </p>
            <nav className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-px bg-zinc-800" />
              <div className="space-y-0.5">
                {SECTIONS.map(({ id, number, label }) => {
                  const active = activeSection === id;
                  return (
                    <button
                      key={id}
                      onClick={() => scrollToSection(id)}
                      className={`w-full flex items-center gap-3 pl-4 pr-2 py-2 text-left transition-colors relative ${
                        active ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {active && (
                        <div className="absolute left-0 top-0 bottom-0 w-px bg-blue-500" />
                      )}
                      <span className="text-[9px] font-mono font-bold text-zinc-700 tabular-nums w-4 shrink-0">
                        {number}
                      </span>
                      <span className="text-[11px] font-medium">{label}</span>
                      {active && (
                        <ChevronRight size={10} className="ml-auto text-blue-500 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-16 max-w-2xl">

          {/* ── 00 Architecture Overview ─────────────────────────────────── */}
          <section id="overview" className="scroll-mt-24">
            <SectionHeading number="00" icon={Layers}>Architecture Overview</SectionHeading>
            <p className="text-xs text-zinc-500 mb-5 leading-relaxed">
              All contracts work together through a central orchestrator. The diagram below shows the call flow.
            </p>

            {/* ASCII-style flow card */}
            <Card className="mb-4">
              <div className="p-5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-4">Contract Interaction Flow</p>
                <div className="font-mono text-[11px] leading-6 text-zinc-400 space-y-0.5">
                  <div className="text-blue-300 font-bold">ClearingHouse <span className="text-zinc-600 font-normal">(UUPS Proxy — central orchestrator)</span></div>
                  <div className="pl-4 text-zinc-500">├── <span className="text-zinc-300">CollateralVault</span> <span className="text-zinc-600">— multi-collateral custody</span></div>
                  <div className="pl-4 text-zinc-500">├── <span className="text-zinc-300">MarketRegistry</span> <span className="text-zinc-600">— market config &amp; routing</span></div>
                  <div className="pl-4 text-zinc-500">├── <span className="text-zinc-300">vAMM</span> <span className="text-zinc-600">— one per market, constant-product AMM</span></div>
                  <div className="pl-4 text-zinc-500">├── <span className="text-zinc-300">FeeRouter</span> <span className="text-zinc-600">— splits fees per quote token</span></div>
                  <div className="pl-4 text-zinc-500">└── <span className="text-zinc-300">InsuranceFund</span> <span className="text-zinc-600">— bad-debt backstop</span></div>
                </div>
              </div>
            </Card>

            <div className="grid sm:grid-cols-2 gap-3">
              <CardAccent color="blue">
                <p className="text-[10px] font-bold text-blue-300 uppercase tracking-wider mb-1">Upgradeability</p>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  ClearingHouse and vAMM are <strong className="text-zinc-200">UUPS upgradeable proxies</strong>. All other contracts are non-upgradeable and are replaced by deploying new instances if needed.
                </p>
              </CardAccent>
              <CardAccent color="green">
                <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider mb-1">Precision</p>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  All internal values use <strong className="text-zinc-200">1e18 (WAD)</strong> precision. Conversions between raw token amounts and WAD happen only at the boundaries of external calls.
                </p>
              </CardAccent>
            </div>
          </section>

          {/* ── 01 ClearingHouse ─────────────────────────────────────────── */}
          <section id="clearinghouse" className="scroll-mt-24">
            <SectionHeading number="01" icon={ArrowLeftRight}>ClearingHouse</SectionHeading>
            <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
              The ClearingHouse is the single entry point for all trading activity. It manages user positions, enforces margin requirements, routes fees, and coordinates liquidations. No funds flow directly through it — it delegates custody to the CollateralVault and execution to the vAMM.
            </p>

            <Card className="mb-4">
              <div className="p-4 border-b border-zinc-800/50">
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-0">Key Concepts</p>
              </div>
              <ConceptRow label="Positions">
                Each user has one isolated position per market, stored as <code className="text-[10px] font-mono text-zinc-300">PositionView</code>: size, margin, entry price, and a funding accumulator snapshot.
              </ConceptRow>
              <ConceptRow label="Margin">
                Reserved margin is tracked globally per user across all active markets. Withdrawals are blocked if they would leave any position under-margined.
              </ConceptRow>
              <ConceptRow label="IMR / MMR">
                <strong className="text-zinc-200">Initial Margin Ratio</strong> (default 5%) is enforced on open or increase. <strong className="text-zinc-200">Maintenance Margin Ratio</strong> (default 2.5%) determines the liquidation threshold. Both are set per market in basis points.
              </ConceptRow>
              <ConceptRow label="Funding">
                Funding must be settled before any position modification. It is calculated by the vAMM and applied as a positive or negative cash adjustment to the user's margin.
              </ConceptRow>
              <ConceptRow label="Liquidation">
                Full liquidation only — no partial. A whitelisted liquidator closes the position, takes a reward, and any shortfall is covered by the InsuranceFund.
              </ConceptRow>
            </Card>

            <Card>
              <div className="p-4 border-b border-zinc-800/50">
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Core Functions</p>
              </div>
              <FnRow
                name="deposit"
                params="token, amount"
                desc="Deposits an ERC20 token into the CollateralVault on behalf of the caller. The vault records the balance; the ClearingHouse emits a collateralDeposited event."
              />
              <FnRow
                name="withdraw"
                params="token, amount"
                desc="Withdraws collateral, but only if the user's remaining vault balance still covers all reserved margin across every active market. Checks all positions for post-withdrawal liquidatability."
              />
              <FnRow
                name="openPosition"
                params="marketId, isLong, size, margin"
                desc="Opens a new perpetual position (or increases an existing one). Settles any pending funding, checks IMR, pulls margin into reserve, then calls the vAMM to execute the swap."
              />
              <FnRow
                name="closePosition"
                params="marketId"
                desc="Closes the caller's entire position in the given market. Settles funding, executes the inverse swap on the vAMM, realizes PnL, and releases reserved margin back to the vault."
              />
              <FnRow
                name="addMargin"
                params="marketId, amount"
                desc="Adds extra margin to an existing position without changing its size, reducing leverage and improving the liquidation price."
              />
              <FnRow
                name="removeMargin"
                params="marketId, amount"
                desc="Withdraws excess margin from a position, provided IMR is still satisfied after removal."
              />
              <FnRow
                name="liquidate"
                params="account, marketId"
                desc="Callable only by whitelisted liquidators. Closes an under-margined position, distributes the liquidation penalty between the liquidator and the FeeRouter, and covers any bad debt via the InsuranceFund."
              />
              <FnRow
                name="setRiskParams"
                params="marketId, MarketRiskParams"
                desc="Admin function. Configures IMR, MMR, liquidation penalty BPS, penalty cap, and position size limits for a market."
              />
              <FnRow
                name="setVault"
                params="newVault"
                desc="Admin function. Migrates the protocol to a new CollateralVault address (e.g., after a vault upgrade)."
              />
            </Card>
          </section>

          {/* ── 02 vAMM ──────────────────────────────────────────────────── */}
          <section id="vamm" className="scroll-mt-24">
            <SectionHeading number="02" icon={BarChart2}>vAMM</SectionHeading>
            <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
              One vAMM is deployed per market. It holds virtual reserves — no real tokens — and uses Uniswap V2 constant-product math (<code className="text-[10px] font-mono text-zinc-300">x × y = k</code>) to determine trade prices. It also maintains a TWAP for funding rate calculations.
            </p>

            <Card className="mb-4">
              <div className="p-4 border-b border-zinc-800/50">
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Key Concepts</p>
              </div>
              <ConceptRow label="Reserves">
                <code className="text-[10px] font-mono text-zinc-300">reserveBase</code> (X) and <code className="text-[10px] font-mono text-zinc-300">reserveQuote</code> (Y) are the virtual liquidity pools. Price = Y / X. Trades move both reserves while preserving k = X × Y.
              </ConceptRow>
              <ConceptRow label="Fee on Input">
                A configurable fee (in BPS, e.g. 10 = 0.1%) is deducted from the input token before the swap is computed. Fees accumulate via a fee-growth-global accounting similar to Uniswap V3.
              </ConceptRow>
              <ConceptRow label="TWAP">
                A 64-slot ring buffer of <code className="text-[10px] font-mono text-zinc-300">(timestamp, priceCumulativeX128)</code> observations provides a time-weighted average price. The default window is 1 hour.
              </ConceptRow>
              <ConceptRow label="Funding Rate">
                Each <code className="text-[10px] font-mono text-zinc-300">pokeFunding</code> call computes (vAMM TWAP − Oracle price) / Oracle price, clamps it to the per-hour limit, scales by <code className="text-[10px] font-mono text-zinc-300">kFundingX18</code>, and accumulates it into <code className="text-[10px] font-mono text-zinc-300">_cumulativeFundingPerUnitX18</code>.
              </ConceptRow>
              <ConceptRow label="Reserve Protection">
                Minimum reserve floors (<code className="text-[10px] font-mono text-zinc-300">minReserveBase</code>, <code className="text-[10px] font-mono text-zinc-300">minReserveQuote</code>) prevent total reserve depletion. Price change on <code className="text-[10px] font-mono text-zinc-300">resetReserves</code> is capped at 10% (1000 BPS).
              </ConceptRow>
            </Card>

            <Card>
              <div className="p-4 border-b border-zinc-800/50">
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Core Functions</p>
              </div>
              <FnRow
                name="swap"
                params="isLong, size"
                returns="baseDelta, quoteDelta"
                desc="Called only by ClearingHouse. Executes a virtual buy (isLong=true) or sell (isLong=false), applies the fee on input, updates reserves, records a TWAP observation, and returns the base and quote deltas."
              />
              <FnRow
                name="pokeFunding"
                returns="fundingRateX18"
                desc="Computes the latest funding rate from TWAP vs oracle, updates the cumulative funding accumulator, and emits a FundingPoked event. Can be called by anyone; ClearingHouse calls it before every position mutation."
              />
              <FnRow
                name="getFundingPayment"
                params="size, entryFundingAccX18"
                returns="int256 payment"
                desc="Returns the unsettled funding payment for a position of the given size that was opened when the accumulator was at entryFundingAccX18."
              />
              <FnRow
                name="getTWAP"
                params="window (seconds)"
                returns="uint256 priceX18"
                desc="Returns the time-weighted average price over the requested window using the ring-buffer observations."
              />
              <FnRow
                name="getMarkPrice"
                returns="uint256 priceX18"
                desc="Returns the current instantaneous mark price (reserveQuote / reserveBase)."
              />
              <FnRow
                name="resetReserves"
                params="newBaseReserve, newQuoteReserve"
                desc="Owner-only. Re-initializes the reserves (e.g. after a large oracle divergence), subject to the 10% max price change guard."
              />
              <FnRow
                name="setParams"
                params="feeBps, frMaxBpsPerHour, kFundingX18, observationWindow"
                desc="Owner-only. Updates the fee rate, funding rate clamp, funding scaling factor, and TWAP observation window."
              />
            </Card>
          </section>

          {/* ── 03 CollateralVault ───────────────────────────────────────── */}
          <section id="collateralvault" className="scroll-mt-24">
            <SectionHeading number="03" icon={Landmark}>CollateralVault</SectionHeading>
            <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
              The CollateralVault is the sole custodian of user funds. It supports multiple ERC20 collateral tokens, each with independent risk parameters (haircut, deposit cap, pause flag). Only the ClearingHouse can initiate outflows.
            </p>

            <Card className="mb-4">
              <div className="p-4 border-b border-zinc-800/50">
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Key Concepts</p>
              </div>
              <ConceptRow label="Collateral Config">
                Each registered token has a <code className="text-[10px] font-mono text-zinc-300">CollateralConfig</code>: oracle symbol, haircut BPS (discount applied to value), deposit cap, decimals, and a per-token pause flag.
              </ConceptRow>
              <ConceptRow label="Haircut">
                A haircut (e.g. 10%) reduces the value credited to the user. A 1 WETH deposit at $2000 with a 10% haircut counts as $1800 of margin capacity.
              </ConceptRow>
              <ConceptRow label="Fee-on-Transfer">
                Deposits use the balance-delta pattern: actual received = <code className="text-[10px] font-mono text-zinc-300">balanceAfter − balanceBefore</code>. This handles fee-on-transfer tokens correctly.
              </ConceptRow>
              <ConceptRow label="Valuation">
                <code className="text-[10px] font-mono text-zinc-300">getAccountCollateralValueX18</code> iterates all registered tokens, prices each via the Oracle, applies the haircut, and sums to a single WAD value.
              </ConceptRow>
            </Card>

            <Card>
              <div className="p-4 border-b border-zinc-800/50">
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Core Functions</p>
              </div>
              <FnRow
                name="deposit"
                params="token, amount, user"
                desc="Transfers token from user to vault using balance-delta accounting. Records the actual received amount in userBalances[user][token]."
              />
              <FnRow
                name="withdrawFor"
                params="token, amount, user"
                returns="received"
                desc="ClearingHouse-only. Transfers the requested amount to the user and returns the actual amount sent (handles fee-on-transfer tokens)."
              />
              <FnRow
                name="seize"
                params="token, amount, from, to"
                desc="ClearingHouse-only. Moves funds from one user's balance to another (used during liquidation to transfer margin to the liquidator)."
              />
              <FnRow
                name="sweepFees"
                params="token, to"
                desc="ClearingHouse-only. Transfers accumulated protocol fees for a token to the given address."
              />
              <FnRow
                name="getAccountCollateralValueX18"
                params="user"
                returns="uint256 valueX18"
                desc="Returns the total haircut-adjusted USD value of all collateral held by the user, in WAD precision."
              />
              <FnRow
                name="registerCollateral"
                params="token, CollateralConfig"
                desc="Admin function. Whitelists a new ERC20 token as accepted collateral and sets its risk parameters."
              />
              <FnRow
                name="updateCollateralConfig"
                params="token, CollateralConfig"
                desc="Admin function. Updates the risk parameters for an already-registered collateral token."
              />
            </Card>
          </section>

          {/* ── 04 MarketRegistry ────────────────────────────────────────── */}
          <section id="marketregistry" className="scroll-mt-24">
            <SectionHeading number="04" icon={BookOpen}>MarketRegistry</SectionHeading>
            <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
              The MarketRegistry is the source of truth for every listed market. It stores the vAMM address, oracle address, fee router, insurance fund, and trade-fee configuration for each <code className="text-[10px] font-mono text-zinc-300">bytes32 marketId</code>.
            </p>

            <Card className="mb-4">
              <div className="p-4 border-b border-zinc-800/50">
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Roles</p>
              </div>
              <ConceptRow label="MARKET_ADMIN">Adds new markets and re-enables paused ones.</ConceptRow>
              <ConceptRow label="PARAM_ADMIN">Updates fee parameters on existing markets.</ConceptRow>
              <ConceptRow label="PAUSE_GUARDIAN">Pauses markets quickly without full admin rights. Trade fee is capped at 3% (300 BPS).</ConceptRow>
            </Card>

            <Card>
              <div className="p-4 border-b border-zinc-800/50">
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Core Functions</p>
              </div>
              <FnRow
                name="addMarket"
                params="AddMarketConfig"
                desc="Registers a new perpetual market. Config includes: marketId, vamm, oracle, feeRouter, insuranceFund, baseAsset, quoteAsset, baseSymbol, feeBps, and a paused flag. marketId must be unique."
              />
              <FnRow
                name="updateMarketParams"
                params="marketId, feeBps"
                desc="PARAM_ADMIN only. Updates the trade fee for an existing market (capped at 300 BPS)."
              />
              <FnRow
                name="setMarketPaused"
                params="marketId, paused"
                desc="PAUSE_GUARDIAN or MARKET_ADMIN. Pauses or resumes trading on a market."
              />
              <FnRow
                name="getMarket"
                params="marketId"
                returns="Market"
                desc="Returns the full Market struct: vamm, oracle, feeRouter, insuranceFund, baseAsset, quoteAsset, feeBps, paused status, and symbol."
              />
            </Card>
          </section>

          {/* ── 05 FeeRouter ─────────────────────────────────────────────── */}
          <section id="feerouter" className="scroll-mt-24">
            <SectionHeading number="05" icon={ArrowLeftRight}>FeeRouter</SectionHeading>
            <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
              One FeeRouter is deployed per quote token. When ClearingHouse collects a trade fee or liquidation penalty, it transfers the tokens to the FeeRouter and then calls the appropriate routing hook. The router splits the amount between the InsuranceFund and a treasury address according to governance-set BPS splits.
            </p>

            <Card className="mb-4">
              <div className="p-4 border-b border-zinc-800/50">
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Key Concepts</p>
              </div>
              <ConceptRow label="tradeToFundBps">Fraction of trade fees sent to the InsuranceFund (e.g. 5000 = 50%). The remainder goes to treasury.</ConceptRow>
              <ConceptRow label="liqToFundBps">Fraction of liquidation penalties sent to InsuranceFund. Remainder goes to treasury.</ConceptRow>
              <ConceptRow label="Treasury">The <code className="text-[10px] font-mono text-zinc-300">treasuryAdmin</code> address can pull accumulated treasury share at any time via <code className="text-[10px] font-mono text-zinc-300">withdrawTreasury</code>.</ConceptRow>
            </Card>

            <Card>
              <div className="p-4 border-b border-zinc-800/50">
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Core Functions</p>
              </div>
              <FnRow
                name="onTradeFee"
                params="amount"
                desc="ClearingHouse-only. Routes the given amount: sends tradeToFundBps fraction to InsuranceFund (via onFeeReceived), retains the rest as treasury."
              />
              <FnRow
                name="onLiquidationPenalty"
                params="amount"
                desc="ClearingHouse-only. Routes the liquidation penalty using the liqToFundBps split."
              />
              <FnRow
                name="withdrawTreasury"
                params="to, amount"
                desc="Treasury admin only. Withdraws accumulated treasury share to the specified address."
              />
              <FnRow
                name="setSplits"
                params="tradeToFundBps, liqToFundBps"
                desc="Owner only. Updates the fee split ratios (each capped at 10000 BPS)."
              />
            </Card>
          </section>

          {/* ── 06 InsuranceFund ─────────────────────────────────────────── */}
          <section id="insurancefund" className="scroll-mt-24">
            <SectionHeading number="06" icon={ShieldCheck}>InsuranceFund</SectionHeading>
            <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
              The InsuranceFund is a single-token ERC20 reserve that absorbs bad debt from liquidations. It receives a share of all trade fees and liquidation penalties. When a liquidation results in a shortfall, ClearingHouse calls <code className="text-[10px] font-mono text-zinc-300">payBadDebt</code> and the fund pays what it can without reverting.
            </p>

            <Card className="mb-4">
              <div className="p-4 border-b border-zinc-800/50">
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Key Concepts</p>
              </div>
              <ConceptRow label="Graceful Degradation">
                If the fund cannot cover the full bad debt, it pays the available balance and ClearingHouse records the remaining shortfall as <code className="text-[10px] font-mono text-zinc-300">totalBadDebt</code> — it never reverts a liquidation.
              </ConceptRow>
              <ConceptRow label="Authorization">
                Only registered routers can push fees (<code className="text-[10px] font-mono text-zinc-300">onFeeReceived</code>). Only authorized modules (ClearingHouse) can request payouts (<code className="text-[10px] font-mono text-zinc-300">payBadDebt</code>).
              </ConceptRow>
              <ConceptRow label="Pull Pattern">
                <code className="text-[10px] font-mono text-zinc-300">onFeeReceived</code> uses a balance-delta check to verify actual token receipt, preventing spoofed accounting.
              </ConceptRow>
            </Card>

            <Card>
              <div className="p-4 border-b border-zinc-800/50">
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Core Functions</p>
              </div>
              <FnRow
                name="onFeeReceived"
                params="amount"
                desc="Called by an authorized FeeRouter after transferring tokens. Verifies receipt via balance delta and updates internal accounting."
              />
              <FnRow
                name="payBadDebt"
                params="amount, recipient"
                returns="uint256 paid"
                desc="Called by ClearingHouse during liquidation. Transfers min(balance, amount) to the recipient and returns the actual amount paid."
              />
              <FnRow
                name="addRouter"
                params="router"
                desc="Owner only. Authorizes a FeeRouter to push fees into the fund."
              />
              <FnRow
                name="addAuthorized"
                params="module"
                desc="Owner only. Authorizes a module (e.g. ClearingHouse) to request bad-debt payouts."
              />
              <FnRow
                name="balance"
                returns="uint256"
                desc="Returns the current token balance of the fund."
              />
            </Card>
          </section>

          {/* ── 07 Oracle System ─────────────────────────────────────────── */}
          <section id="oracle" className="scroll-mt-24">
            <SectionHeading number="07" icon={Cpu}>Oracle System</SectionHeading>
            <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
              ByteStrike uses a layered oracle design. Chainlink feeds back ETH and major assets; a custom <strong className="text-zinc-200">CuOracle</strong> provides GPU compute prices via a commit-reveal scheme to prevent sandwich attacks.
            </p>

            <div className="space-y-3 mb-4">
              <Card>
                <div className="p-4 border-b border-zinc-800/50">
                  <div className="flex items-center gap-2">
                    <Circle size={8} className="fill-blue-400 text-blue-400" />
                    <p className="text-xs font-bold text-white">Oracle.sol — Chainlink Wrapper</p>
                  </div>
                </div>
                <div>
                  <ConceptRow label="Purpose">Wraps Chainlink AggregatorV3 feeds. Validates staleness (max age configurable), checks for zero/negative prices, and returns a WAD-scaled price by symbol string.</ConceptRow>
                  <FnRow
                    name="getPrice"
                    params="symbol"
                    returns="uint256 priceX18"
                    desc="Looks up the registered Chainlink feed for the symbol, reads latestRoundData, applies staleness check, and returns the price in 1e18 precision."
                  />
                  <FnRow
                    name="setFeed"
                    params="symbol, feedAddress, maxAge"
                    desc="Admin only. Registers or updates a Chainlink aggregator feed for a given symbol string."
                  />
                </div>
              </Card>

              <Card>
                <div className="p-4 border-b border-zinc-800/50">
                  <div className="flex items-center gap-2">
                    <Circle size={8} className="fill-purple-400 text-purple-400" />
                    <p className="text-xs font-bold text-white">CuOracle.sol — Commit-Reveal GPU Price Oracle</p>
                  </div>
                </div>
                <div>
                  <ConceptRow label="Commit-Reveal">
                    The operator first commits <code className="text-[10px] font-mono text-zinc-300">keccak256(price, nonce)</code> and later reveals the price+nonce in a separate transaction. A minimum delay between commit and reveal (configurable) prevents front-running.
                  </ConceptRow>
                  <ConceptRow label="Assets">
                    Supports multiple GPU asset IDs (e.g. <code className="text-[10px] font-mono text-zinc-300">H100</code>, <code className="text-[10px] font-mono text-zinc-300">H200</code>). Each asset must be registered before use.
                  </ConceptRow>
                  <FnRow
                    name="commitPrice"
                    params="assetId, commitHash"
                    desc="Stores the price commitment hash for an asset. Enforces minimum time between commits for the same asset."
                  />
                  <FnRow
                    name="revealPrice"
                    params="assetId, price, nonce"
                    desc="Validates the reveal against the stored commit hash (after the required delay). Updates the latest price and timestamp on success."
                  />
                  <FnRow
                    name="getPrice"
                    params="assetId"
                    returns="uint256 priceX18, uint256 updatedAt"
                    desc="Returns the latest revealed price and its timestamp. Reverts if the asset is not registered or has no price."
                  />
                </div>
              </Card>

              <Card>
                <div className="p-4 border-b border-zinc-800/50">
                  <div className="flex items-center gap-2">
                    <Circle size={8} className="fill-emerald-400 text-emerald-400" />
                    <p className="text-xs font-bold text-white">MultiAssetOracle.sol — Aggregated Price Source</p>
                  </div>
                </div>
                <div>
                  <ConceptRow label="Purpose">
                    Aggregates prices from multiple underlying oracle sources (Chainlink feeds, CuOracle) into a single contract with a unified <code className="text-[10px] font-mono text-zinc-300">getPrice(symbol)</code> interface. Supports per-symbol source configuration.
                  </ConceptRow>
                  <FnRow
                    name="getPrice"
                    params="symbol"
                    returns="uint256 priceX18"
                    desc="Routes the price query to the registered source for the given symbol and returns the WAD-scaled result."
                  />
                </div>
              </Card>
            </div>

            <CardAccent color="amber">
              <p className="text-[11px] text-amber-300/80 leading-relaxed">
                <strong className="text-amber-200">CuOracleAdapter</strong> and <strong className="text-amber-200">MultiAssetOracleAdapter</strong> are thin wrappers that implement the <code className="text-[10px] font-mono text-amber-200">IOracle</code> interface, allowing any oracle variant to plug into the ClearingHouse and CollateralVault without contract changes.
              </p>
            </CardAccent>
          </section>

          {/* ── 08 Calculations Library ──────────────────────────────────── */}
          <section id="calculations" className="scroll-mt-24">
            <SectionHeading number="08" icon={Calculator}>Calculations Library</SectionHeading>
            <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
              A pure Solidity library providing overflow-safe fixed-point arithmetic at 1e18 (WAD) precision. Used by ClearingHouse and vAMM for all price and value math.
            </p>

            <Card>
              <div className="p-4 border-b border-zinc-800/50">
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Functions</p>
              </div>
              <FnRow
                name="mul"
                params="a, b"
                returns="(a × b) / 1e18"
                desc="Multiplies two WAD numbers. Checks for overflow before multiplying, then divides by 1e18 to restore WAD scale."
              />
              <FnRow
                name="div"
                params="a, b"
                returns="(a × 1e18) / b"
                desc="Divides two WAD numbers. Scales the numerator by 1e18 first, then divides. Reverts on division by zero or overflow."
              />
              <FnRow
                name="mulDiv"
                params="a, b, denominator"
                returns="(a × b) / denominator"
                desc="Full-precision multiply-then-divide using 512-bit intermediate arithmetic. Used for price cumulative calculations in the TWAP."
              />
              <FnRow
                name="sqrt"
                params="x"
                returns="uint256"
                desc="Integer square root via Newton-Raphson iteration. Used for initial reserve seeding."
              />
              <FnRow
                name="toWad"
                params="a"
                returns="a × 1e18"
                desc="Converts a plain integer to WAD precision. Reverts on overflow."
              />
              <FnRow
                name="fromWad"
                params="a"
                returns="a / 1e18"
                desc="Converts a WAD number back to a plain integer (truncates fractional part)."
              />
            </Card>

            <div className="mt-4">
              <CardAccent color="purple">
                <p className="text-[10px] font-bold text-purple-300 uppercase tracking-wider mb-1">Design Note</p>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  All arithmetic reverts on overflow/underflow rather than wrapping. There are no unchecked blocks — correctness is favored over gas savings at the library level.
                </p>
              </CardAccent>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
};

export default DocsPage;
