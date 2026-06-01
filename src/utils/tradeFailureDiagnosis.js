/**
 * Structured diagnosis for open-position failures.
 * Returns a rich object instead of a flat string so the UI can render
 * severity-appropriate inline messages with action links.
 *
 * Precedence (caller should apply in order):
 *  1. Local preview blocker  (caller checks preview.ok before calling here)
 *  2. diagnoseFundingBlocker — position margin/liquidation check
 *  3. diagnoseOpenPositionError — simulateContract / writeContract / receipt revert
 */

// ── Open-position specific error messages ────────────────────────────────────
// These are richer than the generic messages in transactionErrors.js and are
// used only for the open-position flow.
const OPEN_ERROR_MAP = {
  HasLiquidatablePosition: {
    severity: "error",
    title:    "Liquidatable Position Exists",
    message:  "You have a liquidatable position in {market}. Add margin or reduce/close that position before opening a new trade.",
    actionLabel: "Manage Positions",
    actionHref:  "/trade",
  },
  ImmediatelyLiquidatable: {
    severity: "error",
    title:    "Order Immediately Liquidatable",
    message:  "This order would be liquidatable immediately after execution. Reduce size or add more collateral.",
  },
  IMRBreach: {
    severity: "error",
    title:    "Insufficient Margin",
    message:  "Your margin would fall below the initial margin requirement. Reduce size or add collateral.",
  },
  InsufficientQuoteCollateral: {
    severity: "error",
    title:    "Not Enough Collateral",
    message:  "Not enough free quote collateral to meet this order's initial margin requirement.",
  },
  InsufficientQuoteForFee: {
    severity: "error",
    title:    "Not Enough for Fees",
    message:  "You have enough margin for the position, but not enough free quote collateral to pay trading fees.",
  },
  MarketNotActive: {
    severity: "error",
    title:    "Market Paused",
    message:  "This market is paused. Trading will resume when the protocol reactivates it.",
  },
  RiskParamsNotSet: {
    severity: "error",
    title:    "Market Misconfigured",
    message:  "This market is missing risk parameters. Try another market or contact support.",
  },
  MarketNotFound: {
    severity: "error",
    title:    "Market Not Found",
    message:  "This market could not be found. Try refreshing or contact support.",
  },
  OraclePriceZero: {
    severity: "error",
    title:    "Oracle Price Unavailable",
    message:  "This market's index price is currently unavailable. Trading will resume after the oracle updates.",
  },
  OracleNotSet: {
    severity: "error",
    title:    "Oracle Unavailable",
    message:  "This market's index price is currently unavailable. Trading will resume after the oracle updates.",
  },
  CuOracleAdapter_PriceZero:              { severity: "error", title: "Oracle Price Unavailable", message: "This market's index price is currently unavailable. Trading will resume after the oracle updates." },
  CuOracleAdapter_PriceStale:             { severity: "error", title: "Oracle Price Stale",       message: "This market's index price is stale. Trading will resume after the oracle updates." },
  MultiAssetOracleAdapter_PriceZero:      { severity: "error", title: "Oracle Price Unavailable", message: "This market's index price is currently unavailable." },
  MultiAssetOracleAdapter_PriceStale:     { severity: "error", title: "Oracle Price Stale",       message: "This market's index price is stale. Trading will resume after the oracle updates." },
  ChainlinkOracle_ZeroPrice:              { severity: "error", title: "Oracle Price Unavailable", message: "This market's index price is currently unavailable." },
  ChainlinkOracle_NoPriceFeed:            { severity: "error", title: "No Price Feed",            message: "This market has no active price feed. Contact support." },
  PriceIsStale:                           { severity: "error", title: "Oracle Price Stale",       message: "This market's index price is stale. Trading will resume after the oracle updates." },
  SequencerDown:                          { severity: "error", title: "Sequencer Offline",        message: "Oracle sequencer is offline. Please try again shortly." },
  GracePeriodNotOver:                     { severity: "error", title: "Sequencer Grace Period",   message: "Oracle sequencer recently came back online. Please wait a moment and retry." },
  BelowMinSize:                           { severity: "error", title: "Size Too Small",           message: "Position size is below this market's minimum. Increase the size." },
  ExceedsMaxSize:                         { severity: "error", title: "Size Too Large",           message: "Position size exceeds this market's maximum. Reduce the size." },
  AmountZero:                             { severity: "error", title: "Invalid Size",             message: "Enter a size greater than zero." },
  SizeZero:                               { severity: "error", title: "Invalid Size",             message: "Enter a size greater than zero." },
  InsufficientBalance:                    { severity: "error", title: "Insufficient Balance",     message: "Not enough deposited collateral for this order." },
  InsufficientQuoteBalance:               { severity: "error", title: "Insufficient Balance",     message: "Not enough deposited collateral for this order." },
  WouldBeLiquidatable:                    { severity: "error", title: "Would Be Liquidatable",    message: "This position would be immediately at risk of liquidation. Reduce size or add collateral." },
};

