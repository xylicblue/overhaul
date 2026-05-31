const PROTOCOL_ERROR_MESSAGES = {
  AmountZero: "Enter an amount greater than zero.",
  HasLiquidatablePosition: "You have a liquidatable position and cannot open a new one.",
  IMRBreach: "Not enough available collateral for this order.",
  ImmediatelyLiquidatable: "This order would be immediately liquidatable. Add collateral or reduce size.",
  InsufficientBalance: "Not enough available balance for this transaction.",
  InsufficientMargin: "Not enough margin for this action.",
  InsufficientQuoteBalance: "Not enough available collateral for this order.",
  InsufficientQuoteCollateral: "Not enough available collateral for this order.",
  InsufficientQuoteForFee: "Not enough available collateral to pay trading fees.",
  PositionLiquidatable: "This position is liquidatable and cannot be closed normally.",
  NoPosition: "No open position was found for this market.",
  ReduceExceedsPosition: "Close size exceeds your current position.",
  RemainingBelowMinCloseFull: "The remaining size would be below the minimum. Close the full position instead.",
  MarketNotActive: "This market is paused.",
  RiskParamsNotSet: "This market has a configuration issue. Please try another market.",
  MarketNotFound: "This market has a configuration issue. Please try another market.",
  SizeZero: "Enter a position size greater than zero.",
  WouldBeLiquidatable: "This action would leave the position liquidatable. Add collateral or reduce size.",
  BelowMinSize: "Position size is below the market minimum.",
  ExceedsMaxSize: "Position size exceeds the market maximum.",
  OracleNotSet: "Price feed is unavailable for this market.",
  OraclePriceZero: "Price feed is unavailable for this market.",
  QuoteOracleUnavailable: "Quote token price feed is unavailable.",
  QuoteTokenValuationUnavailable: "Quote token valuation is unavailable.",
  CuOracleAdapter_OracleZeroAddress: "Price feed is unavailable for this market.",
  CuOracleAdapter_AssetIdZero: "Price feed is unavailable for this market.",
  CuOracleAdapter_PriceZero: "Price feed is unavailable for this market.",
  CuOracleAdapter_PriceStale: "Price feed is stale. Please wait for the oracle to update.",
  MultiAssetOracleAdapter_OracleZeroAddress: "Price feed is unavailable for this market.",
  MultiAssetOracleAdapter_AssetIdZero: "Price feed is unavailable for this market.",
  MultiAssetOracleAdapter_PriceZero: "Price feed is unavailable for this market.",
  MultiAssetOracleAdapter_PriceStale: "Price feed is stale. Please wait for the oracle to update.",
  ChainlinkOracle_NoPriceFeed: "Price feed is unavailable for this market.",
  ChainlinkOracle_ZeroPrice: "Price feed is unavailable for this market.",
  Oracle_InvalidAddress: "Price feed is unavailable for this market.",
  SequencerDown: "Oracle sequencer check failed. Please try again shortly.",
  GracePeriodNotOver: "Oracle sequencer grace period is still active. Please try again shortly.",
  PriceOutOfBounds: "Price feed returned an out-of-bounds value. Please try again shortly.",
  PriceIsStale: "Price feed is stale. Please wait for the oracle to update.",
  InvalidSize: "Enter a valid close size for this position.",
  NotLiquidatable: "This position is not liquidatable.",
  MustLiquidateMore: "Close more of the position or close it fully.",
  MarginBelowPenalty: "Not enough position margin remains after the penalty.",
  RemainingBelowMinLiquidateFull: "The remaining size would be below the minimum. Liquidate the full position instead.",
  MMRZero: "This market has a configuration issue. Please try another market.",
  MinExceedsMax: "This market has a configuration issue. Please try another market.",
  ZeroAddress: "This market has a configuration issue. Please try another market.",
};

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
  "0xe5cace41": "PositionLiquidatable",
  "0xabf0f034": "NoPosition",
  "0x82f1dd3d": "ReduceExceedsPosition",
  "0x823cc9f7": "RemainingBelowMinCloseFull",
  "0xb521771a": "MarketNotActive",
  "0xac1c9cb4": "RiskParamsNotSet",
  "0x7db1be50": "MarketNotFound",
  "0xeae238a0": "SizeZero",
  "0xacffcbaf": "WouldBeLiquidatable",
  "0x4ae094cb": "BelowMinSize",
  "0x8f1c65a1": "ExceedsMaxSize",
  "0xf8794e04": "OracleNotSet",
  "0x579595ac": "OraclePriceZero",
  "0x1d45ee6a": "QuoteOracleUnavailable",
  "0x4c472448": "QuoteTokenValuationUnavailable",
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
  "0x6e4ba61d": "PriceOutOfBounds",
  "0x857860b6": "PriceIsStale",
  "0x0ffd11ad": "InvalidSize",
  "0xddeb79ba": "NotLiquidatable",
  "0x47d7de79": "MustLiquidateMore",
  "0x0e5a860e": "MarginBelowPenalty",
  "0xb4af6add": "RemainingBelowMinLiquidateFull",
  "0x24814210": "MMRZero",
  "0xa8951cc3": "MinExceedsMax",
  "0xd92e233d": "ZeroAddress",
};

