import React, { useState, useEffect } from "react";
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
import { Info, TrendingUp, TrendingDown, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";

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
// Row — label / value pair used in order summary & risk params
// ─────────────────────────────────────────────────────────────────────────────
const Row = ({ label, value, valueClass = "text-zinc-300", tooltip }) => (
  <div className="flex items-center justify-between py-1.5">
    <span className="text-[11px] text-zinc-500 flex items-center gap-1">
      {label}
      {tooltip && <InfoTooltip title={tooltip.title} description={tooltip.desc} />}
    </span>
    <span className={`text-[11px] font-mono font-semibold ${valueClass}`}>{value}</span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Collapsible section wrapper
// ─────────────────────────────────────────────────────────────────────────────
const Section = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-zinc-800/60 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-zinc-900/30 hover:bg-zinc-900/50 transition-colors"
      >
        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">{title}</span>
        {open ? <ChevronUp size={12} className="text-zinc-600" /> : <ChevronDown size={12} className="text-zinc-600" />}
      </button>
      {open && <div className="bg-[#0a0a10]">{children}</div>}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TradingPanel
// ─────────────────────────────────────────────────────────────────────────────
export const TradingPanel = ({ selectedMarket }) => {
  const [side, setSide]             = useState("Buy");
  const [size, setSize]             = useState("");
  const [priceLimit, setPriceLimit] = useState("");
  const [leverage, setLeverage]     = useState(1);
  const { address }                 = useAccount();

  const marketId                 = selectedMarket?.marketId || MARKET_IDS["H100-PERP"];
  const { accountValue }         = useAccountValue();
  const { totalCollateralValue } = useVaultBalance();
  const { riskParams }           = useMarketRiskParams(marketId);

  const { openPosition, isPending, isSuccess, error: tradeError, hash, reset: resetTrade } = useOpenPosition(marketId);

  const marketName = typeof selectedMarket === "string" ? selectedMarket : selectedMarket?.name;
  const { data: market, isLoading, error } = useMarketRealTimeData(marketName);
  const [handledTxHash, setHandledTxHash] = useState(null);

  const isLong = side === "Buy";

  // ── Calculations ──────────────────────────────────────────────────────────
  const accountValueNum  = parseFloat(accountValue) || 0;
  const vaultBalanceNum  = parseFloat(totalCollateralValue) || 0;
  const effectiveBalance = accountValueNum > 0 ? accountValueNum : vaultBalanceNum;
  const currentPrice     = parseFloat(market?.markPriceRaw) || 0;
  const imr              = riskParams?.imrPercent ? riskParams.imrPercent / 100 : 0.1;
  const maxSize          = currentPrice > 0 ? (effectiveBalance * leverage) / currentPrice / imr : 0;

  const sizeNum        = parseFloat(size) || 0;
  const marketPrice    = parseFloat(market?.price) || 0;
  const notionalValue  = sizeNum * marketPrice;
  const fees           = notionalValue * 0.001;
  const marginRequired = leverage > 0 ? notionalValue / leverage : 0;

  // Estimated liquidation price (simplified)
  const mmr      = riskParams?.mmrPercent ? riskParams.mmrPercent / 100 : 0.05;
  const liqPrice = currentPrice > 0 && sizeNum > 0
    ? isLong
      ? (currentPrice - (marginRequired - mmr * notionalValue) / sizeNum).toFixed(2)
      : (currentPrice + (marginRequired - mmr * notionalValue) / sizeNum).toFixed(2)
    : "—";

  // ── Trade success ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isSuccess && hash && hash !== handledTxHash) {
      setHandledTxHash(hash);
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
      setSize("");
      setPriceLimit("");
      setTimeout(() => resetTrade(), 100);
    }
  }, [isSuccess, hash, handledTxHash, address, market, isLong, sizeNum, marketPrice, notionalValue, resetTrade]);

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

  // ── Side colour tokens ────────────────────────────────────────────────────
  const C = isLong
    ? { activeBg: "bg-emerald-500", activeText: "text-white", glow: "shadow-emerald-900/50", border: "border-emerald-500/20", accent: "bg-emerald-500/40", ring: "focus:border-emerald-500/30 focus:ring-emerald-500/10", badge: "text-emerald-400 border-emerald-500/25 bg-emerald-500/10" }
    : { activeBg: "bg-red-500",     activeText: "text-white", glow: "shadow-red-900/50",     border: "border-red-500/20",     accent: "bg-red-500/40",     ring: "focus:border-red-500/30 focus:ring-red-500/10",     badge: "text-red-400 border-red-500/25 bg-red-500/10"     };

  return (
    <div className="flex flex-col h-full bg-[#06060a]">

      {/* ── Long / Short tabs ───────────────────────────────────────────── */}
      <div className="p-3 pb-2 border-b border-zinc-800/60">
        <div className="flex bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-1 gap-1">
          {[
            { key: "Buy",  label: "Long",  icon: <TrendingUp   size={13} /> },
            { key: "Sell", label: "Short", icon: <TrendingDown size={13} /> },
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setSide(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all duration-150 ${
                side === key
                  ? key === "Buy"
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-900/40"
                    : "bg-red-500 text-white shadow-md shadow-red-900/40"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-3 space-y-3">

          {/* ── Account overview ──────────────────────────────────────────── */}
          <div className="grid grid-cols-3 divide-x divide-zinc-800/60 bg-zinc-900/30 border border-zinc-800/60 rounded-xl overflow-hidden">
            {[
              { label: "Balance",    value: `$${effectiveBalance.toFixed(2)}` },
              { label: "Mark Price", value: currentPrice > 0 ? `$${currentPrice.toFixed(2)}` : "—" },
              { label: "Max Size",   value: maxSize > 0 ? `${maxSize.toFixed(1)} ${market.baseAsset}` : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="px-2.5 py-2">
                <div className="text-[8px] font-bold uppercase tracking-widest text-zinc-600 mb-0.5">{label}</div>
                <div className="text-[11px] font-mono font-semibold text-zinc-200 truncate">{value}</div>
              </div>
            ))}
          </div>

          {/* ── Collateral & Faucet ───────────────────────────────────────── */}
          <Section title="Collateral">
            <div className="p-3 space-y-2">
              <CollateralManager />
              <MintUSDC />
            </div>
          </Section>

          {/* ── Order ─────────────────────────────────────────────────────── */}
          <Section title="Order" defaultOpen={true}>
            <div className="p-3 space-y-3">

              {/* Order type */}
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 bg-zinc-800 border border-zinc-700/60 rounded-lg text-[11px] font-bold text-white">
                  Market
                </button>
                <button disabled className="px-3 py-1.5 border border-zinc-800/40 rounded-lg text-[11px] font-medium text-zinc-700 cursor-not-allowed">
                  Limit
                  <span className="ml-1 text-[8px] text-zinc-700">Soon</span>
                </button>
              </div>

              {/* Size */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Size</span>
                  <span className="text-[9px] text-zinc-600 font-mono">
                    Max {maxSize > 0 ? maxSize.toFixed(2) : "0.00"} {market.baseAsset}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="0.0000"
                    className={`w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-3 pr-20 py-2.5 text-sm text-white focus:outline-none focus:ring-1 transition-all placeholder-zinc-700 font-mono ${C.ring}`}
                    value={size}
                    onChange={e => setSize(e.target.value)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-md">
                    {market.baseAsset}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 mt-2">
                  {[25, 50, 75, 100].map(p => (
                    <button
                      key={p}
                      onClick={() => handleSizeButtonClick(p)}
                      className="py-1.5 text-[10px] font-bold bg-zinc-900/50 hover:bg-zinc-800 text-zinc-600 hover:text-zinc-200 rounded-lg border border-zinc-800/60 hover:border-zinc-700 transition-all"
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Price limit */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Price Limit</span>
                  <button
                    className="text-[9px] text-blue-500 hover:text-blue-400 font-semibold transition-colors"
                    onClick={() => setPriceLimit(market.price)}
                  >
                    Use Market
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="Market"
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-3 pr-16 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/20 transition-all placeholder-zinc-700 font-mono"
                    value={priceLimit}
                    onChange={e => setPriceLimit(e.target.value)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-md">
                    USDC
                  </span>
                </div>
              </div>

              {/* Leverage */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Leverage</span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border ${C.badge}`}>
                    {leverage}×
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 mb-2">
                  {[1, 2, 3, 5, 10].map(v => (
                    <button
                      key={v}
                      onClick={() => setLeverage(v)}
                      className={`py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                        leverage === v
                          ? `${C.activeBg} border-transparent ${C.activeText}`
                          : "bg-zinc-900/50 border-zinc-800/60 text-zinc-600 hover:text-zinc-300 hover:border-zinc-700"
                      }`}
                    >
                      {v}×
                    </button>
                  ))}
                </div>
                <input
                  type="range" min="1" max="10" step="1" value={leverage}
                  onChange={e => setLeverage(parseInt(e.target.value))}
                  className="w-full h-0.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>
          </Section>

          {/* ── Order Summary ─────────────────────────────────────────────── */}
          <div className={`rounded-xl border overflow-hidden ${C.border} bg-[#0a0a10]`}>
            <div className={`h-px ${C.accent}`} />
            <div className="px-3 py-2.5 divide-y divide-zinc-800/40">
              <Row label="Notional Value"   value={notionalValue > 0 ? `$${notionalValue.toFixed(2)}` : "—"} />
              <Row label="Est. Fees (0.1%)" value={fees > 0 ? `$${fees.toFixed(2)}` : "—"} valueClass="text-zinc-400" />
              <Row
                label="Margin Required"
                value={marginRequired > 0 ? `$${marginRequired.toFixed(2)}` : "—"}
                valueClass="text-white font-bold"
                tooltip={{ title: "Margin Required", desc: "Collateral needed to open this position at the selected leverage." }}
              />
              <Row
                label="Est. Liq. Price"
                value={sizeNum > 0 ? `$${liqPrice}` : "—"}
                valueClass="text-yellow-500"
                tooltip={{ title: "Estimated Liquidation Price", desc: "Approximate price at which your position will be liquidated. Actual price depends on funding and fees." }}
              />
            </div>
          </div>

          {/* ── Risk Parameters ───────────────────────────────────────────── */}
          <div className="rounded-xl border border-zinc-800/60 bg-[#0a0a10] overflow-hidden">
            <div className="px-3 py-2 border-b border-zinc-800/60 flex items-center gap-1.5">
              <ShieldCheck size={11} className="text-zinc-600" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Risk Parameters</span>
            </div>
            <div className="px-3 divide-y divide-zinc-800/40">
              <Row
                label="Initial Margin (IMR)"
                value={riskParams?.imrPercent ? `${riskParams.imrPercent.toFixed(1)}%` : "10.0%"}
                tooltip={{ title: "Initial Margin Requirement", desc: "Minimum margin to open a position. 10% IMR = 10× max leverage." }}
              />
              <Row
                label="Maintenance Margin (MMR)"
                value={riskParams?.mmrPercent ? `${riskParams.mmrPercent.toFixed(1)}%` : "5.0%"}
                tooltip={{ title: "Maintenance Margin Requirement", desc: "Minimum margin to keep a position open before liquidation." }}
              />
              <Row
                label="Liquidation Penalty"
                value={riskParams?.liquidationPenaltyPercent ? `${riskParams.liquidationPenaltyPercent.toFixed(1)}%` : "5.0%"}
                valueClass="text-yellow-500"
                tooltip={{ title: "Liquidation Penalty", desc: "Penalty charged on liquidation, split between the liquidator and the insurance fund." }}
              />
            </div>
          </div>

        </div>
      </div>

      {/* ── Submit ──────────────────────────────────────────────────────── */}
      <div className="p-3 border-t border-zinc-800/60 bg-[#06060a] space-y-2">
        <button
          className={`w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all duration-150 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
            isLong
              ? "bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-900/40"
              : "bg-red-500 hover:bg-red-400 shadow-lg shadow-red-900/40"
          }`}
          onClick={handleTrade}
          disabled={isPending || !size || sizeNum <= 0}
        >
          {isPending ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing…
            </>
          ) : (
            <>
              {isLong ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {isLong ? "Buy / Long" : "Sell / Short"} {market.baseAsset}
              {notionalValue > 0 && (
                <span className="text-white/50 font-normal text-xs">· ${notionalValue.toFixed(0)}</span>
              )}
            </>
          )}
        </button>
        <p className="text-center text-[9px] text-zinc-700">
          Testnet — no real funds at risk
        </p>
      </div>
    </div>
  );
};
