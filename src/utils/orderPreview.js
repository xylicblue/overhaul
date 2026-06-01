const WAD = 10n ** 18n;
const BPS_DENOMINATOR = 10000n;

export const ZERO_PREVIEW = {
  ok: false,
  reason: "Enter a size",
  actualBase: 0n,
  quoteAmount: 0n,
  avgPrice: 0n,
  postTradeMark: 0n,
  notional: 0n,
  fee: 0n,
  initialMargin: 0n,
  maintenanceMargin: 0n,
  totalRequired: 0n,
  effectiveLeverageX18: 0n,
  liqPrice: 0n,
  amountLimit: 0n,
};

function abs(value) {
  return value < 0n ? -value : value;
}

function mulDiv(a, b, denominator) {
  if (denominator === 0n) throw new Error("division by zero");
  return (a * b) / denominator;
}

function mulDivRoundUp(a, b, denominator) {
  if (denominator === 0n) throw new Error("division by zero");
  if (a === 0n || b === 0n) return 0n;
  return (a * b + denominator - 1n) / denominator;
}

function max(a, b) {
  return a > b ? a : b;
}

function clampBuyBaseAmount(baseAmount, reserveBase, minReserveBase) {
  if (baseAmount >= reserveBase) throw new Error("insufficient X");
  if (minReserveBase > 0n) {
    const available = reserveBase > minReserveBase ? reserveBase - minReserveBase : 0n;
    if (available <= 0n) throw new Error("Reserve base depleted");
    return baseAmount > available ? available : baseAmount;
  }
  return baseAmount;
}

function quoteBuy({ baseAmount, reserveBase, reserveQuote, minReserveBase, feeBps }) {
  const actualBase = clampBuyBaseAmount(baseAmount, reserveBase, minReserveBase);
  const inWithFeeScaled = mulDivRoundUp(actualBase, reserveQuote * BPS_DENOMINATOR, reserveBase - actualBase);
  const grossQuoteIn = mulDivRoundUp(inWithFeeScaled, 1n, BPS_DENOMINATOR - feeBps);
  const avgPrice = mulDivRoundUp(grossQuoteIn, WAD, actualBase);
  const postReserveBase = reserveBase - actualBase;
  const postReserveQuote = reserveQuote + grossQuoteIn;
  const postTradeMark = mulDiv(postReserveQuote, WAD, postReserveBase);

  return {
    actualBase,
    quoteAmount: grossQuoteIn,
    avgPrice,
    postTradeMark,
  };
}

function quoteSell({ baseAmount, reserveBase, reserveQuote, minReserveQuote, feeBps }) {
  let grossBaseIn = baseAmount;
  const numerator = reserveQuote * grossBaseIn * (BPS_DENOMINATOR - feeBps);
  const denominator = reserveBase * BPS_DENOMINATOR + grossBaseIn * (BPS_DENOMINATOR - feeBps);
  let quoteOut = numerator / denominator;

  if (minReserveQuote > 0n) {
    const newReserveQuote = reserveQuote - quoteOut;
    if (newReserveQuote < minReserveQuote) {
      const maxQuoteOut = reserveQuote > minReserveQuote ? reserveQuote - minReserveQuote : 0n;
      if (maxQuoteOut <= 0n) throw new Error("Reserve quote depleted");
      quoteOut = maxQuoteOut;
      const f = BPS_DENOMINATOR - feeBps;
      grossBaseIn = mulDivRoundUp(maxQuoteOut, reserveBase * BPS_DENOMINATOR, f * minReserveQuote);
      if (grossBaseIn > baseAmount) grossBaseIn = baseAmount;
    }
  }

  if (quoteOut <= 0n) throw new Error("no out");

  const avgPrice = mulDiv(quoteOut, WAD, grossBaseIn);
  const postReserveBase = reserveBase + grossBaseIn;
  const postReserveQuote = reserveQuote - quoteOut;
  if (postReserveBase <= 0n) throw new Error("X=0");
  const postTradeMark = mulDiv(postReserveQuote, WAD, postReserveBase);
  if (postTradeMark <= 0n) throw new Error("Mark price zero");

  return {
    actualBase: grossBaseIn,
    quoteAmount: quoteOut,
    avgPrice,
    postTradeMark,
  };
}

export function amountLimitFromPrice({ isLong, sizeX18, limitPriceX18 }) {
  if (!limitPriceX18 || limitPriceX18 <= 0n || !sizeX18 || sizeX18 <= 0n) return 0n;
  return isLong
    ? mulDivRoundUp(sizeX18, limitPriceX18, WAD)
    : mulDiv(sizeX18, limitPriceX18, WAD);
}