// 4-byte selectors → error name (shared with transactionErrors.js)
const PROTOCOL_ERROR_SELECTORS = {
  "0xcbca5aa2": "AmountZero",
  "0xb3892d42": "HasLiquidatablePosition",
  "0x71ff3a1a": "IMRBreach",
  "0x574cc479": "ImmediatelyLiquidatable",
  "0xf4d678b8": "InsufficientBalance",
  "0x41c092a9": "InsufficientMargin",
  "0x03297f1d": "InsufficientQuoteBalance",
  "0x1410a475": "InsufficientQuoteCollateral",
  "0xc24e3c70": "InsufficientQuoteForFee",
  "0xb521771a": "MarketNotActive",
  "0xac1c9cb4": "RiskParamsNotSet",
  "0x7db1be50": "MarketNotFound",
  "0xeae238a0": "SizeZero",
  "0xacffcbaf": "WouldBeLiquidatable",
  "0x4ae094cb": "BelowMinSize",
  "0x8f1c65a1": "ExceedsMaxSize",
  "0xf8794e04": "OracleNotSet",
  "0x579595ac": "OraclePriceZero",
  "0x73ffab75": "CuOracleAdapter_OracleZeroAddress",
  "0x3c1046a5": "CuOracleAdapter_AssetIdZero",
  "0xca69b386": "CuOracleAdapter_PriceZero",
  "0x4ffbfa58": "CuOracleAdapter_PriceStale",
  "0xb80f357d": "MultiAssetOracleAdapter_OracleZeroAddress",
  "0x75814774": "MultiAssetOracleAdapter_AssetIdZero",
  "0x226b4691": "MultiAssetOracleAdapter_PriceZero",
  "0xd1100f3a": "MultiAssetOracleAdapter_PriceStale",
  "0x60d219e5": "ChainlinkOracle_NoPriceFeed",
  "0xa9276b5a": "ChainlinkOracle_ZeroPrice",
  "0x95d833f9": "Oracle_InvalidAddress",
  "0x032b3d00": "SequencerDown",
  "0xd15f73b5": "GracePeriodNotOver",
  "0x857860b6": "PriceIsStale",
};

// ── Internal helpers ─────────────────────────────────────────────────────────

function collectErrorText(error, seen = new Set()) {
  if (!error || seen.has(error)) return "";
  if (typeof error === "string") return error;
  seen.add(error);
  const parts = [];
  for (const key of ["name", "shortMessage", "message", "details", "data"]) {
    const val = error[key];
    if (typeof val === "string") parts.push(val);
    else if (val && typeof val === "object") parts.push(collectErrorText(val, seen));
  }
  if (Array.isArray(error.metaMessages)) parts.push(error.metaMessages.join(" "));
  if (error.cause) parts.push(collectErrorText(error.cause, seen));
  if (error.error) parts.push(collectErrorText(error.error, seen));
  return parts.filter(Boolean).join(" ");
}

function extractProtocolErrorName(errorText) {
  // 1. Named custom error in text
  for (const name of Object.keys(OPEN_ERROR_MAP)) {
    if (new RegExp(`\\b${name}\\b`).test(errorText)) return name;
  }
  // 2. 4-byte selector in text
  const selectors = errorText.toLowerCase().match(/0x[a-f0-9]{8}/g) || [];
  for (const sel of selectors) {
    const name = PROTOCOL_ERROR_SELECTORS[sel];
    if (name) return name;
  }
  return null;
}

