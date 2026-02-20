import React, { useState, useEffect, useRef } from "react";
import { useAccount, useReadContract } from "wagmi";
import { toast } from "react-hot-toast";
import { useAllPositions, useClosePosition } from "../hooks/useClearingHouse";
import { useMarkPrice, useFundingRate } from "../hooks/useVAMM";
import { SEPOLIA_CONTRACTS, MARKET_IDS } from "../contracts/addresses";
import MarketRegistryABI from "../contracts/abis/MarketRegistry.json";
import { motion, AnimatePresence } from "framer-motion";
import ConfirmationModal from "./ConfirmationModal";
import EmptyState, { CompactEmptyState } from "./EmptyState";
import { Wallet, TrendingUp, TrendingDown, X, AlertCircle, Activity } from "lucide-react";
import { supabase } from "../creatclient";
import { recordTrade } from "../services/api";

// ─────────────────────────────────────────────────────────────────────────────
// PositionPanel
// ─────────────────────────────────────────────────────────────────────────────
export function PositionPanel({ selectedMarket = null }) {
  const { address, isConnected } = useAccount();
  const { positions: allPositions, isLoading, error } = useAllPositions();
  const [closingPosition, setClosingPosition] = useState(null);
  const [closeSize, setCloseSize] = useState("");

  const marketName = typeof selectedMarket === "string"
    ? selectedMarket
    : selectedMarket?.name || null;
  const selectedMarketId = marketName ? MARKET_IDS[marketName] : null;

  const positions = selectedMarketId && allPositions
    ? allPositions.filter(pos => pos.marketId.toLowerCase() === selectedMarketId.toLowerCase())
    : allPositions;

  const Header = ({ count }) => (
    <div className="px-4 py-2.5 border-b border-zinc-800/80 flex items-center justify-between bg-[#06060a] sticky top-0 z-10">
      <h3 className="text-[10px] font-bold text-zinc-400 flex items-center gap-2 uppercase tracking-widest">
        <Activity size={12} className="text-blue-400" />
        Open Positions
        {marketName && (
          <span className="text-[9px] text-zinc-600 font-normal normal-case tracking-normal">
            · {marketName.replace("-PERP", "")}
          </span>
        )}
      </h3>
      {count !== undefined && (
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
          count > 0
            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
            : "bg-zinc-800/60 text-zinc-600"
        }`}>
          {count > 0 ? `${count} Active` : "None"}
        </span>
      )}
    </div>
  );

  if (!isConnected) {
    return (
      <div className="flex flex-col h-full bg-[#06060a]">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <CompactEmptyState icon={Wallet} title="Connect Wallet" description="Connect your wallet to view positions." />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-[#06060a]">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-zinc-600">
          <div className="w-4 h-4 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-[10px]">Loading…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full bg-[#06060a]">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <CompactEmptyState icon={AlertCircle} title="Error" description={error.message || "Something went wrong."} actionLabel="Retry" onAction={() => window.location.reload()} />
        </div>
      </div>
    );
  }

  if (!positions || positions.length === 0) {
    return (
      <div className="flex flex-col h-full bg-[#06060a]">
        <Header count={0} />
        <div className="flex-1 flex items-center justify-center">
          <CompactEmptyState
            icon={TrendingUp}
            title="No Open Positions"
            description={marketName ? `No positions in ${marketName.replace("-PERP", "")}` : "Open a position to see it here."}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#06060a]">
      <Header count={positions.length} />
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
        <AnimatePresence>
          {positions.map((position, index) => (
            <PositionCard
              key={`${position.marketId}-${index}`}
              position={position}
              closingPosition={closingPosition}
              setClosingPosition={setClosingPosition}
              closeSize={closeSize}
              setCloseSize={setCloseSize}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PositionCard — professional terminal-style layout
// ─────────────────────────────────────────────────────────────────────────────
function PositionCard({ position, closingPosition, setClosingPosition, closeSize, setCloseSize }) {
  const isLong      = position.isLong;
  const size        = parseFloat(position.size);
  const absSize     = Math.abs(size);
  const entryPrice  = parseFloat(position.entryPriceX18);
  const margin      = parseFloat(position.margin);

  const vammAddress = position.vammAddress ||
    (position.marketKey === "H100-PERP" || position.marketKey === "ETH-PERP-V2"
      ? SEPOLIA_CONTRACTS.vammProxy
      : SEPOLIA_CONTRACTS.vammProxyOld);

  const { price: markPrice }                       = useMarkPrice(vammAddress);
  const { cumulativeFunding: currentFundingIndex } = useFundingRate(vammAddress);
  const currentPrice   = markPrice ? parseFloat(markPrice) : 0;
  const currentIndex   = parseFloat(currentFundingIndex || 0);
  const lastIndex      = parseFloat(position.lastFundingIndex || 0);
  const fundingPayment = (currentIndex - lastIndex) * size;
  const fundingEarned  = -fundingPayment;

  const { data: marketConfig } = useReadContract({
    address: SEPOLIA_CONTRACTS.marketRegistry,
    abi: MarketRegistryABI.abi,
    functionName: "getMarket",
    args: [position.marketId],
    chainId: 11155111,
  });

  const feeBps       = marketConfig?.feeBps || 10;
  const openNotional = entryPrice * absSize;
  const feesPaid     = (openNotional * feeBps) / 10000;
  const leverage     = margin > 0 ? openNotional / margin : 0;

  const currentPnL = currentPrice > 0
    ? isLong
      ? (currentPrice - entryPrice) * absSize
      : (entryPrice - currentPrice) * absSize
    : 0;

  const netPnL      = currentPnL + fundingEarned - feesPaid;
  const roe         = margin > 0 ? (netPnL / margin) * 100 : 0;
  const isProfitable = netPnL >= 0;

  // Estimated liquidation price
  const mmr     = 0.05;
  const liqPrice = currentPrice > 0 && margin > 0
    ? isLong
      ? entryPrice - (margin - mmr * openNotional) / absSize
      : entryPrice + (margin - mmr * openNotional) / absSize
    : null;

  const { closePosition, isPending, isSuccess, error: closeError, hash } = useClosePosition(position.marketId);
  const { address } = useAccount();
  const handledTxHashRef = useRef(null);
  const closedSizeRef    = useRef(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingCloseAmount, setPendingCloseAmount] = useState(null);

  const isClosing = closingPosition === position.marketId;

  const initiateClose = (closeAmount) => {
    if (!closeAmount || parseFloat(closeAmount) <= 0) { toast.error("Enter a valid size to close"); return; }
    if (parseFloat(closeAmount) > absSize) { toast.error(`Max size: ${absSize.toFixed(4)}`); return; }
    setPendingCloseAmount(closeAmount);
    setShowConfirmModal(true);
  };

  const handleClose = (closeAmount) => {
    try {
      closedSizeRef.current = parseFloat(closeAmount);
      closePosition(closeAmount, 0);
      toast.loading("Closing position…", { id: "close" });
      setClosingPosition(null);
      setCloseSize("");
      setShowConfirmModal(false);
      setPendingCloseAmount(null);
    } catch (err) {
      toast.error("Failed: " + err.message, { id: "close" });
    }
  };

  useEffect(() => {
    if (isSuccess && hash && hash !== handledTxHashRef.current) {
      handledTxHashRef.current = hash;
      toast.success("Position closed", { id: "close" });
      const save = async () => {
        if (!address || !position) return;
        const closedSize      = closedSizeRef.current || absSize;
        const closeProportion = closedSize / absSize;
        const closedPnL       = currentPrice > 0
          ? isLong ? (currentPrice - entryPrice) * closedSize : (entryPrice - currentPrice) * closedSize
          : 0;
        const closeNotional   = closedSize * (currentPrice || entryPrice);
        const closingFee      = (closeNotional * feeBps) / 10000;
        try {
          await recordTrade(
            {
              userAddress: address,
              market: position.marketName || position.marketKey || "H100-GPU-PERP",
              side: isLong ? "Long" : "Short",
              size: closedSize,
              price: currentPrice || entryPrice,
              notional: closeNotional,
              txHash: hash,
              pnl: closedPnL,
              fundingEarned: fundingEarned * closeProportion,
              feesPaid: feesPaid * closeProportion + closingFee,
            },
            {
              market: position.marketName || position.marketKey || "H100-PERP",
              price: currentPrice || entryPrice,
              twap: currentPrice || entryPrice,
              timestamp: new Date().toISOString(),
            }
          );
        } catch (e) { console.warn("Failed to record close trade:", e); }
      };
      save();
    }
  }, [isSuccess, hash, address, position, absSize, isLong, entryPrice, currentPrice, fundingEarned, feesPaid, feeBps]);

  useEffect(() => {
    if (closeError) {
      toast.error(closeError.message?.includes("User rejected") ? "Transaction cancelled" : "Failed to close position", { id: "close" });
    }
  }, [closeError]);

  // ── colour tokens ─────────────────────────────────────────────────────────
  const C = isLong
    ? { border: "border-emerald-500/20", bar: "bg-emerald-500", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: "text-emerald-400" }
    : { border: "border-red-500/20",     bar: "bg-red-500",     badge: "bg-red-500/10 text-red-400 border-red-500/20",             icon: "text-red-400"     };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className={`relative rounded-xl border overflow-hidden bg-[#0a0a10] ${C.border}`}
    >
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${C.bar}`} />

      {/* ── Top row: market + side + PnL ─────────────────────────────────── */}
      <div className="pl-4 pr-3 pt-3 pb-2.5 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-bold text-white tracking-tight">
              {position.marketName?.replace("-PERP", "") || "GPU"}
            </span>
            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${C.badge}`}>
              {isLong ? "Long" : "Short"}
            </span>
            {leverage > 0 && (
              <span className="text-[9px] font-bold text-zinc-600 border border-zinc-800 px-1.5 py-0.5 rounded">
                {leverage.toFixed(1)}×
              </span>
            )}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">
            {absSize.toFixed(4)} GPU-HRS
          </div>
        </div>

        {/* PnL block */}
        <div className="text-right">
          <div className={`text-base font-mono font-bold leading-none ${isProfitable ? "text-emerald-400" : "text-red-400"}`}>
            {isProfitable ? "+" : ""}${netPnL.toFixed(2)}
          </div>
          <div className={`text-[10px] font-mono font-semibold mt-0.5 ${isProfitable ? "text-emerald-500/60" : "text-red-500/60"}`}>
            ROE {isProfitable ? "+" : ""}{roe.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* ── Data grid ─────────────────────────────────────────────────────── */}
      <div className="mx-3 mb-2.5 grid grid-cols-3 border border-zinc-800/60 rounded-lg overflow-hidden divide-x divide-zinc-800/60 bg-zinc-900/20">
        {[
          { label: "Entry",    value: `$${entryPrice.toFixed(2)}` },
          { label: "Mark",     value: currentPrice > 0 ? `$${currentPrice.toFixed(2)}` : "—" },
          { label: "Liq.",     value: liqPrice && liqPrice > 0 ? `$${liqPrice.toFixed(2)}` : "—", warn: true },
        ].map(({ label, value, warn }) => (
          <div key={label} className="px-2.5 py-2">
            <div className="text-[8px] font-bold uppercase tracking-widest text-zinc-600 mb-0.5">{label}</div>
            <div className={`text-[11px] font-mono font-semibold ${warn ? "text-yellow-500" : "text-zinc-200"}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Secondary data grid ───────────────────────────────────────────── */}
      <div className="mx-3 mb-2.5 grid grid-cols-3 border border-zinc-800/60 rounded-lg overflow-hidden divide-x divide-zinc-800/60 bg-zinc-900/20">
        {[
          { label: "Notional",  value: `$${openNotional.toFixed(0)}` },
          { label: "Margin",    value: `$${margin.toFixed(2)}` },
          { label: "Funding",   value: `${fundingEarned >= 0 ? "+" : ""}$${fundingEarned.toFixed(2)}`, colored: true, pos: fundingEarned >= 0 },
        ].map(({ label, value, colored, pos }) => (
          <div key={label} className="px-2.5 py-2">
            <div className="text-[8px] font-bold uppercase tracking-widest text-zinc-600 mb-0.5">{label}</div>
            <div className={`text-[11px] font-mono font-semibold ${colored ? (pos ? "text-emerald-400" : "text-red-400") : "text-zinc-200"}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── PnL breakdown row ─────────────────────────────────────────────── */}
      <div className="mx-3 mb-2.5 px-2.5 py-2 bg-zinc-900/20 border border-zinc-800/60 rounded-lg">
        <div className="flex items-center justify-between gap-3 text-[10px]">
          {[
            { label: "Trading P&L", value: `${currentPnL >= 0 ? "+" : ""}$${currentPnL.toFixed(2)}`, cls: currentPnL >= 0 ? "text-emerald-400" : "text-red-400" },
            { label: "Fees",        value: `-$${feesPaid.toFixed(2)}`,                                cls: "text-zinc-500"                                          },
            { label: "Net P&L",     value: `${netPnL >= 0 ? "+" : ""}$${netPnL.toFixed(2)}`,         cls: netPnL >= 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold" },
          ].map(({ label, value, cls }, i) => (
            <React.Fragment key={label}>
              {i > 0 && <div className="w-px h-4 bg-zinc-800/80 shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="text-[8px] font-bold uppercase tracking-widest text-zinc-600 mb-0.5">{label}</div>
                <div className={`font-mono truncate ${cls}`}>{value}</div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── Close controls ────────────────────────────────────────────────── */}
      <div className="px-3 pb-3">
        {!isClosing ? (
          <button
            onClick={() => setClosingPosition(position.marketId)}
            className="w-full py-2 rounded-lg text-[11px] font-semibold text-zinc-500 hover:text-red-400 bg-zinc-900/40 hover:bg-red-500/8 border border-zinc-800/60 hover:border-red-500/30 transition-all flex items-center justify-center gap-1.5"
          >
            <X size={11} />
            Close Position
          </button>
        ) : (
          <div className="space-y-2">
            {/* Size presets */}
            <div className="grid grid-cols-4 gap-1.5">
              {[25, 50, 75, 100].map(pct => {
                const val = (absSize * pct / 100).toFixed(4);
                const active = closeSize === val;
                return (
                  <button
                    key={pct}
                    onClick={() => setCloseSize(val)}
                    className={`py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                      active
                        ? "bg-red-600 border-red-500 text-white"
                        : "bg-zinc-900/60 border-zinc-800/60 text-zinc-500 hover:text-zinc-200 hover:border-zinc-700"
                    }`}
                  >
                    {pct}%
                  </button>
                );
              })}
            </div>

            {/* Input + actions */}
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <input
                  type="number"
                  placeholder="0.0000"
                  value={closeSize}
                  onChange={e => setCloseSize(e.target.value)}
                  className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg pl-3 pr-16 py-2 text-xs text-white focus:outline-none focus:border-red-500/40 font-mono"
                  step="0.0001"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-zinc-600">
                  GPU-HRS
                </span>
              </div>
              <button
                onClick={() => initiateClose(closeSize)}
                disabled={isPending || !closeSize}
                className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPending ? "…" : "Close"}
              </button>
              <button
                onClick={() => { setClosingPosition(null); setCloseSize(""); }}
                className="px-2 py-2 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-all"
              >
                <X size={13} />
              </button>
            </div>

            {/* Estimated PnL on close */}
            {closeSize && parseFloat(closeSize) > 0 && (
              <div className="flex items-center justify-between text-[10px] px-1">
                <span className="text-zinc-600">Est. P&L on close</span>
                <span className={`font-mono font-semibold ${currentPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {currentPnL >= 0 ? "+" : ""}${((currentPnL / absSize) * parseFloat(closeSize)).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => { setShowConfirmModal(false); setPendingCloseAmount(null); }}
        onConfirm={() => handleClose(pendingCloseAmount)}
        title="Close Position"
        message={`Close ${pendingCloseAmount || 0} GPU-HRS of your ${isLong ? "Long" : "Short"} position?`}
        confirmText="Close Position"
        cancelText="Cancel"
        variant="danger"
        isLoading={isPending}
        details={
          <div className="space-y-2 text-sm">
            {[
              { label: "Market",       value: position.displayName || position.marketKey,                                                                                                                                                cls: "text-white" },
              { label: "Size to Close", value: `${pendingCloseAmount} GPU-HRS`,                                                                                                                                                         cls: "text-white font-mono" },
              { label: "Est. P&L",     value: `${currentPnL >= 0 ? "+" : ""}$${((currentPnL / absSize) * parseFloat(pendingCloseAmount || 0)).toFixed(2)}`, cls: currentPnL >= 0 ? "text-emerald-400 font-mono font-semibold" : "text-red-400 font-mono font-semibold" },
            ].map(({ label, value, cls }) => (
              <div key={label} className="flex justify-between">
                <span className="text-zinc-400">{label}</span>
                <span className={cls}>{value}</span>
              </div>
            ))}
          </div>
        }
      />
    </motion.div>
  );
}

export default PositionPanel;
