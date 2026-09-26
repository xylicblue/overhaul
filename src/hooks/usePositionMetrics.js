import { useMemo } from "react";
import { formatUnits } from "ethers";
import { useAccount } from "wagmi";
import { useLiquidationStatus } from "./useClearingHouse";
import { useFundingRate, useMarkPrice } from "./useVAMM";
import { calculateFundingRate8hPercent, calculatePositionMetrics } from "../utils/positionMetrics";

const toNumberX18 = (value) => Number(formatUnits(value ?? 0n, 18));

export function usePositionMetrics(position) {
  const { address } = useAccount();
  const mark = useMarkPrice(position?.vammAddress);
  const funding = useFundingRate(position?.vammAddress);
  const liquidation = useLiquidationStatus(position?.marketId, address);
  const selectedPayRaw = position?.isLong ? funding.longPayRaw : funding.shortPayRaw;
  const selectedReceiveRaw = position?.isLong ? funding.longReceiveRaw : funding.shortReceiveRaw;
  const fundingReady = selectedPayRaw != null && selectedReceiveRaw != null;

  const metrics = useMemo(() => calculatePositionMetrics({
    sizeRaw: position?.sizeRaw ?? 0n,
    marginRaw: position?.marginRaw ?? 0n,
    entryPriceRaw: position?.entryPriceRaw ?? position?.entryPriceX18Raw ?? 0n,
    markPriceRaw: mark.priceRaw ?? 0n,
    indexPriceRaw: liquidation.riskPriceRaw ?? 0n,
    mmrBps: BigInt(liquidation.mmrBps ?? 0),
    currentPayRaw: fundingReady ? selectedPayRaw : position?.lastFundingPayIndexRaw,
    currentReceiveRaw: fundingReady ? selectedReceiveRaw : position?.lastFundingReceiveIndexRaw,
    lastPayRaw: position?.lastFundingPayIndexRaw ?? 0n,
    lastReceiveRaw: position?.lastFundingReceiveIndexRaw ?? 0n,
    effectiveMarginRaw: liquidation.effectiveMarginRaw,
    isLiquidatable: liquidation.isLiquidatable,
  }), [
    position?.sizeRaw,
    position?.marginRaw,
    position?.entryPriceRaw,
    position?.entryPriceX18Raw,
    position?.lastFundingPayIndexRaw,
    position?.lastFundingReceiveIndexRaw,
    fundingReady,
    selectedPayRaw,
    selectedReceiveRaw,
    mark.priceRaw,
    liquidation.riskPriceRaw,
    liquidation.mmrBps,
    liquidation.effectiveMarginRaw,
    liquidation.isLiquidatable,
  ]);

  const hasMarkPrice = Boolean(mark.priceRaw);
  const hasIndexPrice = Boolean(liquidation.riskPriceRaw);
  const hasRiskData = hasMarkPrice && hasIndexPrice;
  const hasPnlData = hasMarkPrice && fundingReady;
  const hasLiquidationData = hasIndexPrice && !liquidation.isLoading && !liquidation.error;
  const markPrice = toNumberX18(mark.priceRaw);
  const indexPrice = toNumberX18(liquidation.riskPriceRaw);
  const kFunding = Number.parseFloat(funding.kFundingX18 || "0");
  const fundingRate8hPercent = calculateFundingRate8hPercent({
    markPrice,
    indexPrice,
    kFunding,
    frMaxBpsPerHour: funding.frMaxBpsPerHour,
  });
  const fundingPayer = fundingRate8hPercent > 0
    ? "Longs pay shorts"
    : fundingRate8hPercent < 0
      ? "Shorts pay longs"
      : "No funding transfer";
  const marginRatioPercent = liquidation.marginRatio == null
    ? null
    : Number.parseFloat(liquidation.marginRatio) * 100;
  const maintenanceMarginPercent = Number(liquidation.mmrBps || 0) / 100;
  const marginRatioDistancePercent = marginRatioPercent == null
    ? null
    : marginRatioPercent - maintenanceMarginPercent;
  const metricTimestamps = [
    mark.lastUpdatedAt,
    funding.lastUpdatedAt,
    liquidation.lastUpdatedAt,
  ].filter((timestamp) => timestamp > 0);
  const lastUpdatedAt = metricTimestamps.length ? Math.min(...metricTimestamps) : 0;

  const refetch = () => Promise.allSettled([
    mark.refetch?.(),
    funding.refetch?.(),
    liquidation.refetch?.(),
  ]);

  return {
    ...metrics,
    markPrice,
    indexPrice,
    riskPrice: toNumberX18(metrics.riskPriceRaw),
    markNotional: toNumberX18(metrics.markNotionalRaw),
    entryPrice: toNumberX18(position?.entryPriceRaw ?? position?.entryPriceX18Raw),
    margin: toNumberX18(position?.marginRaw),
    riskNotional: toNumberX18(metrics.riskNotionalRaw),
    riskLeverage: toNumberX18(metrics.riskLeverageX18),
    markLeverage: toNumberX18(metrics.markLeverageX18),
    leverage: toNumberX18(metrics.leverageX18),
    unrealizedPnl: toNumberX18(metrics.unrealizedPnlRaw),
    pendingFunding: toNumberX18(metrics.pendingFundingRaw),
    positionPnl: toNumberX18(metrics.positionPnlRaw),
    effectiveMargin: toNumberX18(metrics.effectiveMarginRaw),
    maintenanceMargin: toNumberX18(metrics.maintenanceMarginRaw),
    roePercent: toNumberX18(metrics.roeX18) * 100,
    liquidationPrice: toNumberX18(metrics.liquidationPriceRaw),
    liquidationBuffer: toNumberX18(metrics.liquidationBufferRaw),
    marginRatioPercent,
    maintenanceMarginPercent,
    marginRatioDistancePercent,
    fundingRate8hPercent,
    fundingPayer,
    lastUpdatedAt,
    refetch,
    hasMarkPrice,
    hasIndexPrice,
    hasRiskData,
    hasPnlData,
    hasLiquidationData,
    isLoading: mark.isLoading || liquidation.isLoading,
    error: mark.error || liquidation.error || null,
  };
}