const ACTION_DEFAULTS = {
  open: "Unable to open position. Please review the order and try again.",
  close: "Unable to close position. Please review the size and try again.",
  "add margin": "Unable to add margin. Please review the amount and try again.",
  transaction: "Transaction failed. Please try again.",
};

export function getSepoliaTxUrl(hash) {
  return hash ? `https://sepolia.etherscan.io/tx/${hash}` : "";
}

function collectErrorText(error, seen = new Set()) {
  if (!error || seen.has(error)) return "";
  if (typeof error === "string") return error;
  seen.add(error);

  const parts = [];
  for (const key of ["name", "shortMessage", "message", "details", "data"]) {
    const value = error[key];
    if (typeof value === "string") parts.push(value);
    else if (value && typeof value === "object") parts.push(collectErrorText(value, seen));
  }

  if (Array.isArray(error.metaMessages)) parts.push(error.metaMessages.join(" "));
  if (error.cause) parts.push(collectErrorText(error.cause, seen));
  if (error.error) parts.push(collectErrorText(error.error, seen));

  return parts.filter(Boolean).join(" ");
}

function getProtocolErrorName(errorText) {
  for (const name of Object.keys(PROTOCOL_ERROR_MESSAGES)) {
    const pattern = new RegExp(`\\b${name}\\b`);
    if (pattern.test(errorText)) return name;
  }

  const selectorMatches = errorText.toLowerCase().match(/0x[a-f0-9]{8}/g) || [];
  for (const selector of selectorMatches) {
    if (PROTOCOL_ERROR_SELECTORS[selector]) return PROTOCOL_ERROR_SELECTORS[selector];
  }

  return null;
}

export function formatTransactionError(error, { action = "transaction" } = {}) {
  const text = collectErrorText(error);
  const normalized = text.toLowerCase();

  if (error?.status === "reverted" || error?.receipt?.status === "reverted") {
    return ACTION_DEFAULTS[action] || ACTION_DEFAULTS.transaction;
  }

  if (
    error?.code === 4001 ||
    error?.cause?.code === 4001 ||
    normalized.includes("user rejected") ||
    normalized.includes("user denied") ||
    normalized.includes("rejected the request")
  ) {
    return "Transaction cancelled in wallet.";
  }

  const protocolErrorName = getProtocolErrorName(text);
  if (protocolErrorName) {
    if (
      action === "add margin" &&
      ["InsufficientBalance", "InsufficientQuoteBalance", "InsufficientQuoteCollateral"].includes(protocolErrorName)
    ) {
      return "Not enough available deposited USDC to add margin.";
    }

    if (action === "add margin" && protocolErrorName === "NoPosition") {
      return "This position is no longer open. Refresh and try again.";
    }

    return PROTOCOL_ERROR_MESSAGES[protocolErrorName];
  }

  if (
    normalized.includes("insufficient funds") ||
    normalized.includes("insufficient funds for gas") ||
    normalized.includes("insufficient balance for transaction") ||
    normalized.includes("does not have enough funds") ||
    normalized.includes("gas * price + value") ||
    normalized.includes("exceeds the balance of the account")
  ) {
    return "Not enough Sepolia ETH to pay gas for this transaction.";
  }

  if (
    normalized.includes("stale") &&
    (normalized.includes("oracle") || normalized.includes("price"))
  ) {
    return "Price feed is stale. Please wait for the oracle to update.";
  }

  if (
    normalized.includes("network error") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("timeout") ||
    normalized.includes("rate limit") ||
    normalized.includes("rpc") ||
    normalized.includes("connection")
  ) {
    return "Network or RPC error. Please check Sepolia and try again.";
  }

  if (normalized.includes("replacement transaction underpriced")) {
    return "Wallet transaction replacement was underpriced. Please retry with updated gas.";
  }

  if (
    normalized.includes("transaction execution reverted") ||
    normalized.includes("receipt status is reverted")
  ) {
    return ACTION_DEFAULTS[action] || ACTION_DEFAULTS.transaction;
  }

  const firstLine = text.split("\n")[0]?.trim();
  if (firstLine) return firstLine.length > 120 ? `${firstLine.slice(0, 120)}...` : firstLine;

  return ACTION_DEFAULTS[action] || ACTION_DEFAULTS.transaction;
}
