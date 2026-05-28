import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

// ─── Sidebar nav ────────────────────────────────────────────────────────────
const SECTIONS = [
  { id: "overview",      number: "00", label: "Architecture Overview" },
  { id: "clearinghouse", number: "01", label: "ClearingHouse"         },
  { id: "insurancefund", number: "02", label: "InsuranceFund"         },
  { id: "oracle",        number: "03", label: "Oracle System"         },
  { id: "calculations",  number: "04", label: "Calculations Library"  },
];

// ─── Primitives ─────────────────────────────────────────────────────────────

/** Inline code */
const C = ({ children }) => (
  <code className="font-mono text-[13px] bg-zinc-800 text-zinc-100 px-1.5 py-0.5 rounded">
    {children}
  </code>
);

/** Section heading */
const H2 = ({ children }) => (
  <h2 className="text-[1.25rem] font-semibold text-white tracking-tight mb-3">{children}</h2>
);

/** Sub-heading (FUNCTIONS / KEY CONCEPTS) */
const H3 = ({ children }) => (
  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">{children}</p>
);

/** Horizontal rule placed under H2 */
const Rule = () => <div className="w-8 h-px bg-zinc-700 mb-6" />;

/** Fade-up animation variant for sections */
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

/**
 * Function documentation block.
 * signature – full Solidity-style signature string
 * returns   – optional return type string
 * description – plain text description
 * params    – array of { name, type, desc }
 */
