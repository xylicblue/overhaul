import React, { useState, useEffect, useMemo, useRef } from "react";
import { useTradingStore } from "./stores/useTradingStore";
import ReactDOM from "react-dom";
import { toast } from "react-hot-toast";
import { useAccount, useReadContract } from "wagmi";
import { supabase } from "./creatclient";
import { recordTradeWithRetry } from "./services/tradeQueue";
import { useMarketRealTimeData } from "./marketData";
import {
  useOpenPosition,
  useAccountValue,
  useMarketRiskParams,
  useVaultBalance,
} from "./hooks/useClearingHouse";
import { MARKET_IDS, SEPOLIA_CONTRACTS } from "./contracts/addresses";
import MarketRegistryABI from "./contracts/abis/MarketRegistry.json";
import { Info, ShieldCheck } from "lucide-react";
import { formatTransactionError, getSepoliaTxUrl } from "./utils/transactionErrors";

const BPS_DENOMINATOR = 10000;
const DEFAULT_IMR_BPS = 1000;
const DEFAULT_MMR_BPS = 500;
const DEFAULT_FEE_BPS = 10;
const ORDER_HEADROOM_BPS = 100;
const PRICE_IMPACT_BUFFER_BPS = 50;

const toNumber = (value) => {
  if (typeof value === "string") {
    const normalized = value.replace(/[$,\s]/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

// ─────────────────────────────────────────────────────────────────────────────
// Info Tooltip
// ─────────────────────────────────────────────────────────────────────────────
const InfoTooltip = ({ title, description }) => {
  const [pos, setPos]         = React.useState({ top: 0, left: 0 });
  const [hovered, setHovered] = React.useState(false);
  const ref                   = React.useRef(null);

  const handleMouseEnter = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.right - 220 });
      setHovered(true);
    }
  };

  return (
    <>
      <span
        ref={ref}
        className="inline-flex text-zinc-700 hover:text-zinc-500 cursor-help transition-colors"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setHovered(false)}
      >
        <Info size={11} />
      </span>
      {hovered && ReactDOM.createPortal(
        <div
          className="fixed z-[200] w-56 p-3 bg-[#0e0e18] border border-zinc-700/50 rounded-xl shadow-2xl text-xs pointer-events-none"
          style={{ top: `${pos.top}px`, left: `${pos.left}px` }}
        >
          <div className="font-semibold text-white mb-1">{title}</div>
          <div className="text-zinc-400 leading-relaxed">{description}</div>
        </div>,
        document.body
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SummaryRow — single label/value line used in order summary & risk params
// ─────────────────────────────────────────────────────────────────────────────
const SummaryRow = ({ label, value, valueClass = "text-zinc-200", tooltip }) => (
  <div className="flex items-center justify-between text-[11px] leading-5">
    <span className="text-zinc-500 flex items-center gap-1">
      {label}
      {tooltip && <InfoTooltip title={tooltip.title} description={tooltip.desc} />}
    </span>
    <span className={`font-mono tabular-nums ${valueClass}`}>{value}</span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// SectionLabel — small uppercase label used to group sections
// ─────────────────────────────────────────────────────────────────────────────
const SectionLabel = ({ children, right }) => (
  <div className="flex items-center justify-between mb-2">
    <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-[0.14em]">{children}</span>
    {right}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// TradingPanel
// ─────────────────────────────────────────────────────────────────────────────
export const TradingPanel = ({ selectedMarket }) => {
  const { side, size, priceLimit, lastTxHash,
          setSide, setSize, setPriceLimit,
          resetOrder, setLastTx } = useTradingStore();
  const { address }               = useAccount();
  const [leverage, setLeverage]   = useState(5);

  const marketId                 = selectedMarket?.marketId || MARKET_IDS["H100-PERP"];
  const { accountValue, accountValueRaw } = useAccountValue();
  const { totalCollateralValue } = useVaultBalance();
  const { riskParams }           = useMarketRiskParams(marketId);
  const { data: marketConfig }   = useReadContract({
    address: SEPOLIA_CONTRACTS.marketRegistry,
    abi: MarketRegistryABI.abi,
    functionName: "getMarket",
    args: [marketId],
    chainId: 11155111,
    query: {
      enabled: !!marketId,
      refetchInterval: 30000,
    },
  });

  const {
    openPosition,
    isPending,
    isConfirming,
    isSuccess,
    error: tradeError,
    receiptError,
    hash,
    reset: resetTrade,
  } = useOpenPosition(marketId);

  const marketName = typeof selectedMarket === "string" ? selectedMarket : selectedMarket?.name;
  const { data: market, isLoading, error } = useMarketRealTimeData(marketName);

  const isLong = side === "Buy";
  const submittedOpenOrderRef = useRef(null);

  // ── Calculations (memoised — only rerun when inputs actually change) ───────
  const {
    effectiveBalance, currentPrice, marketPrice,
    maxSize, sizeNum, notionalValue, fees, marginRequired, collateralRequired,
    derivedLeverage, riskPrice, feeBps, liqPrice, isOverMax,
  } = useMemo(() => {
    const accountValueNum = toNumber(accountValue);
    const vaultBalanceNum = toNumber(totalCollateralValue);
    const hasAccountValue = accountValueRaw !== undefined && accountValueRaw !== null;
    const effectiveBalance = hasAccountValue
      ? Math.max(accountValueNum, 0)
      : Math.max(vaultBalanceNum, 0);

    const currentPrice  = toNumber(market?.markPriceRaw);
    const indexPrice    = toNumber(market?.oraclePriceRaw);
    const marketPrice   = toNumber(market?.price) || currentPrice || indexPrice;
    const limitPrice    = toNumber(priceLimit);
    const executionPrice = limitPrice > 0 ? limitPrice : marketPrice;
    const riskPrice     = Math.max(currentPrice, indexPrice, executionPrice);
    const imrBps        = Number(riskParams?.imrBps || DEFAULT_IMR_BPS);
    const mmrBps        = Number(riskParams?.mmrBps || DEFAULT_MMR_BPS);
    const feeBps        = Number(marketConfig?.feeBps ?? marketConfig?.[1] ?? selectedMarket?.feeBps ?? market?.feeBps ?? DEFAULT_FEE_BPS);
    const executionBuffer = 1 + PRICE_IMPACT_BUFFER_BPS / BPS_DENOMINATOR;
    const marginRiskPrice = riskPrice * executionBuffer;
    const availableForOrder = effectiveBalance * (1 - ORDER_HEADROOM_BPS / BPS_DENOMINATOR);
    const marginPerUnit = marginRiskPrice * imrBps / BPS_DENOMINATOR;
    const feePerUnit = executionPrice * feeBps / BPS_DENOMINATOR * executionBuffer;
    const maxSize = marginPerUnit + feePerUnit > 0
      ? availableForOrder / (marginPerUnit + feePerUnit)
      : 0;

    const sizeNum = toNumber(size);
    const notionalValue = sizeNum * executionPrice;
    const riskNotional = sizeNum * marginRiskPrice;
    const fees = notionalValue * feeBps / BPS_DENOMINATOR * executionBuffer;
    const marginRequired = riskNotional * imrBps / BPS_DENOMINATOR;
    const collateralRequired = marginRequired + fees;
    const derivedLeverage = marginRequired > 0 ? notionalValue / marginRequired : 0;
    const maintenanceMargin = riskNotional * mmrBps / BPS_DENOMINATOR;
    const liqPrice = executionPrice > 0 && sizeNum > 0
      ? isLong
        ? (executionPrice - (marginRequired - maintenanceMargin) / sizeNum).toFixed(2)
        : (executionPrice + (marginRequired - maintenanceMargin) / sizeNum).toFixed(2)
      : "—";
    const isOverMax = sizeNum > 0 && (sizeNum > maxSize || collateralRequired > effectiveBalance);

    return {
      effectiveBalance,
      currentPrice,
      marketPrice: executionPrice,
      maxSize,
      sizeNum,
      notionalValue,
      fees,
      marginRequired,
      collateralRequired,
      derivedLeverage,
      riskPrice: marginRiskPrice,
      feeBps,
      liqPrice,
      isOverMax,
    };
  }, [accountValue, totalCollateralValue, market?.markPriceRaw, market?.price,
      market?.oraclePriceRaw, market?.feeBps, priceLimit, riskParams?.imrBps,
      riskParams?.mmrBps, marketConfig, selectedMarket?.feeBps, size, isLong, accountValueRaw]);

  // ── Trade success ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (hash && isConfirming && hash !== lastTxHash) {
      toast.loading(
        <div>
          <div>Submitted, waiting for confirmation...</div>
          <a href={getSepoliaTxUrl(hash)} target="_blank" rel="noopener noreferrer" className="underline text-sm">
            View on Etherscan
          </a>
        </div>,
        { id: "trade" }
      );
    }
  }, [hash, isConfirming, lastTxHash]);

  useEffect(() => {
    if (isSuccess && hash && hash !== lastTxHash) {
      const submittedOrder = submittedOpenOrderRef.current;
      const openedSideLabel = submittedOrder?.sideLabel || "Position";
      setLastTx(hash, submittedOrder?.txActionText || openedSideLabel);
      toast.success(
        <div>
          <div>{openedSideLabel} opened.</div>
          <a href={getSepoliaTxUrl(hash)} target="_blank" rel="noopener noreferrer" className="underline text-sm">
            View on Etherscan
          </a>
        </div>,
        { id: "trade", duration: 5000 }
      );
      const saveTrade = async () => {
        if (!address || !submittedOrder) return;
        await recordTradeWithRetry(
          {
            userAddress: address,
            market: submittedOrder.marketDisplayName,
            side: submittedOrder.sideLabel,
            size: submittedOrder.sizeNum,
            price: submittedOrder.marketPrice,
            notional: submittedOrder.notional,
            txHash: hash,
          },
          {
            market: submittedOrder.marketKey,
            price: submittedOrder.markRaw || submittedOrder.marketPrice,
            twap: submittedOrder.twapRaw || submittedOrder.markRaw || 0,
            timestamp: new Date().toISOString(),
          }
        );
      };
      saveTrade();
      resetOrder();
      setTimeout(() => resetTrade(), 100);
    }
  }, [isSuccess, hash, lastTxHash, address, resetTrade, setLastTx, resetOrder]);

  // ── Trade error ───────────────────────────────────────────────────────────
  useEffect(() => {
    const failure = tradeError || receiptError;
    if (failure) {
      toast.error(formatTransactionError(failure, { action: "open" }), { id: "trade" });
      resetTrade();
    }
  }, [tradeError, receiptError, resetTrade]);

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!selectedMarket) return <div className="flex items-center justify-center h-full text-zinc-600 text-xs">Select a market</div>;
  if (isLoading)        return <div className="flex items-center justify-center h-full text-zinc-600 text-xs">Loading…</div>;
  if (error || !market) return <div className="flex items-center justify-center h-full text-red-500 text-xs">Error loading market</div>;

  const handleSizeButtonClick = (pct) => {
    const calc = maxSize * (pct / 100);
    setSize(calc > 0 ? calc.toFixed(4) : "");
  };

  const handleTrade = async () => {
    if (!size || sizeNum <= 0) return toast.error("Please enter a valid size");
    if (isOverMax) return toast.error("Order exceeds available collateral after IMR and fees");
    try {
      const priceLimitValue = priceLimit && parseFloat(priceLimit) > 0 ? parseFloat(priceLimit) : 0;
      submittedOpenOrderRef.current = {
        sideLabel: isLong ? "Long" : "Short",
        isLong,
        sizeNum,
        marketDisplayName: market.displayName || market.name,
        marketName: market.name,
        marketKey: market.name,
        marketPrice,
        markRaw: parseFloat(market.markPriceRaw) || marketPrice,
        twapRaw: parseFloat(market.twapRaw) || parseFloat(market.markPriceRaw) || 0,
        notional: notionalValue,
        txActionText: side,
      };
      toast.loading("Review order transaction in wallet...", { id: "trade" });
      openPosition(isLong, size, priceLimitValue);
    } catch (err) {
      toast.error(formatTransactionError(err, { action: "open" }), { id: "trade" });
    }
  };

  const sideAccent = isLong ? "text-emerald-400" : "text-red-400";

  return (
    <div className="flex flex-col h-full bg-[#06060a]">

      {/* ── Direction toggle ────────────────────────────────────────────── */}
      <div className="px-3 pt-3 pb-3 border-b border-zinc-800/80">
        <div className="grid grid-cols-2 gap-px bg-zinc-800/80 rounded-md overflow-hidden p-px">
          <button
            onClick={() => setSide("Buy")}
            className={`py-1.5 text-[12px] font-medium transition-colors duration-100 ${
              isLong
                ? "bg-emerald-500 text-white"
                : "bg-[#06060a] text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Long
          </button>
          <button
            onClick={() => setSide("Sell")}
            className={`py-1.5 text-[12px] font-medium transition-colors duration-100 ${
              !isLong
                ? "bg-red-500 text-white"
                : "bg-[#06060a] text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Short
          </button>
        </div>
      </div>

      {/* ── Scrollable body ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">

        {/* Key stats row */}
        <div className="grid grid-cols-3 px-3 py-2.5 border-b border-zinc-800/80">
          {[
            { label: "Balance", value: `$${effectiveBalance.toFixed(2)}`,                      align: "items-start" },
            { label: "Mark",    value: currentPrice > 0 ? `$${currentPrice.toFixed(2)}` : "—", align: "items-center" },
            { label: "Max",     value: maxSize > 0 ? maxSize.toFixed(2) : "—",                 align: "items-end" },
          ].map(({ label, value, align }) => (
            <div key={label} className={`flex flex-col ${align}`}>
              <span className="text-[9px] font-medium text-zinc-500 uppercase tracking-[0.14em]">{label}</span>
              <span className="text-[12px] font-mono font-medium text-zinc-200 tabular-nums truncate mt-0.5">{value}</span>
            </div>
          ))}
        </div>

        {/* Order */}
        <div className="px-3 py-3 border-b border-zinc-800/80 space-y-3">
          <SectionLabel
            right={
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-white font-medium">Market</span>
                <span className="text-zinc-700 cursor-not-allowed">Limit<span className="ml-1 text-[9px] text-zinc-700">soon</span></span>
              </div>
            }
          >
            Order
          </SectionLabel>

          {/* Size */}
          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-[0.14em]">Size</label>
              <span className="text-[10px] text-zinc-500 font-mono tabular-nums">
                Max {maxSize > 0 ? maxSize.toFixed(2) : "0.00"} {market.baseAsset}
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                placeholder="0.0000"
                className="w-full bg-white/[0.02] border border-white/[0.06] rounded-md pl-3 pr-16 py-2 text-[13px] text-white focus:outline-none focus:border-white/[0.16] transition-colors duration-150 placeholder-zinc-700 font-mono tabular-nums"
                value={size}
                onChange={e => setSize(e.target.value)}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-zinc-500">
                {market.baseAsset}
              </span>
            </div>
            {/* Size slider — 0 to maxSize, tick dots at 0/25/50/75/100% */}
            <div className="flex items-center gap-3 mt-3">
              <div className="flex-1 relative h-5 flex items-center">
                <div className="relative w-full h-[2px] bg-zinc-800 rounded-full">
                  {/* Fill */}
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-white/70"
                    style={{ width: maxSize > 0 ? `${Math.min(100, (sizeNum / maxSize) * 100)}%` : "0%" }}
                  />
                  {/* Tick dots at 0, 25, 50, 75, 100% */}
                  {[0, 25, 50, 75, 100].map(pct => {
                    const filled = maxSize > 0 && (sizeNum / maxSize) * 100 >= pct && sizeNum > 0;
                    return (
                      <div
                        key={pct}
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-[3px] h-[3px] rounded-full pointer-events-none"
                        style={{
                          left: `${pct}%`,
                          backgroundColor: filled ? "rgba(255,255,255,0.8)" : "#3f3f46",
                        }}
                      />
                    );
                  })}
                  {/* Thumb — always visible, calc() keeps it in bounds at 0% and 100% */}
                  {maxSize > 0 && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full pointer-events-none z-10"
                      style={{
                        left: `calc(${Math.min(100, (sizeNum / maxSize) * 100)}% - ${(Math.min(100, (sizeNum / maxSize) * 100) / 100) * 12}px)`,
                        backgroundColor: "#ffffff",
                        boxShadow: "0 0 0 3px rgba(255,255,255,0.15)",
                      }}
                    />
                  )}
                  {/* Native input spanning full hit area */}
                  <input
                    type="range"
                    min="0"
                    max={maxSize > 0 ? maxSize : 1}
                    step={maxSize > 0 ? maxSize / 1000 : 0.0001}
                    value={sizeNum || 0}
                    onChange={e => {
                      const v = parseFloat(e.target.value);
                      setSize(v > 0 ? v.toFixed(4) : "");
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    disabled={maxSize <= 0}
                  />
                </div>
              </div>
              {/* Current % of max */}
              <span className={`shrink-0 w-10 text-right text-[11px] font-mono tabular-nums ${
                sizeNum > 0 ? (isLong ? "text-emerald-400" : "text-red-400") : "text-zinc-600"
              }`}>
                {maxSize > 0 ? `${Math.min(100, Math.round((sizeNum / maxSize) * 100))}%` : "0%"}
              </span>
            </div>
          </div>

          {/* Price limit */}
          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-[0.14em]">Price limit</label>
              <button
                className="text-[10px] text-zinc-400 hover:text-white font-medium transition-colors duration-150"
                onClick={() => setPriceLimit(market.price)}
              >
                Use mark
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                placeholder="Market"
                className="w-full bg-white/[0.02] border border-white/[0.06] rounded-md pl-3 pr-12 py-2 text-[13px] text-white focus:outline-none focus:border-white/[0.16] transition-colors duration-150 placeholder-zinc-700 font-mono tabular-nums"
                value={priceLimit}
                onChange={e => setPriceLimit(e.target.value)}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-zinc-500">
                USDC
              </span>
            </div>
          </div>

          {/* Leverage */}
          <div>
            <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-[0.14em] block mb-3">
              Leverage
            </label>
            <div className="flex items-center gap-3">
              {/* Track area — h-5 gives a comfortable drag target */}
              <div className="flex-1 relative h-5 flex items-center">
                <div className="relative w-full h-[2px] bg-zinc-800 rounded-full">
                  {/* Colored fill */}
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full ${isLong ? "bg-emerald-500" : "bg-red-500"}`}
                    style={{ width: `${((leverage - 1) / 9) * 100}%` }}
                  />
                  {/* Uniform tick dots 1×–10× */}
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
                    <div
                      key={v}
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-[3px] h-[3px] rounded-full pointer-events-none"
                      style={{
                        left: `${((v - 1) / 9) * 100}%`,
                        backgroundColor: v <= leverage
                          ? isLong ? "#10b981" : "#ef4444"
                          : "#3f3f46",
                      }}
                    />
                  ))}
                  {/* Thumb */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full pointer-events-none z-10"
                    style={{
                      left: `${((leverage - 1) / 9) * 100}%`,
                      backgroundColor: isLong ? "#10b981" : "#ef4444",
                      boxShadow: `0 0 0 3px ${isLong ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
                    }}
                  />
                </div>
                {/* Native input overlays the full h-5 area */}
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={leverage}
                  onChange={(e) => setLeverage(Number(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                />
              </div>
              {/* Value to the right */}
              <span
                className={`shrink-0 w-8 text-right text-[13px] font-mono font-semibold tabular-nums ${
                  isLong ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {leverage}×
              </span>
            </div>
          </div>
        </div>

        {/* Order summary — clean key/value list */}
        <div className="px-3 py-3 border-b border-zinc-800/80 space-y-1">
          <SummaryRow
            label="Notional"
            value={notionalValue > 0 ? `$${notionalValue.toFixed(2)}` : "—"}
          />
          <SummaryRow
            label={`Est. fees (${(feeBps / 100).toFixed(2)}%)`}
            value={fees > 0 ? `$${fees.toFixed(2)}` : "—"}
            valueClass="text-zinc-400"
          />
          <SummaryRow
            label="Initial margin"
            value={marginRequired > 0 ? `$${marginRequired.toFixed(2)}` : "—"}
            valueClass="text-white font-medium"
            tooltip={{ title: "Initial Margin", desc: "Collateral reserved by the contract using market IMR and the higher of mark or index price." }}
          />
          <SummaryRow
            label="Total required"
            value={collateralRequired > 0 ? `$${collateralRequired.toFixed(2)}` : "—"}
            valueClass={isOverMax ? "text-red-400 font-medium" : "text-zinc-300"}
            tooltip={{ title: "Total Required", desc: "Initial margin plus estimated trading fee, including a small execution buffer." }}
          />
          <SummaryRow
            label="Liq. price"
            value={sizeNum > 0 ? `$${liqPrice}` : "—"}
            valueClass="text-yellow-400"
            tooltip={{ title: "Estimated Liquidation Price", desc: "Approximate price at which your position will be liquidated. Actual price depends on funding and fees." }}
          />
          {isOverMax && (
            <div className="mt-2 rounded-md border border-red-500/20 bg-red-500/8 px-3 py-2 text-[11px] text-red-300">
              Order exceeds available collateral after initial margin and estimated fees.
            </div>
          )}
        </div>

        {/* Risk parameters — low-priority info, integrated */}
        <div className="px-3 py-3 space-y-1">
          <div className="flex items-center gap-1.5 mb-1.5">
            <ShieldCheck size={10} strokeWidth={1.75} className="text-zinc-600" />
            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-[0.14em]">Risk</span>
          </div>
          <SummaryRow
            label="IMR / MMR"
            value={`${riskParams?.imrPercent ? riskParams.imrPercent.toFixed(1) : "10.0"}% / ${riskParams?.mmrPercent ? riskParams.mmrPercent.toFixed(1) : "5.0"}%`}
            valueClass="text-zinc-400"
            tooltip={{ title: "Initial / Maintenance Margin", desc: "IMR is the minimum margin to open a position. MMR is the minimum to keep it open before liquidation." }}
          />
          <SummaryRow
            label="Risk price"
            value={riskPrice > 0 ? `$${riskPrice.toFixed(2)}` : "—"}
            valueClass="text-zinc-400"
            tooltip={{ title: "Risk Price", desc: "The higher of mark, index, or order price used to estimate contract margin." }}
          />
          <SummaryRow
            label="Liq. penalty"
            value={`${riskParams?.liquidationPenaltyPercent ? riskParams.liquidationPenaltyPercent.toFixed(1) : "5.0"}%`}
            valueClass="text-yellow-400"
            tooltip={{ title: "Liquidation Penalty", desc: "Penalty charged on liquidation, split between the liquidator and the insurance fund." }}
          />
        </div>
      </div>

      {/* ── Submit ──────────────────────────────────────────────────────── */}
      <div className="px-3 py-3 border-t border-zinc-800/80 bg-[#06060a]">
        <button
          className={`w-full h-10 rounded-md font-medium text-white text-[13px] transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
            isLong
              ? "bg-emerald-500 hover:bg-emerald-400"
              : "bg-red-500 hover:bg-red-400"
          }`}
          onClick={handleTrade}
          disabled={isPending || !size || sizeNum <= 0 || isOverMax}
        >
          {isPending ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing
            </>
          ) : (
            <>
              {isLong ? "Long" : "Short"} {market.baseAsset}
              {notionalValue > 0 && (
                <span className="text-white/60 font-normal text-[11px] tabular-nums">· ${notionalValue.toFixed(0)}</span>
              )}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
