// ─────────────────────────────────────────────────────────────────────────────
// ByteStrike Market Rules, Risk Disclosure and User Acknowledgement.
// Shown as the FIRST step of the first-trade consent flow (before the Privacy
// Policy). Same section shape as privacySections.js so it renders identically.
// ─────────────────────────────────────────────────────────────────────────────
export const RISK_VERSION = "1.0";
export const RISK_DATE = "16 June 2026";

export const RISK_INTRO =
  "This document summarizes key market rules and risks for ByteStrike perpetual futures markets referencing GPU compute pricing. It is a user acknowledgement and risk disclosure, not a substitute for the deployed smart contracts, protocol parameters, full Terms of Use, market notices, or legal/regulatory disclosures.";

export const RISK_ACK_CHECKBOX =
  "I have read and understand the ByteStrike Market Rules, Risk Disclosure and User Acknowledgement, and I accept these risks before placing my first trade.";

export const RISK_SECTIONS = [
  {
    id: "platform-role",
    number: "01",
    title: "Platform Role & Market Structure",
    content:
      "ByteStrike operates settlement-layer infrastructure for supported perpetual futures markets that reference GPU compute prices, hourly rental rates, and related compute benchmarks. ByteStrike markets are derivative markets; they are not spot markets for GPU hardware, physical compute capacity, or cloud-service contracts. Deposited assets are held by smart contracts. ByteStrike does not hold user wallet private keys, and users authorize transactions through their own wallets or custodians.",
    bullets: [
      "Users trade long or short exposure through a virtual automated market maker, not a traditional matched order book.",
      "A trade may execute even where no equal and opposite user position exists at that time.",
      "Positions are perpetual and do not have a fixed expiry unless a market is paused, migrated, settled, or closed under applicable rules.",
    ],
  },
  {
    id: "key-risks",
    number: "02",
    title: "Key Trading & Settlement Risks",
    items: [
      {
        label: "One-sided markets",
        text: "Open interest may become concentrated on one side, including a market with only long or only short exposure. This can create funding, liquidity, collateral, and settlement pressure.",
      },
      {
        label: "Funding risk",
        text: "Funding may be positive, negative, delayed, limited, or different from estimates where opposite-side exposure or available settlement resources are insufficient.",
      },
      {
        label: "Thin liquidity and price impact",
        text: "A single trade or liquidation may materially move the virtual AMM mark price, especially in new or thin markets.",
      },
      {
        label: "Different prices",
        text: "Oracle price, mark price, execution price, liquidation price, margin valuation, and displayed frontend estimates may differ.",
      },
      {
        label: "Liquidation and leverage",
        text: "Leveraged positions can lose value rapidly and may be liquidated if collateral falls below required thresholds.",
      },
      {
        label: "Smart-contract, oracle, network, and frontend risk",
        text: "Contracts may contain bugs, oracle inputs may be delayed or incorrect, transactions may fail or be reordered, and frontend/indexer data may lag on-chain state.",
      },
      {
        label: "Insurance-fund limits",
        text: "Any insurance fund or backstop mechanism may be limited and is not a guarantee against loss, bad debt, oracle issues, funding imbalance, or market dislocation.",
      },
    ],
  },
  {
    id: "protocol-rules",
    number: "03",
    title: "Protocol Rules & Operational Controls",
    content:
      "Settlement is governed by deployed smart-contract code, configured market parameters, oracle data, collateral rules, funding rules, margin rules, liquidation rules, transaction timing, and applicable market controls. Off-chain systems such as frontends, indexers, monitoring tools, alerts, and reconciliation systems support the platform but do not independently override valid on-chain contract state.",
    bullets: [
      "ByteStrike may seed markets, monitor imbalances, restrict market availability, limit position sizes, update permitted parameters, pause trading, delay launch or unpause, coordinate keeper/oracle operations, migrate or retire a market, or use incident-response procedures.",
      "Operational intervention may affect the user's ability to open, close, liquidate, add margin, remove margin, or withdraw at a particular time.",
    ],
  },
  {
    id: "user-responsibilities",
    number: "04",
    title: "User Responsibilities",
    bullets: [
      "Read all market notices, displayed warnings, protocol rules, and transaction details before signing.",
      "Maintain sufficient collateral and monitor open positions, funding, margin health, liquidation thresholds, and slippage settings.",
      "Understand that displayed values are estimates and may change before execution or settlement.",
      "Use ByteStrike only if the user understands and accepts the risks of perpetual futures trading, smart contracts, virtual AMMs, and on-chain settlement.",
    ],
  },
  {
    id: "user-acknowledgement",
    number: "05",
    title: "User Acknowledgement",
    content:
      'By clicking "I Acknowledge", connecting a wallet, or placing a first trade on ByteStrike, the user confirms that:',
    bullets: [
      "the user has read and understood this disclosure and accepts the market-structure and settlement-layer risks described above;",
      "ByteStrike markets use a virtual AMM and do not require a matched counterparty for each trade;",
      "markets may become one-sided and may create funding, liquidity, collateral, price-impact, liquidation, and settlement risks;",
      "funding, PnL, fees, penalties, withdrawals, liquidations, and other settlement flows are subject to actual smart-contract rules and available settlement resources;",
      "ByteStrike may take operational actions to protect market integrity, manage risk, or respond to incidents, and those actions may affect user activity;",
      "perpetual futures trading involves material risk, including liquidation risk and possible loss of deposited collateral.",
    ],
  },
];
