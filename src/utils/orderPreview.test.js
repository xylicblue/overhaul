import test from "node:test";
import assert from "node:assert/strict";
import {
  buildOpenOrderPreview,
  calculateLeverageX18,
  calculateMarginTopUp,
  calculateNormalizedMaxLeverageX18,
  calculateTargetMargin,
  estimateLiquidationPrice,
  findMaxOpenSize,
  floorLeverageX18ToInteger,
  projectPositionAfterTrade,
} from "./orderPreview.js";

const WAD = 10n ** 18n;
const x18 = (value) => BigInt(value) * WAD;
const decimalX18 = (whole, fraction = 0n) => BigInt(whole) * WAD + BigInt(fraction);
const divUp = (a, b) => (a + b - 1n) / b;

test("calculates target margin and leverage for a new T4-style position", () => {
  const size = x18(100);
  const price = decimalX18(0, 45n * 10n ** 16n);
  const leverage = x18(5);

  const margin = calculateTargetMargin({ sizeX18: size, riskPriceX18: price, targetLeverageX18: leverage });
  assert.equal(margin, x18(9));
  assert.equal(calculateLeverageX18({ sizeX18: size, marginX18: margin, riskPriceX18: price }), leverage);
});

test("same-side increases apply target leverage to the whole resulting position", () => {
  const projection = projectPositionAfterTrade({
    existingSizeX18: x18(100),
    existingMarginX18: x18(9),
    existingEntryPriceX18: decimalX18(0, 45n * 10n ** 16n),
    signedBaseDeltaX18: x18(50),
    executionPriceX18: decimalX18(0, 5n * 10n ** 17n),
    riskPriceX18: decimalX18(0, 5n * 10n ** 17n),
    imrBps: 1000n,
  });

  assert.equal(projection.resultingSize, x18(150));
  assert.equal(projection.automaticMargin, decimalX18(2, 5n * 10n ** 17n));
  assert.equal(projection.projectedMargin, decimalX18(11, 5n * 10n ** 17n));

  const topUp = calculateMarginTopUp({
    sizeX18: projection.resultingSize,
    marginX18: projection.projectedMargin,
    riskPriceX18: decimalX18(0, 5n * 10n ** 17n),
    targetLeverageX18: x18(5),
  });
  assert.equal(topUp, decimalX18(3, 5n * 10n ** 17n));
});

test("partial reductions target only the remaining position", () => {
  const projection = projectPositionAfterTrade({
    existingSizeX18: x18(100),
    existingMarginX18: x18(10),
    existingEntryPriceX18: decimalX18(0, 45n * 10n ** 16n),
    signedBaseDeltaX18: -x18(40),
    executionPriceX18: decimalX18(0, 4n * 10n ** 17n),
    riskPriceX18: decimalX18(0, 45n * 10n ** 16n),
    imrBps: 1000n,
  });

  assert.equal(projection.resultingSize, x18(60));
  assert.equal(projection.realizedPnl, -x18(2));
  assert.equal(projection.marginReleased, decimalX18(3, 2n * 10n ** 17n));
  assert.equal(projection.projectedMargin, decimalX18(4, 8n * 10n ** 17n));
});

test("flips calculate automatic margin from net new exposure", () => {
  const projection = projectPositionAfterTrade({
    existingSizeX18: x18(100),
    existingMarginX18: x18(10),
    existingEntryPriceX18: decimalX18(0, 45n * 10n ** 16n),
    signedBaseDeltaX18: -x18(150),
    executionPriceX18: decimalX18(0, 4n * 10n ** 17n),
    riskPriceX18: decimalX18(0, 45n * 10n ** 16n),
    imrBps: 1000n,
  });

  assert.equal(projection.resultingSize, -x18(50));
  assert.equal(projection.resultingEntryPrice, decimalX18(0, 4n * 10n ** 17n));
  assert.equal(projection.automaticMargin, decimalX18(2, 25n * 10n ** 16n));
  assert.equal(projection.projectedMargin, projection.automaticMargin);
});

test("additional target margin moves a long liquidation estimate farther away", () => {
  const common = {
    sizeX18: x18(100),
    entryPriceX18: decimalX18(0, 45n * 10n ** 16n),
    mmrBps: 500n,
  };
  const maxLeveragePrice = estimateLiquidationPrice({ ...common, marginX18: decimalX18(4, 5n * 10n ** 17n) });
  const lowerLeveragePrice = estimateLiquidationPrice({ ...common, marginX18: x18(9) });
  assert.ok(lowerLeveragePrice < maxLeveragePrice);
});

