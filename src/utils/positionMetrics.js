const WAD = 10n ** 18n;
const BPS = 10000n;

export const absPositionValue = (value) => {
  const raw = BigInt(value ?? 0n);
  return raw < 0n ? -raw : raw;
};

const mulDiv = (a, b, denominator) => denominator > 0n ? (a * b) / denominator : 0n;
const mulDivUp = (a, b, denominator) => {
  if (a === 0n || b === 0n || denominator === 0n) return 0n;
  return (a * b + denominator - 1n) / denominator;
};

export function calculateUnrealizedPnlRaw(sizeRaw, entryPriceRaw, priceRaw) {
  const size = BigInt(sizeRaw ?? 0n);
  const entry = BigInt(entryPriceRaw ?? 0n);
  const price = BigInt(priceRaw ?? 0n);
  if (size === 0n || entry === 0n || price === 0n) return 0n;
  const absoluteSize = absPositionValue(size);
  return size > 0n
    ? ((price - entry) * absoluteSize) / WAD
    : ((entry - price) * absoluteSize) / WAD;
}

export function calculatePendingFundingRaw({
  sizeRaw,
  currentPayRaw = 0n,
  currentReceiveRaw = 0n,
  lastPayRaw = 0n,
  lastReceiveRaw = 0n,
}) {
  const absoluteSize = absPositionValue(sizeRaw);
  if (absoluteSize === 0n) return 0n;
  const payDelta = BigInt(currentPayRaw ?? 0n) - BigInt(lastPayRaw ?? 0n);
  const receiveDelta = BigInt(currentReceiveRaw ?? 0n) - BigInt(lastReceiveRaw ?? 0n);
  return ((receiveDelta - payDelta) * absoluteSize) / WAD;
}

export function calculateFundingRate8hPercent({
  markPrice = 0,
  indexPrice = 0,
  kFunding = 0,
  frMaxBpsPerHour = 0,
}) {
  const mark = Number(markPrice);
  const index = Number(indexPrice);
  const sensitivity = Number(kFunding);
  const hourlyCapBps = Number(frMaxBpsPerHour);
  if (![mark, index, sensitivity, hourlyCapBps].every(Number.isFinite) || index <= 0) return 0;

  const premium = (mark - index) / index;
  const uncappedRate = sensitivity * premium * (8 / 24);
  const cap = Math.max(hourlyCapBps, 0) * 8 / 10000;
  return Math.max(-cap, Math.min(cap, uncappedRate)) * 100;
}

export function calculateCloseSettlementPreview({
  positionSize = 0,
  closeSize = 0,
  unrealizedPnl = 0,
  pendingFunding = 0,
  estimatedFee = 0,
}) {
  const absolutePositionSize = Math.abs(Number(positionSize) || 0);
  const requestedCloseSize = Math.max(Number(closeSize) || 0, 0);
  const closedFraction = absolutePositionSize > 0
    ? Math.min(requestedCloseSize / absolutePositionSize, 1)
    : 0;
  const closedPnl = (Number(unrealizedPnl) || 0) * closedFraction;
  const fullFundingSettlement = Number(pendingFunding) || 0;
  const pnlAndFunding = closedPnl + fullFundingSettlement;
  const fee = Math.max(Number(estimatedFee) || 0, 0);

  return {
    closedFraction,
    closedPnl,
    fullFundingSettlement,
    pnlAndFunding,
    estimatedNetEffect: pnlAndFunding - fee,
  };
}

export function calculatePostFundingMargin({
  currentMargin = 0,
  pendingFunding = 0,
  additionalMargin = 0,
}) {
  const marginBeforeFunding = Math.max(Number(currentMargin) || 0, 0);
  const fundingSettlement = Number(pendingFunding) || 0;
  const marginBeforeFloor = marginBeforeFunding + fundingSettlement;
  const fundingShortfall = Math.max(-marginBeforeFloor, 0);
  const settledPositionMargin = Math.max(marginBeforeFloor, 0);

  return {
    marginBeforeFunding,
    fundingSettlement,
    fundingShortfall,
    settledPositionMargin,
    positionMarginAfter: settledPositionMargin + Math.max(Number(additionalMargin) || 0, 0),
  };
}

