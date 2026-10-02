import test from "node:test";
import assert from "node:assert/strict";
import { parseUnits } from "ethers";
import {
  calculateCloseSettlementPreview,
  calculateFundingRate8hPercent,
  calculatePendingFundingRaw,
  calculatePostFundingMargin,
  calculatePositionMetrics,
} from "./positionMetrics.js";

const x18 = (value) => parseUnits(value, 18);

test("risk notional uses index while displayed leverage uses mark when index is higher", () => {
  const result = calculatePositionMetrics({
    sizeRaw: x18("2"),
    marginRaw: x18("2"),
    entryPriceRaw: x18("4"),
    markPriceRaw: x18("5"),
    indexPriceRaw: x18("7"),
    mmrBps: 500n,
  });

  assert.equal(result.markNotionalRaw, x18("10"));
  assert.equal(result.riskNotionalRaw, x18("14"));
  assert.equal(result.markLeverageX18, x18("5"));
  assert.equal(result.riskLeverageX18, x18("7"));
  assert.equal(result.leverageX18, x18("5"));
  assert.equal(result.unrealizedPnlRaw, x18("2"));
  assert.equal(result.positionPnlRaw, x18("2"));
});

test("risk notional and leverage use mark when mark is higher", () => {
  const result = calculatePositionMetrics({
    sizeRaw: x18("2"),
    marginRaw: x18("2"),
    entryPriceRaw: x18("4"),
    markPriceRaw: x18("6"),
    indexPriceRaw: x18("5"),
    mmrBps: 500n,
  });

  assert.equal(result.riskPriceRaw, x18("6"));
  assert.equal(result.riskNotionalRaw, x18("12"));
  assert.equal(result.leverageX18, x18("6"));
  assert.equal(result.riskLeverageX18, x18("6"));
});

test("position PnL contains mark PnL and pending funding without estimated fees", () => {
  const result = calculatePositionMetrics({
    sizeRaw: x18("4"),
    marginRaw: x18("10"),
    entryPriceRaw: x18("5"),
    markPriceRaw: x18("6"),
    indexPriceRaw: x18("6"),
    mmrBps: 500n,
    currentPayRaw: x18("0.3"),
    currentReceiveRaw: x18("0.5"),
    lastPayRaw: x18("0.1"),
    lastReceiveRaw: x18("0.2"),
  });

  assert.equal(result.unrealizedPnlRaw, x18("4"));
  assert.equal(result.pendingFundingRaw, x18("0.4"));
  assert.equal(result.positionPnlRaw, x18("4.4"));
  assert.equal(result.roeX18, x18("0.44"));
});

test("pending funding supports separate pay and receive accumulators", () => {
  assert.equal(calculatePendingFundingRaw({
    sizeRaw: x18("4"),
    currentPayRaw: x18("0.3"),
    currentReceiveRaw: x18("0.5"),
    lastPayRaw: x18("0.1"),
    lastReceiveRaw: x18("0.2"),
  }), x18("0.4"));
});

test("display funding rate follows the contract sensitivity and eight-hour cap", () => {
  assert.equal(calculateFundingRate8hPercent({
    markPrice: 110,
    indexPrice: 100,
    kFunding: 0.3,
    frMaxBpsPerHour: 5,
  }), 0.4);

  assert.equal(calculateFundingRate8hPercent({
    markPrice: 90,
    indexPrice: 100,
    kFunding: 0.3,
    frMaxBpsPerHour: 5,
  }), -0.4);
});

test("partial close preview settles full-position funding and prorates only PnL", () => {
  const result = calculateCloseSettlementPreview({
    positionSize: 4,
    closeSize: 1,
    unrealizedPnl: 8,
    pendingFunding: -3,
    estimatedFee: 0.25,
  });

  assert.equal(result.closedFraction, 0.25);
  assert.equal(result.closedPnl, 2);
  assert.equal(result.fullFundingSettlement, -3);
  assert.equal(result.pnlAndFunding, -1);
  assert.equal(result.estimatedNetEffect, -1.25);
});

test("post-funding margin applies funding before adding margin", () => {
  assert.deepEqual(calculatePostFundingMargin({
    currentMargin: 10,
    pendingFunding: -3,
    additionalMargin: 5,
  }), {
    marginBeforeFunding: 10,
    fundingSettlement: -3,
    fundingShortfall: 0,
    settledPositionMargin: 7,
    positionMarginAfter: 12,
  });
});

test("post-funding margin floors at zero and reports contract shortfall", () => {
  assert.deepEqual(calculatePostFundingMargin({
    currentMargin: 2,
    pendingFunding: -5,
    additionalMargin: 4,
  }), {
    marginBeforeFunding: 2,
    fundingSettlement: -5,
    fundingShortfall: 3,
    settledPositionMargin: 0,
    positionMarginAfter: 4,
  });
});

test("long liquidation estimate uses effective margin, index PnL, and market MMR", () => {
  const result = calculatePositionMetrics({
    sizeRaw: x18("1"),
    marginRaw: x18("2"),
    entryPriceRaw: x18("10"),
    markPriceRaw: x18("11"),
    indexPriceRaw: x18("9"),
    mmrBps: 1000n,
    effectiveMarginRaw: x18("1"),
  });

  assert.equal(result.liquidationPriceRaw, x18("8.888888888888888889"));
});

test("short liquidation estimate uses effective margin, index PnL, and market MMR", () => {
  const result = calculatePositionMetrics({
    sizeRaw: -x18("1"),
    marginRaw: x18("2"),
    entryPriceRaw: x18("10"),
    markPriceRaw: x18("9"),
    indexPriceRaw: x18("11"),
    mmrBps: 1000n,
    effectiveMarginRaw: x18("1"),
  });

  assert.equal(result.liquidationPriceRaw, x18("10.909090909090909091"));
});

test("incomplete liquidation inputs do not invent a liquidation price", () => {
  const result = calculatePositionMetrics({
    sizeRaw: x18("1"),
    marginRaw: x18("2"),
    entryPriceRaw: x18("10"),
    markPriceRaw: 0n,
    indexPriceRaw: 0n,
    mmrBps: 500n,
  });

  assert.equal(result.riskNotionalRaw, 0n);
  assert.equal(result.liquidationPriceRaw, 0n);
});