test("order preview includes selected leverage in collateral and liquidation estimates", () => {
  const preview = buildOpenOrderPreview({
    isLong: true,
    sizeX18: x18(100),
    reserveBase: x18(10_000),
    reserveQuote: x18(4_500),
    feeBps: 10n,
    imrBps: 1000n,
    mmrBps: 500n,
    oraclePrice: decimalX18(0, 45n * 10n ** 16n),
    quoteFreeCollateral: x18(100),
    targetLeverageX18: x18(5),
  });

  assert.equal(preview.ok, true);
  assert.ok(preview.extraMargin > 0n);
  assert.equal(preview.finalMargin, preview.targetMargin);
  assert.equal(preview.displayLeverageX18, x18(5));
  assert.ok(preview.effectiveLeverageX18 <= x18(5));
  assert.ok(preview.liqPrice > 0n);
});

test("normalized max leverage floors decimal caps to an integer", () => {
  const normalized = calculateNormalizedMaxLeverageX18({
    protocolMaxLeverageX18: x18(10),
    markPriceX18: decimalX18(4, 4n * 10n ** 16n),
    indexPriceX18: decimalX18(4, 18n * 10n ** 16n),
  });

  assert.equal(floorLeverageX18ToInteger(normalized), 9);
});

test("decimal selected leverage targets mark notional margin", () => {
  const selectedLeverage = decimalX18(7, 25n * 10n ** 16n);
  const preview = buildOpenOrderPreview({
    isLong: true,
    sizeX18: x18(100),
    reserveBase: x18(100_000),
    reserveQuote: x18(404_000),
    feeBps: 10n,
    imrBps: 1000n,
    mmrBps: 500n,
    oraclePrice: decimalX18(4, 18n * 10n ** 16n),
    quoteFreeCollateral: x18(100),
    targetLeverageX18: selectedLeverage,
  });

  assert.equal(preview.ok, true);
  assert.equal(preview.targetMargin, divUp(preview.displayNotional * WAD, selectedLeverage));
  assert.ok(selectedLeverage - preview.displayLeverageX18 <= 1n);
  assert.ok(preview.effectiveLeverageX18 > preview.displayLeverageX18);
  assert.ok(preview.effectiveLeverageX18 <= x18(10));
});

test("maximum protocol leverage does not create a dust-sized second transaction", () => {
  const preview = buildOpenOrderPreview({
    isLong: true,
    sizeX18: x18(101),
    reserveBase: x18(10_000),
    reserveQuote: x18(4_500),
    feeBps: 10n,
    imrBps: 1000n,
    mmrBps: 500n,
    oraclePrice: decimalX18(0, 45n * 10n ** 16n),
    quoteFreeCollateral: x18(100),
    targetLeverageX18: x18(10),
  });

  assert.equal(preview.ok, true);
  assert.equal(preview.extraMargin, 0n);
});

test("lower selected leverage reduces the maximum executable order size", () => {
  const common = {
    isLong: true,
    reserveBase: x18(10_000),
    reserveQuote: x18(4_500),
    feeBps: 10n,
    imrBps: 1000n,
    mmrBps: 500n,
    oraclePrice: decimalX18(0, 45n * 10n ** 16n),
    quoteFreeCollateral: x18(100),
  };

  const maxAtFive = findMaxOpenSize({ ...common, targetLeverageX18: x18(5) });
  const maxAtTen = findMaxOpenSize({ ...common, targetLeverageX18: x18(10) });
  assert.ok(maxAtFive > 0n);
  assert.ok(maxAtFive < maxAtTen);
});

test("a full reduction does not request a leverage margin top-up", () => {
  const preview = buildOpenOrderPreview({
    isLong: false,
    sizeX18: x18(100),
    reserveBase: x18(10_000),
    reserveQuote: x18(4_500),
    feeBps: 10n,
    imrBps: 1000n,
    mmrBps: 500n,
    oraclePrice: decimalX18(0, 45n * 10n ** 16n),
    quoteFreeCollateral: x18(1),
    existingSizeX18: x18(100),
    existingMarginX18: x18(10),
    existingEntryPriceX18: decimalX18(0, 45n * 10n ** 16n),
    targetLeverageX18: x18(2),
  });

  assert.equal(preview.ok, true);
  assert.equal(preview.resultingSize, 0n);
  assert.equal(preview.extraMargin, 0n);
  assert.equal(preview.finalMargin, 0n);
});