export function calculatePositionMetrics({
  sizeRaw = 0n,
  marginRaw = 0n,
  entryPriceRaw = 0n,
  markPriceRaw = 0n,
  indexPriceRaw = 0n,
  mmrBps = 0n,
  currentPayRaw = 0n,
  currentReceiveRaw = 0n,
  lastPayRaw = 0n,
  lastReceiveRaw = 0n,
  effectiveMarginRaw,
  isLiquidatable = false,
}) {
  const size = BigInt(sizeRaw ?? 0n);
  const absoluteSize = absPositionValue(size);
  const margin = BigInt(marginRaw ?? 0n);
  const entry = BigInt(entryPriceRaw ?? 0n);
  const mark = BigInt(markPriceRaw ?? 0n);
  const index = BigInt(indexPriceRaw ?? 0n);
  const maintenanceBps = BigInt(mmrBps ?? 0n);
  const riskPriceRaw = mark > index ? mark : index;

  const entryNotionalRaw = mulDiv(absoluteSize, entry, WAD);
  const markNotionalRaw = mulDiv(absoluteSize, mark, WAD);
  const indexNotionalRaw = mulDivUp(absoluteSize, index, WAD);
  const riskNotionalRaw = mulDivUp(absoluteSize, riskPriceRaw, WAD);
  const markLeverageX18 = margin > 0n ? mulDiv(markNotionalRaw, WAD, margin) : 0n;
  const riskLeverageX18 = margin > 0n ? mulDiv(riskNotionalRaw, WAD, margin) : 0n;
  const unrealizedPnlRaw = calculateUnrealizedPnlRaw(size, entry, mark);
  const indexPnlRaw = calculateUnrealizedPnlRaw(size, entry, index);
  const pendingFundingRaw = calculatePendingFundingRaw({
    sizeRaw: size,
    currentPayRaw,
    currentReceiveRaw,
    lastPayRaw,
    lastReceiveRaw,
  });
  const positionPnlRaw = unrealizedPnlRaw + pendingFundingRaw;
  const roeX18 = margin > 0n ? (positionPnlRaw * WAD) / margin : 0n;
  const effectiveMargin = effectiveMarginRaw == null
    ? margin + indexPnlRaw + pendingFundingRaw
    : BigInt(effectiveMarginRaw);
  const maintenanceMarginRaw = mulDivUp(indexNotionalRaw, maintenanceBps, BPS);
  const liquidationBufferRaw = effectiveMargin - maintenanceMarginRaw;

  let liquidationPriceRaw = 0n;
  if (absoluteSize > 0n && entry > 0n && index > 0n && maintenanceBps > 0n && maintenanceBps < BPS) {
    // Recover the price-independent equity component from the contract's
    // effective margin, which already includes index PnL and pending funding.
    const marginPlusFundingRaw = effectiveMargin - indexPnlRaw;
    if (size > 0n) {
      const numerator = entryNotionalRaw - marginPlusFundingRaw;
      const denominator = absoluteSize * (BPS - maintenanceBps);
      if (numerator > 0n) liquidationPriceRaw = mulDivUp(numerator * WAD, BPS, denominator);
    } else {
      const numerator = entryNotionalRaw + marginPlusFundingRaw;
      const denominator = absoluteSize * (BPS + maintenanceBps);
      if (numerator > 0n) liquidationPriceRaw = mulDivUp(numerator * WAD, BPS, denominator);
    }
  }

  return {
    entryNotionalRaw,
    markNotionalRaw,
    indexNotionalRaw,
    riskPriceRaw,
    riskNotionalRaw,
    markLeverageX18,
    riskLeverageX18,
    leverageX18: markLeverageX18,
    unrealizedPnlRaw,
    indexPnlRaw,
    pendingFundingRaw,
    positionPnlRaw,
    roeX18,
    effectiveMarginRaw: effectiveMargin,
    maintenanceMarginRaw,
    liquidationBufferRaw,
    liquidationPriceRaw,
    isLiquidatable: Boolean(isLiquidatable),
  };
}