function makeDefault(marketName) {
  return {
    severity: "error",
    title:    "Order Failed",
    message:  `Unable to open position${marketName ? ` on ${marketName}` : ""}. Please review the order and try again.`,
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Diagnose an error thrown during open-position preflight (simulation) or
 * wallet submission. Returns a structured diagnosis object.
 *
 * @param {unknown} error
 * @param {{ marketName?: string }} context
 * @returns {{ severity, title, message, actionLabel?, actionHref?, protocolErrorName?, marketName? }}
 */
export function diagnoseOpenPositionError(error, { marketName } = {}) {
  const text       = collectErrorText(error);
  const normalized = text.toLowerCase();

  // 1. Wallet rejection
  if (
    error?.code === 4001 ||
    error?.cause?.code === 4001 ||
    normalized.includes("user rejected") ||
    normalized.includes("user denied") ||
    normalized.includes("rejected the request")
  ) {
    return { severity: "info", title: "Cancelled", message: "Transaction cancelled in wallet." };
  }

  // 2. Network / RPC
  if (
    normalized.includes("network error") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("timeout") ||
    normalized.includes("rate limit") ||
    (normalized.includes("rpc") && !normalized.includes("receipt")) ||
    normalized.includes("connection")
  ) {
    return { severity: "error", title: "Network Error", message: "Network or RPC error. Please check Sepolia and try again." };
  }

  // 3. Gas
  if (
    normalized.includes("insufficient funds for gas") ||
    normalized.includes("insufficient funds") ||
    normalized.includes("does not have enough funds") ||
    normalized.includes("gas * price + value")
  ) {
    return { severity: "error", title: "Not Enough ETH", message: "Not enough Sepolia ETH to pay gas for this transaction." };
  }

  // 4. vAMM string errors (from require statements inside the AMM)
  if (normalized.includes("swaps paused")) {
    return { severity: "error", title: "Trading Paused", message: "Trading is paused for this market." };
  }
  if (normalized.includes("reserve base depleted") || normalized.includes("insufficient x")) {
    return { severity: "error", title: "Liquidity Depleted", message: "Long liquidity is depleted for this market. Try a smaller size." };
  }
  if (normalized.includes("reserve quote depleted")) {
    return { severity: "error", title: "Liquidity Depleted", message: "Short liquidity is depleted for this market. Try a smaller size." };
  }
  if (
    normalized.includes("slippage") ||
    normalized.includes("limit below executable") ||
    normalized.includes("limit above executable")
  ) {
    return { severity: "error", title: "Limit Price Issue", message: "Your limit price is not executable at current vAMM reserves. Adjust the limit or reduce size." };
  }
  if (normalized.includes("stale") && (normalized.includes("oracle") || normalized.includes("price"))) {
    return { severity: "error", title: "Oracle Price Stale", message: "This market's index price is stale. Trading will resume after the oracle updates." };
  }

  // 5. Protocol custom error
  const protocolErrorName = extractProtocolErrorName(text);
  if (protocolErrorName && OPEN_ERROR_MAP[protocolErrorName]) {
    const template = OPEN_ERROR_MAP[protocolErrorName];
    // Substitute {market} placeholder if marketName is provided
    const message = marketName
      ? template.message.replace("{market}", marketName)
      : template.message.replace(" in {market}", "").replace(" on {market}", "");
    return {
      ...template,
      message,
      protocolErrorName,
      marketName,
    };
  }

  // 6. Generic receipt revert
  if (
    error?.status === "reverted" ||
    error?.receipt?.status === "reverted" ||
    normalized.includes("transaction execution reverted") ||
    normalized.includes("receipt status is reverted")
  ) {
    return makeDefault(marketName);
  }

  return makeDefault(marketName);
}

/**
 * Pre-submit check: scan active positions for margin risk that would cause
 * the contract to block a new open (HasLiquidatablePosition).
 *
 * Uses available position data without requiring live funding-rate hooks.
 * Approximate — the simulation is the authoritative check; this provides an
 * earlier, market-specific message.
 *
 * @param {Array} positions  — from useAllPositions()
 * @returns diagnosis | null
 */
export function diagnoseFundingBlocker(positions) {
  if (!positions || positions.length === 0) return null;

  const MMR_APPROX    = 0.05;  // 5% maintenance margin ratio (conservative default)
  const NEAR_LIQ_PCT  = 1.20;  // warn when within 20% of maintenance

  for (const pos of positions) {
    const margin      = parseFloat(pos.margin)        || 0;
    const size        = Math.abs(parseFloat(pos.size) || 0);
    const entryPrice  = parseFloat(pos.entryPriceX18) || 0;
    if (size <= 0 || entryPrice <= 0 || margin <= 0) continue;

    const notional           = size * entryPrice;
    const maintenanceMargin  = notional * MMR_APPROX;
    const name               = pos.marketName || pos.marketKey || "an open market";

    if (margin <= maintenanceMargin) {
      return {
        severity:         "error",
        title:            "Liquidatable Position",
        message:          `You have a liquidatable position in ${name}. Add margin or reduce/close that position before opening a new trade.`,
        actionLabel:      "Manage Positions",
        actionHref:       "/trade",
        marketName:       name,
        blockingMarketId: pos.marketId,
      };
    }

    if (margin <= maintenanceMargin * NEAR_LIQ_PCT) {
      return {
        severity:         "warning",
        title:            "Position Near Liquidation",
        message:          `Your ${name} position is close to its liquidation threshold. Consider adding margin before opening a new trade.`,
        actionLabel:      "Add Margin",
        actionHref:       "/trade",
        marketName:       name,
        blockingMarketId: pos.marketId,
      };
    }
  }

  return null;
}