const FnBlock = ({ signature, returns, description, params }) => (
  <div className="border border-zinc-800 hover:border-zinc-700 rounded-lg overflow-hidden mb-4 text-sm transition-colors duration-200">
    {/* Signature bar */}
    <div className="bg-[#111118] px-4 py-3 border-b border-zinc-800 flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <code className="font-mono text-[13px] text-blue-300 break-all">{signature}</code>
      {returns && (
        <code className="font-mono text-[13px] text-zinc-400 shrink-0">→ {returns}</code>
      )}
    </div>

    {/* Body */}
    <div className="px-4 py-3.5 bg-[#0c0c12] space-y-4">
      <p className="text-zinc-300 leading-relaxed">{description}</p>

      {params && params.length > 0 && (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left pb-2 pr-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-36">
                Parameter
              </th>
              <th className="text-left pb-2 pr-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-36">
                Type
              </th>
              <th className="text-left pb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {params.map(({ name, type, desc }) => (
              <tr key={name} className="border-b border-zinc-800/40 last:border-0">
                <td className="py-2 pr-4 align-top">
                  <code className="font-mono text-[12px] text-blue-300">{name}</code>
                </td>
                <td className="py-2 pr-4 align-top">
                  <code className="font-mono text-[12px] text-zinc-400">{type}</code>
                </td>
                <td className="py-2 text-zinc-300 text-[13px] leading-relaxed align-top">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </div>
);

/**
 * Key-concept / term table row.
 * Wrap multiple <Term> in a <table> with <tbody>.
 */
const Term = ({ term, children }) => (
  <tr className="border-b border-zinc-800/50 last:border-0">
    <td className="py-3.5 pl-4 pr-6 align-top whitespace-nowrap">
      <code className="font-mono text-[12px] text-zinc-200">{term}</code>
    </td>
    <td className="py-3.5 pl-2 pr-4 text-sm text-zinc-300 leading-relaxed">{children}</td>
  </tr>
);

/** Concepts wrapper table */
const TermTable = ({ children }) => (
  <div className="border border-zinc-800 rounded-lg overflow-hidden mb-8">
    <table className="w-full border-collapse">
      <tbody>{children}</tbody>
    </table>
  </div>
);

/** Info / warning callout — border-left style */
const Note = ({ color = "blue", label, children }) => {
  const palette = {
    blue:   { border: "border-l-blue-500",   bg: "bg-blue-500/[0.07]",   label: "text-blue-400",   body: "text-zinc-300" },
    amber:  { border: "border-l-amber-500",  bg: "bg-amber-500/[0.07]",  label: "text-amber-400",  body: "text-zinc-300" },
    green:  { border: "border-l-green-500",  bg: "bg-green-500/[0.07]",  label: "text-green-400",  body: "text-zinc-300" },
    purple: { border: "border-l-purple-500", bg: "bg-purple-500/[0.07]", label: "text-purple-400", body: "text-zinc-300" },
  };
  const p = palette[color] ?? palette.blue;
  return (
    <div className={`border-l-2 ${p.border} ${p.bg} pl-4 pr-4 py-3 rounded-r-md`}>
      {label && (
        <p className={`text-xs font-semibold uppercase tracking-wider ${p.label} mb-1`}>{label}</p>
      )}
      <p className={`text-sm leading-relaxed ${p.body}`}>{children}</p>
    </div>
  );
};

// ─── Page ───────────────────────────────────────────────────────────────────
const DocsPage = () => {
  const [activeSection, setActiveSection] = useState("overview");

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.pageYOffset - 72,
        behavior: "smooth",
      });
    }
    setActiveSection(id);
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.pageYOffset + 110;
      for (let i = SECTIONS.length - 1; i >= 0; i--) {
        const el = document.getElementById(SECTIONS[i].id);
        if (el && el.offsetTop <= scrollY) {
          setActiveSection(SECTIONS[i].id);
          break;
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Scroll to hash on initial load (e.g. /docs#clearinghouse)
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      // Wait a tick for the page to render fully
      const raf = requestAnimationFrame(() => {
        scrollToSection(hash);
      });
      return () => cancelAnimationFrame(raf);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-300">

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="border-b border-zinc-800/60 pt-20 pb-8 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <p className="text-xs text-zinc-500 mb-4 font-mono">
              ByteStrike Protocol&nbsp;&nbsp;/&nbsp;&nbsp;Contracts
            </p>
            <h1 className="text-2xl font-semibold text-white tracking-tight mb-2">
              Contract Reference
            </h1>
            <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Complete reference for all smart contracts in the ByteStrike perpetuals protocol.
              Covers architecture, function signatures, parameters, and design decisions.
            </p>
          </motion.div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 flex gap-12 py-10">

        {/* Sidebar */}
        <aside className="hidden lg:block w-52 flex-shrink-0">
          <motion.div
            className="sticky top-20"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, ease: "easeOut", delay: 0.1 }}
          >
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 px-3">
              Contracts
            </p>
            <nav className="space-y-0.5">
              {SECTIONS.map(({ id, number, label }) => {
                const active = activeSection === id;
                return (
                  <button
                    key={id}
                    onClick={() => scrollToSection(id)}
                    className={`w-full text-left flex items-center gap-2.5 px-3 py-1.5 rounded text-sm transition-all duration-150 ${
                      active
                        ? "bg-blue-500/10 text-white"
                        : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className="font-mono text-[10px] text-zinc-600 tabular-nums shrink-0">
                      {number}
                    </span>
                    <span className={active ? "font-medium" : ""}>{label}</span>
                  </button>
                );
              })}
            </nav>
          </motion.div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-16">

          {/* ── 00 Architecture Overview ───────────────────────────────── */}
          <motion.section
            id="overview"
            className="scroll-mt-20"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            <H2>Architecture Overview</H2>
            <Rule />
            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
              ByteStrike is a non-custodial perpetual futures protocol. All contracts interact
              through a central orchestrator. User funds never flow directly through the
              ClearingHouse - it delegates custody to the CollateralVault and price discovery
              to each market's vAMM.
            </p>

            {/* Dependency graph */}
            <div className="bg-[#0d0d14] border border-zinc-800 rounded-lg p-5 mb-6 font-mono text-sm leading-7">
              <p className="text-xs text-zinc-600 uppercase tracking-wider mb-4">
                Dependency Graph
              </p>
              <div className="text-zinc-400 space-y-0.5">
                <div>
                  <span className="text-white font-semibold">ClearingHouse</span>
                  <span className="text-zinc-600 ml-2">— UUPS Proxy, central orchestrator</span>
                </div>
                <div className="ml-4">
                  ├── <span className="text-zinc-200">CollateralVault</span>
                  <span className="text-zinc-600 ml-2">— multi-token collateral custody</span>
                </div>
                <div className="ml-4">
                  ├── <span className="text-zinc-200">MarketRegistry</span>
                  <span className="text-zinc-600 ml-2">— market config &amp; routing</span>
                </div>
                <div className="ml-4">
                  ├── <span className="text-zinc-200">vAMM</span>
                  <span className="text-zinc-600 ml-2">— one per market, constant-product AMM</span>
                </div>
                <div className="ml-4">
                  ├── <span className="text-zinc-200">FeeRouter</span>
                  <span className="text-zinc-600 ml-2">— splits fees per quote token</span>
                </div>
                <div className="ml-4">
                  └── <span className="text-zinc-200">InsuranceFund</span>
                  <span className="text-zinc-600 ml-2">— bad-debt backstop</span>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Note color="blue" label="Upgradeability">
                ClearingHouse and vAMM are UUPS upgradeable proxies. All other contracts are
                non-upgradeable and replaced by redeployment when changes are needed.
              </Note>
              <Note color="green" label="Precision">
                All internal values use 1e18 (WAD) precision. Token↔WAD conversions occur
                only at the boundaries of external calls.
              </Note>
            </div>
          </motion.section>

          {/* ── 01 ClearingHouse ───────────────────────────────────────── */}
          <motion.section id="clearinghouse" className="scroll-mt-20" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}>
            <H2>ClearingHouse</H2>
            <Rule />
            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
              The single entry point for all trading activity. Manages user positions, enforces
              margin requirements, routes fees, and coordinates liquidations. Delegates fund
              custody to CollateralVault and trade execution to each market's vAMM.
            </p>

            <H3>Key Concepts</H3>
            <TermTable>
              <Term term="PositionView">
                Per-user, per-market struct: size, margin, entry price, and a funding
                accumulator snapshot.
              </Term>
              <Term term="Reserved Margin">
                Tracked globally per user across all active markets. Withdrawals are blocked
                if they would leave any position under-margined.
              </Term>
              <Term term="IMR / MMR">
                Initial Margin Ratio (default 5%) is enforced on open or increase. Maintenance
                Margin Ratio (default 2.5%) is the liquidation threshold. Both are configured
                per market in basis points.
              </Term>
              <Term term="Funding">
                Settled before any position mutation. The vAMM computes the payment;
                ClearingHouse applies it as a signed cash adjustment to the user's margin.
              </Term>
              <Term term="Liquidation">
                Full-position only — no partial liquidations. Whitelisted liquidators close
                the position, take a reward, and any shortfall is covered by InsuranceFund.
              </Term>
            </TermTable>

            <H3>Functions</H3>

            <FnBlock
              signature="deposit(address token, uint256 amount)"
              description="Deposits an ERC20 token into the CollateralVault on behalf of the caller. The vault records the balance; ClearingHouse emits a collateralDeposited event."
              params={[
                { name: "token",  type: "address", desc: "Address of the ERC20 collateral token." },
                { name: "amount", type: "uint256", desc: "Amount to deposit in token decimals." },
              ]}
            />

            <FnBlock
              signature="withdraw(address token, uint256 amount)"
              description="Withdraws collateral. Checks that the remaining vault balance still covers all reserved margin across every active position. Reverts if withdrawal would leave any position liquidatable."
              params={[
                { name: "token",  type: "address", desc: "Collateral token to withdraw." },
                { name: "amount", type: "uint256", desc: "Amount to withdraw in token decimals." },
              ]}
            />

            <FnBlock
              signature="openPosition(bytes32 marketId, bool isLong, uint256 size, uint256 margin)"
              description="Opens or increases a perpetual position. Settles pending funding, verifies IMR, pulls margin into reserve, then calls the vAMM to execute the virtual swap."
              params={[
                { name: "marketId", type: "bytes32", desc: "Unique market identifier from MarketRegistry." },
                { name: "isLong",   type: "bool",    desc: "true for long, false for short."               },
                { name: "size",     type: "uint256", desc: "Position size in WAD (1e18 = 1 unit)."         },
                { name: "margin",   type: "uint256", desc: "Margin to allocate in WAD."                    },
              ]}
            />

            <FnBlock
              signature="closePosition(bytes32 marketId)"
              description="Closes the caller's entire position in the given market. Settles funding, executes the inverse swap on the vAMM, realizes PnL, and releases reserved margin back to the vault."
              params={[
                { name: "marketId", type: "bytes32", desc: "Market to close the position in." },
              ]}
            />

            <FnBlock
              signature="addMargin(bytes32 marketId, uint256 amount)"
              description="Adds margin to an existing position without changing its size, reducing leverage and improving the liquidation price."
              params={[
                { name: "marketId", type: "bytes32", desc: "Target market."               },
                { name: "amount",   type: "uint256", desc: "Additional margin in WAD."    },
              ]}
            />

            <FnBlock
              signature="removeMargin(bytes32 marketId, uint256 amount)"
              description="Withdraws excess margin from a position. Reverts if IMR would be violated after removal."
              params={[
                { name: "marketId", type: "bytes32", desc: "Target market."            },
                { name: "amount",   type: "uint256", desc: "Margin to remove in WAD."  },
              ]}
            />

            <FnBlock
              signature="liquidate(address account, bytes32 marketId)"
              description="Whitelisted-liquidator only. Closes an under-margined position, distributes the liquidation penalty to the liquidator and FeeRouter, and covers any bad debt via InsuranceFund."
              params={[
                { name: "account",  type: "address", desc: "Address of the account to liquidate."               },
                { name: "marketId", type: "bytes32", desc: "Market in which to execute the liquidation."          },
              ]}
            />

            <FnBlock
              signature="setRiskParams(bytes32 marketId, MarketRiskParams calldata params)"
              description="Admin. Configures IMR, MMR, liquidation penalty BPS, penalty cap, and position size limits for a market."
              params={[
                { name: "marketId", type: "bytes32",          desc: "Target market."                                                         },
                { name: "params",   type: "MarketRiskParams", desc: "Struct: IMR, MMR, penalty BPS, penalty cap, and max position size."      },
              ]}
            />
          </motion.section>

          {/* ── 02 InsuranceFund ───────────────────────────────────────── */}
          <motion.section id="insurancefund" className="scroll-mt-20" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}>
            <H2>InsuranceFund</H2>
            <Rule />
            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
              Single-token ERC20 reserve that absorbs bad debt from liquidations. Receives a
              share of all trade fees and liquidation penalties. When a liquidation results in
              a shortfall, ClearingHouse calls <C>payBadDebt</C> and the fund pays what it can
              without reverting the transaction.
            </p>

            <H3>Key Concepts</H3>
            <TermTable>
              <Term term="Graceful Degradation">
                If the fund cannot cover the full bad debt, it pays the available balance.
                ClearingHouse records the remaining shortfall as <C>totalBadDebt</C> —
                liquidations never revert.
              </Term>
              <Term term="Authorization">
                Only registered FeeRouters can push fees (<C>onFeeReceived</C>). Only
                authorized modules (e.g. ClearingHouse) can request payouts (<C>payBadDebt</C>).
              </Term>
              <Term term="Balance-Delta Check">
                <C>onFeeReceived</C> verifies actual token receipt via balance delta, preventing
                spoofed accounting.
              </Term>
            </TermTable>

            <H3>Functions</H3>

            <FnBlock
              signature="onFeeReceived(uint256 amount)"
              description="Called by an authorized FeeRouter after transferring tokens. Verifies receipt via balance delta and updates internal accounting."
              params={[
                { name: "amount", type: "uint256", desc: "Expected fee amount. Verified against actual balance delta." },
              ]}
            />

            <FnBlock
              signature="payBadDebt(uint256 amount, address recipient)"
              returns="uint256 paid"
              description="Called by ClearingHouse during liquidation. Transfers min(balance, amount) to the recipient and returns the actual amount paid."
              params={[
                { name: "amount",    type: "uint256", desc: "Bad debt amount to cover."              },
                { name: "recipient", type: "address", desc: "Address to send the payout to."         },
              ]}
            />

            <FnBlock
              signature="addRouter(address router)"
              description="Owner only. Authorizes a FeeRouter to push fees into the fund."
              params={[
                { name: "router", type: "address", desc: "FeeRouter contract to authorize." },
              ]}
            />

            <FnBlock
              signature="addAuthorized(address module)"
              description="Owner only. Authorizes a module (e.g. ClearingHouse) to request bad-debt payouts."
              params={[
                { name: "module", type: "address", desc: "Module contract to authorize." },
              ]}
            />

            <FnBlock
              signature="balance()"
              returns="uint256"
              description="Returns the current token balance held by the fund."
            />
          </motion.section>

          {/* ── 03 Oracle System ───────────────────────────────────────── */}
          <motion.section id="oracle" className="scroll-mt-20" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}>
            <H2>Oracle System</H2>
            <Rule />
            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
              A layered oracle design. Chainlink feeds price ETH and major assets; a custom
              CuOracle provides GPU compute prices via a commit-reveal scheme to prevent
              front-running.
            </p>

            {/* Oracle.sol */}
            <div className="mb-10">
              <h3 className="text-sm font-semibold text-white mb-0.5">
                Oracle.sol{" "}
                <span className="font-normal text-zinc-500">— Chainlink Wrapper</span>
              </h3>
              <div className="w-6 h-px bg-zinc-800 mb-4" />
              <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                Wraps Chainlink AggregatorV3 feeds. Validates staleness (configurable max age),
                rejects zero or negative prices, and returns WAD-scaled prices by symbol string.
              </p>
              <FnBlock
                signature="getPrice(string calldata symbol)"
                returns="uint256 priceX18"
                description="Looks up the registered Chainlink feed for the symbol, reads latestRoundData, applies the staleness check, and returns the price in 1e18 precision."
                params={[
                  { name: "symbol", type: "string", desc: "Asset symbol (e.g. 'ETH', 'BTC')." },
                ]}
              />
              <FnBlock
                signature="setFeed(string calldata symbol, address feedAddress, uint256 maxAge)"
                description="Admin only. Registers or updates a Chainlink AggregatorV3 feed for a given symbol."
                params={[
                  { name: "symbol",      type: "string",  desc: "Asset symbol to register."                                  },
                  { name: "feedAddress", type: "address", desc: "Chainlink AggregatorV3 contract address."                   },
                  { name: "maxAge",      type: "uint256", desc: "Maximum acceptable age of price data in seconds."           },
                ]}
              />
            </div>

            {/* CuOracle.sol */}
            <div className="mb-10">
              <h3 className="text-sm font-semibold text-white mb-0.5">
                CuOracle.sol{" "}
                <span className="font-normal text-zinc-500">— Commit-Reveal GPU Price Oracle</span>
              </h3>
              <div className="w-6 h-px bg-zinc-800 mb-4" />
              <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                Provides GPU compute asset prices via a two-phase commit-reveal mechanism.
                The operator first commits <C>keccak256(price, nonce)</C> then reveals in a
                separate transaction after a mandatory delay, preventing front-running.
              </p>
              <FnBlock
                signature="commitPrice(bytes32 assetId, bytes32 commitHash)"
                description="Stores a price commitment hash for an asset. Enforces a minimum interval between commits for the same asset."
                params={[
                  { name: "assetId",    type: "bytes32", desc: "GPU asset identifier (e.g. keccak256('H100'))."           },
                  { name: "commitHash", type: "bytes32", desc: "keccak256(abi.encode(price, nonce))."                     },
                ]}
              />
              <FnBlock
                signature="revealPrice(bytes32 assetId, uint256 price, bytes32 nonce)"
                description="Validates the reveal against the stored commitment after the required delay. Updates the latest price and timestamp on success."
                params={[
                  { name: "assetId", type: "bytes32", desc: "GPU asset to update."                                       },
                  { name: "price",   type: "uint256", desc: "Revealed price in WAD precision."                           },
                  { name: "nonce",   type: "bytes32", desc: "Nonce used in the original commitment."                     },
                ]}
              />
              <FnBlock
                signature="getPrice(bytes32 assetId)"
                returns="(uint256 priceX18, uint256 updatedAt)"
                description="Returns the latest revealed price and its timestamp. Reverts if the asset has not been registered or has no revealed price yet."
                params={[
                  { name: "assetId", type: "bytes32", desc: "GPU asset to query." },
                ]}
              />
            </div>

            {/* MultiAssetOracle.sol */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-white mb-0.5">
                MultiAssetOracle.sol{" "}
                <span className="font-normal text-zinc-500">— Aggregated Price Source</span>
              </h3>
              <div className="w-6 h-px bg-zinc-800 mb-4" />
              <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                Aggregates prices from multiple underlying sources (Chainlink, CuOracle) into a
                single contract with a unified interface. Per-symbol source configuration.
              </p>
              <FnBlock
                signature="getPrice(string calldata symbol)"
                returns="uint256 priceX18"
                description="Routes the price query to the registered source for the given symbol and returns the WAD-scaled result."
                params={[
                  { name: "symbol", type: "string", desc: "Asset symbol to price." },
                ]}
              />
            </div>

            <Note color="amber" label="Adapter Pattern">
              <C>CuOracleAdapter</C> and <C>MultiAssetOracleAdapter</C> are thin wrappers that
              implement <C>IOracle</C>, allowing any oracle variant to plug into ClearingHouse
              and CollateralVault without contract changes.
            </Note>
          </motion.section>

          {/* ── 04 Calculations Library ────────────────────────────────── */}
          <motion.section id="calculations" className="scroll-mt-20" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}>
            <H2>Calculations Library</H2>
            <Rule />
            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
              Pure Solidity library providing overflow-safe fixed-point arithmetic at 1e18
              (WAD) precision. Used by ClearingHouse and vAMM for all price and value math.
            </p>

            <H3>Functions</H3>

            <FnBlock
              signature="mul(uint256 a, uint256 b)"
              returns="(a × b) / 1e18"
              description="Multiplies two WAD numbers. Checks for overflow before multiplying, then divides by 1e18 to restore WAD scale."
              params={[
                { name: "a", type: "uint256", desc: "First WAD operand."  },
                { name: "b", type: "uint256", desc: "Second WAD operand." },
              ]}
            />

            <FnBlock
              signature="div(uint256 a, uint256 b)"
              returns="(a × 1e18) / b"
              description="Divides two WAD numbers. Scales the numerator by 1e18 first, then divides. Reverts on division by zero or overflow."
              params={[
                { name: "a", type: "uint256", desc: "Numerator in WAD."   },
                { name: "b", type: "uint256", desc: "Denominator in WAD." },
              ]}
            />

            <FnBlock
              signature="mulDiv(uint256 a, uint256 b, uint256 denominator)"
              returns="(a × b) / denominator"
              description="Full-precision multiply-then-divide using 512-bit intermediate arithmetic. Used for price cumulative calculations in the TWAP."
              params={[
                { name: "a",           type: "uint256", desc: "First multiplicand." },
                { name: "b",           type: "uint256", desc: "Second multiplicand." },
                { name: "denominator", type: "uint256", desc: "Divisor."            },
              ]}
            />

            <FnBlock
              signature="sqrt(uint256 x)"
              returns="uint256"
              description="Integer square root via Newton-Raphson iteration. Used for initial reserve seeding."
              params={[
                { name: "x", type: "uint256", desc: "Input value." },
              ]}
            />

            <FnBlock
              signature="toWad(uint256 a)"
              returns="a × 1e18"
              description="Converts a plain integer to WAD precision. Reverts on overflow."
              params={[
                { name: "a", type: "uint256", desc: "Plain integer to convert." },
              ]}
            />

            <FnBlock
              signature="fromWad(uint256 a)"
              returns="a / 1e18"
              description="Converts a WAD number back to a plain integer, truncating the fractional part."
              params={[
                { name: "a", type: "uint256", desc: "WAD value to convert." },
              ]}
            />

            <div className="mt-6">
              <Note color="purple" label="Design Note">
                All arithmetic reverts on overflow/underflow rather than wrapping. There are no
                unchecked blocks — correctness is favored over gas savings at the library level.
              </Note>
            </div>
          </motion.section>

        </main>
      </div>
    </div>
  );
};

export default DocsPage;
