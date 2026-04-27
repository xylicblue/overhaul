import React, { useState, useEffect, useMemo } from "react";
import { useTradingStore } from "./stores/useTradingStore";
import ReactDOM from "react-dom";
import { toast } from "react-hot-toast";
import { useAccount } from "wagmi";
import { supabase } from "./creatclient";
import { recordTrade } from "./services/api";
import { useMarketRealTimeData } from "./marketData";
import MintUSDC from "./components/MintUSDC";
import CollateralManager from "./components/CollateralManager";
import {
  useOpenPosition,
  useAccountValue,
  useMarketRiskParams,
  useVaultBalance,
} from "./hooks/useClearingHouse";
import { MARKET_IDS } from "./contracts/addresses";
import { Info, ShieldCheck } from "lucide-react";

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
  const { side, size, priceLimit, leverage, lastTxHash,
          setSide, setSize, setPriceLimit, setLeverage,
          resetOrder, setLastTx } = useTradingStore();
  const { address }               = useAccount();

  const marketId                 = selectedMarket?.marketId || MARKET_IDS["H100-PERP"];
  const { accountValue }         = useAccountValue();
  const { totalCollateralValue } = useVaultBalance();
  const { riskParams }           = useMarketRiskParams(marketId);

  const { openPosition, isPending, isSuccess, error: tradeError, hash, reset: resetTrade } = useOpenPosition(marketId);

  const marketName = typeof selectedMarket === "string" ? selectedMarket : selectedMarket?.name;
  const { data: market, isLoading, error } = useMarketRealTimeData(marketName);

  const isLong = side === "Buy";

  // ── Calculations (memoised — only rerun when inputs actually change) ───────
  const {
    effectiveBalance, currentPrice, marketPrice,
    maxSize, sizeNum, notionalValue, fees, marginRequired, liqPrice,
  } = useMemo(() => {
    const accountValueNum  = parseFloat(accountValue) || 0;
    const vaultBalanceNum  = parseFloat(totalCollateralValue) || 0;
    const effectiveBalance = accountValueNum > 0 ? accountValueNum : vaultBalanceNum;
    const currentPrice     = parseFloat(market?.markPriceRaw) || 0;
    const marketPrice      = parseFloat(market?.price) || 0;
    const imr              = riskParams?.imrPercent ? riskParams.imrPercent / 100 : 0.1;
    const mmr              = riskParams?.mmrPercent ? riskParams.mmrPercent / 100 : 0.05;
    const maxSize          = currentPrice > 0 ? (effectiveBalance * leverage) / currentPrice / imr : 0;
    const sizeNum          = parseFloat(size) || 0;
    const notionalValue    = sizeNum * marketPrice;
    const fees             = notionalValue * 0.001;
    const marginRequired   = leverage > 0 ? notionalValue / leverage : 0;
    const liqPrice         = currentPrice > 0 && sizeNum > 0
      ? isLong
        ? (currentPrice - (marginRequired - mmr * notionalValue) / sizeNum).toFixed(2)
        : (currentPrice + (marginRequired - mmr * notionalValue) / sizeNum).toFixed(2)
      : "—";
    return { effectiveBalance, currentPrice, marketPrice, maxSize, sizeNum, notionalValue, fees, marginRequired, liqPrice };
  }, [accountValue, totalCollateralValue, market?.markPriceRaw, market?.price,
      riskParams?.imrPercent, riskParams?.mmrPercent, size, leverage, isLong]);

  // ── Trade success ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isSuccess && hash && hash !== lastTxHash) {
      setLastTx(hash, side);
      toast.success(
        <div>
          <div>Position opened successfully!</div>
          <a href={`https://sepolia.etherscan.io/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="underline text-sm">
            View on Etherscan →
          </a>
        </div>,
        { id: "trade", duration: 5000 }
      );
      const saveTrade = async () => {
        if (!address || !market) return;
        try {
          await recordTrade(
            {
              userAddress: address,
              market: market.displayName || market.name,
              side: isLong ? "Long" : "Short",
              size: sizeNum,
              price: marketPrice,
              notional: notionalValue,
              txHash: hash,
            },
            {
              market: market.name,
              price: parseFloat(market.markPriceRaw) || marketPrice,
              twap: parseFloat(market.twapRaw) || parseFloat(market.markPriceRaw) || 0,
              timestamp: new Date().toISOString(),
            }
          );
        } catch (e) { console.warn("Failed to record trade:", e); }
      };
      saveTrade();
      resetOrder();
      setTimeout(() => resetTrade(), 100);
    }
  }, [isSuccess, hash, lastTxHash, address, market, isLong, sizeNum, marketPrice, notionalValue, resetTrade, setLastTx, resetOrder, side]);

  // ── Trade error ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (tradeError) {
      const msg = tradeError.message.toLowerCase();
      let friendly = "Transaction failed";
      if (msg.includes("user rejected") || msg.includes("user denied")) friendly = "Transaction cancelled";
      else if (msg.includes("insufficient")) friendly = "Insufficient funds";
      else if (msg.includes("network")) friendly = "Network error — please try again";
      else { const f = tradeError.message.split("\n")[0]; friendly = f.length > 80 ? f.slice(0, 80) + "…" : f; }
      toast.error(friendly, { id: "trade" });
      resetTrade();
    }
  }, [tradeError, resetTrade]);

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
    try {
      const priceLimitValue = priceLimit && parseFloat(priceLimit) > 0 ? parseFloat(priceLimit) : 0;
      openPosition(isLong, size, priceLimitValue);
      toast.loading(`${isLong ? "Opening long" : "Opening short"} position…`, { id: "trade" });
    } catch (err) {
      toast.error("Failed to execute trade: " + err.message);
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

        {/* Collateral */}
        <div className="px-3 py-3 border-b border-zinc-800/80">
          <SectionLabel>Collateral</SectionLabel>
          <div className="space-y-2">
            <CollateralManager />
            <MintUSDC />
          </div>
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
            <div className="grid grid-cols-4 gap-px mt-1.5 bg-zinc-800/80 rounded-md overflow-hidden p-px">
              {[25, 50, 75, 100].map(p => (
                <button
                  key={p}
                  onClick={() => handleSizeButtonClick(p)}
                  className="py-1 text-[10px] font-medium bg-[#06060a] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] transition-colors duration-100"
                >
                  {p}%
                </button>
              ))}
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
            <div className="flex items-baseline justify-between mb-2">
              <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-[0.14em]">Leverage</label>
              <span className={`text-[12px] font-mono font-medium tabular-nums ${sideAccent}`}>
                {leverage}×
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={leverage}
              onChange={e => setLeverage(parseInt(e.target.value))}
              className={`w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer ${
                isLong ? "accent-emerald-500" : "accent-red-500"
              }`}
            />
            <div className="flex justify-between mt-1 text-[9px] font-mono text-zinc-600 tabular-nums">
              <span>1×</span>
              <span>3×</span>
              <span>5×</span>
              <span>10×</span>
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
            label="Fees (0.10%)"
            value={fees > 0 ? `$${fees.toFixed(2)}` : "—"}
            valueClass="text-zinc-400"
          />
          <SummaryRow
            label="Margin"
            value={marginRequired > 0 ? `$${marginRequired.toFixed(2)}` : "—"}
            valueClass="text-white font-medium"
            tooltip={{ title: "Margin Required", desc: "Collateral needed to open this position at the selected leverage." }}
          />
          <SummaryRow
            label="Liq. price"
            value={sizeNum > 0 ? `$${liqPrice}` : "—"}
            valueClass="text-yellow-400"
            tooltip={{ title: "Estimated Liquidation Price", desc: "Approximate price at which your position will be liquidated. Actual price depends on funding and fees." }}
          />
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
          disabled={isPending || !size || sizeNum <= 0}
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