export function buildOpenOrderPreview({
  isLong,
  sizeX18,
  limitPriceX18 = 0n,
  reserveBase,
  reserveQuote,
  minReserveBase = 0n,
  minReserveQuote = 0n,
  feeBps = 0n,
  imrBps,
  mmrBps,
  oraclePrice,
  quoteFreeCollateral = 0n,
  minPositionSize = 0n,
  maxPositionSize = 0n,
  existingSizeX18 = 0n,
}) {
  if (!sizeX18 || sizeX18 <= 0n) return ZERO_PREVIEW;
  if (!reserveBase || reserveBase <= 0n || !reserveQuote || reserveQuote <= 0n) {
    return { ...ZERO_PREVIEW, reason: "Market reserves unavailable" };
  }
  if (!oraclePrice || oraclePrice <= 0n) {
    return { ...ZERO_PREVIEW, reason: "Oracle price unavailable" };
  }
  if (!imrBps || imrBps <= 0n || !mmrBps || mmrBps <= 0n) {
    return { ...ZERO_PREVIEW, reason: "Risk parameters unavailable" };
  }

  try {
    const quote = isLong
      ? quoteBuy({ baseAmount: sizeX18, reserveBase, reserveQuote, minReserveBase, feeBps })
      : quoteSell({ baseAmount: sizeX18, reserveBase, reserveQuote, minReserveQuote, feeBps });

    const signedDelta = isLong ? quote.actualBase : -quote.actualBase;
    const resultingSize = existingSizeX18 + signedDelta;
    const resultingAbsSize = abs(resultingSize);
    if (minPositionSize > 0n && resultingAbsSize > 0n && resultingAbsSize < minPositionSize) {
      return { ...ZERO_PREVIEW, ...quote, ok: false, reason: "Below minimum position size" };
    }
    if (maxPositionSize > 0n && resultingAbsSize > maxPositionSize) {
      return { ...ZERO_PREVIEW, ...quote, ok: false, reason: "Above maximum position size" };
    }

    const tradeAbsSize = quote.actualBase;
    const imrPrice = max(quote.postTradeMark, oraclePrice);
    const riskNotional = mulDivRoundUp(tradeAbsSize, imrPrice, WAD);
    const initialMargin = mulDiv(riskNotional, imrBps, BPS_DENOMINATOR);
    const notional = mulDivRoundUp(tradeAbsSize, quote.avgPrice, WAD);
    const fee = mulDivRoundUp(notional, feeBps, BPS_DENOMINATOR);
    const totalRequired = initialMargin + fee;
    const maintenanceMargin = mulDivRoundUp(mulDivRoundUp(resultingAbsSize, oraclePrice, WAD), mmrBps, BPS_DENOMINATOR);
    const marginGap = initialMargin > maintenanceMargin ? initialMargin - maintenanceMargin : 0n;
    const liqMove = tradeAbsSize > 0n ? mulDiv(marginGap, WAD, tradeAbsSize) : 0n;
    const liqPrice = isLong
      ? (quote.avgPrice > liqMove ? quote.avgPrice - liqMove : 0n)
      : quote.avgPrice + liqMove;
    const effectiveLeverageX18 = initialMargin > 0n ? mulDiv(notional, WAD, initialMargin) : 0n;
    const amountLimit = amountLimitFromPrice({ isLong, sizeX18: tradeAbsSize, limitPriceX18 });
    const limitInvalid = amountLimit > 0n && (isLong ? amountLimit < quote.quoteAmount : amountLimit > quote.quoteAmount);

    if (limitInvalid) {
      return {
        ...ZERO_PREVIEW,
        ...quote,
        ok: false,
        reason: isLong ? "Limit below executable cost" : "Limit above executable output",
        notional,
        fee,
        initialMargin,
        maintenanceMargin,
        totalRequired,
        effectiveLeverageX18,
        liqPrice,
        amountLimit,
      };
    }

    if (quoteFreeCollateral < totalRequired) {
      return {
        ...ZERO_PREVIEW,
        ...quote,
        ok: false,
        reason: "Insufficient quote collateral",
        notional,
        fee,
        initialMargin,
        maintenanceMargin,
        totalRequired,
        effectiveLeverageX18,
        liqPrice,
        amountLimit,
      };
    }

    return {
      ok: true,
      reason: null,
      actualBase: resultingAbsSize,
      quoteAmount: quote.quoteAmount,
      avgPrice: quote.avgPrice,
      postTradeMark: quote.postTradeMark,
      notional,
      fee,
      initialMargin,
      maintenanceMargin,
      totalRequired,
      effectiveLeverageX18,
      liqPrice,
      amountLimit,
    };
  } catch (error) {
    return { ...ZERO_PREVIEW, ok: false, reason: error.message || "Order unavailable" };
  }
}

export function findMaxOpenSize(params) {
  const upperByCollateral = params.oraclePrice && params.imrBps
    ? mulDiv(params.quoteFreeCollateral, BPS_DENOMINATOR * WAD, params.oraclePrice * params.imrBps)
    : 0n;
  let high = params.maxPositionSize && params.maxPositionSize > 0n
    ? params.maxPositionSize
    : upperByCollateral * 2n;
  if (high <= 0n) return 0n;

  const reserveCap = params.isLong && params.minReserveBase > 0n
    ? params.reserveBase > params.minReserveBase ? params.reserveBase - params.minReserveBase : 0n
    : params.reserveBase;
  if (params.isLong && reserveCap > 0n && high > reserveCap - 1n) high = reserveCap - 1n;

  let low = 0n;
  for (let i = 0; i < 96; i += 1) {
    if (low + 1n >= high) break;
    const mid = (low + high) / 2n;
    const preview = buildOpenOrderPreview({ ...params, sizeX18: mid, limitPriceX18: 0n });
    if (preview.ok) low = mid;
    else high = mid;
  }
  return low;
}

export function toNumberX18(value) {
  if (value == null) return 0;
  return Number(value) / 1e18;
}

export function formatX18Number(value, digits = 2) {
  return toNumberX18(value).toFixed(digits);
}
