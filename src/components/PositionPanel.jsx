import React, { useState, useEffect, useRef, useMemo, memo } from "react";
import { useTradingStore } from "../stores/useTradingStore";
import { useAccount, useReadContract } from "wagmi";
import { toast } from "react-hot-toast";
import {
  calculatePendingFunding,
  useAccountValue,
  useAddMargin,
  useAllPositions,
  useClosePosition,
  usePosition,
  useVaultBalance,
} from "../hooks/useClearingHouse";
import { useMarkPrice, useFundingRate } from "../hooks/useVAMM";
import { SEPOLIA_CONTRACTS, MARKET_IDS } from "../contracts/addresses";
import MarketRegistryABI from "../contracts/abis/MarketRegistry.json";
import { motion, AnimatePresence } from "framer-motion";
import ConfirmationModal from "./ConfirmationModal";
import EmptyState, { CompactEmptyState } from "./EmptyState";
import { Wallet, TrendingUp, TrendingDown, X, AlertCircle, Activity, Plus } from "lucide-react";
import { supabase } from "../creatclient";
import { recordTradeWithRetry } from "../services/tradeQueue";
import { formatTransactionError, getSepoliaTxUrl } from "../utils/transactionErrors";

const hasOpenPositionData = (data) => {
  if (!data) return false;
  const size = data.size ?? data[0] ?? 0n;
  return size !== 0n;
};

// ─────────────────────────────────────────────────────────────────────────────
// PositionPanel
// ─────────────────────────────────────────────────────────────────────────────
export function PositionPanel({ selectedMarket = null }) {
  const { address, isConnected } = useAccount();
  const { positions: allPositions, isLoading, error, refetch: refetchPositions } = useAllPositions();
  const {
    closingPositionId: closingPosition,
    closeSize,
    setClosingPosition,
    setCloseSize,
  } = useTradingStore();

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
              refetchPositions={refetchPositions}
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
function PositionCard({ position, closingPosition, setClosingPosition, closeSize, setCloseSize, refetchPositions }) {
  const isLong      = position.isLong;
  const size        = parseFloat(position.size);
  const absSize     = Math.abs(size);
  const entryPrice  = parseFloat(position.entryPriceX18);
  const margin      = parseFloat(position.margin);

  const vammAddress = position.vammAddress ||
    (position.marketKey === "H100-PERP" || position.marketKey === "ETH-PERP-V2"
      ? SEPOLIA_CONTRACTS.vammProxy
      : SEPOLIA_CONTRACTS.vammProxyOld);

  const { price: markPrice } = useMarkPrice(vammAddress);
  const {
    longPay,
    longReceive,
    shortPay,
    shortReceive,
  } = useFundingRate(vammAddress);

  const { data: marketConfig } = useReadContract({
    address: SEPOLIA_CONTRACTS.marketRegistry,
    abi: MarketRegistryABI.abi,
    functionName: "getMarket",
    args: [position.marketId],
    chainId: 11155111,
  });

  // ── Memoised calculations — rerun only when price/funding/config changes ──
  const { currentPrice, openNotional, feeBps, feesPaid, leverage,
          currentPnL, fundingEarned, netPnL, roe, isProfitable, liqPrice } = useMemo(() => {
    const currentPrice   = markPrice ? parseFloat(markPrice) : 0;
    const fundingEarned  = calculatePendingFunding(position, {
      longPay,
      longReceive,
      shortPay,
      shortReceive,
    });
    const feeBps         = marketConfig?.feeBps || 10;
    const openNotional   = entryPrice * absSize;
    const feesPaid       = (openNotional * feeBps) / 10000;
    const leverage       = margin > 0 ? openNotional / margin : 0;
    const currentPnL     = currentPrice > 0
      ? isLong
        ? (currentPrice - entryPrice) * absSize
        : (entryPrice - currentPrice) * absSize
      : 0;
    const netPnL         = currentPnL + fundingEarned - feesPaid;
    const roe            = margin > 0 ? (netPnL / margin) * 100 : 0;
    const isProfitable   = netPnL >= 0;
    const mmr            = 0.05;
    const liqPrice       = currentPrice > 0 && margin > 0
      ? isLong
        ? entryPrice - (margin - mmr * openNotional) / absSize
        : entryPrice + (margin - mmr * openNotional) / absSize
      : null;
    return { currentPrice, openNotional, feeBps, feesPaid, leverage,
             currentPnL, fundingEarned, netPnL, roe, isProfitable, liqPrice };
  }, [markPrice, longPay, longReceive, shortPay, shortReceive, marketConfig?.feeBps,
      position.lastFundingPayIndex, position.lastFundingReceiveIndex,
      position.size, entryPrice, absSize, margin, isLong]);

  const {
    closePosition,
    isPending,
    isConfirming,
    isSuccess,
    isReverted,
    error: closeError,
    receiptError,
    hash,
    receipt,
    reset: resetClose,
  } = useClosePosition(position.marketId);
  const { address } = useAccount();
  const {
    position: livePosition,
    refetch: refetchLivePosition,
  } = usePosition(position.marketId, address);
  const {
    accountValue,
    refetch: refetchAccountValue,
  } = useAccountValue(address);
  const {
    usdcBalance,
    refetch: refetchVaultBalance,
  } = useVaultBalance(address);
  const handledTxHashRef = useRef(null);
  const handledFailureHashRef = useRef(null);
  const handledAddMarginHashRef = useRef(null);
  const handledAddMarginFailureHashRef = useRef(null);
  const submittedCloseRef = useRef(null);
  const submittedAddMarginRef = useRef(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingCloseAmount, setPendingCloseAmount] = useState(null);
  const [isCloseSubmitting, setIsCloseSubmitting] = useState(false);
  const [closeInlineError, setCloseInlineError] = useState("");
  const [isAddingMargin, setIsAddingMargin] = useState(false);
  const [addMarginAmount, setAddMarginAmount] = useState("");
  const [isAddMarginSubmitting, setIsAddMarginSubmitting] = useState(false);
  const [addMarginInlineError, setAddMarginInlineError] = useState("");

  const isClosing = closingPosition === position.marketId;
  const isCloseBusy = isCloseSubmitting || isPending || isConfirming;
  const {
    addMargin,
    isPending: isAddMarginPending,
    isConfirming: isAddMarginConfirming,
    isSuccess: isAddMarginSuccess,
    isReverted: isAddMarginReverted,
    error: addMarginError,
    receiptError: addMarginReceiptError,
    hash: addMarginHash,
    receipt: addMarginReceipt,
    reset: resetAddMargin,
  } = useAddMargin(position.marketId);
  const isAddMarginBusy = isAddMarginSubmitting || isAddMarginPending || isAddMarginConfirming;
  const addMarginAmountNum = parseFloat(addMarginAmount) || 0;
  const availableQuoteCollateral = Math.max(parseFloat(accountValue) || 0, 0);
  const depositedQuoteCollateral = Math.max(parseFloat(usdcBalance) || 0, 0);
  const isAddMarginOverAvailable =
    addMarginAmountNum > 0 && addMarginAmountNum > availableQuoteCollateral;

  const initiateClose = (closeAmount) => {
    if (isCloseBusy) return;
    if (!closeAmount || parseFloat(closeAmount) <= 0) { toast.error("Enter a valid size to close"); return; }
    if (parseFloat(closeAmount) > absSize) { toast.error(`Max size: ${absSize.toFixed(4)}`); return; }
    setCloseInlineError("");
    setPendingCloseAmount(closeAmount);
    setShowConfirmModal(true);
  };

  const handleClose = async (closeAmount) => {
    if (isCloseBusy) return;
    setIsCloseSubmitting(true);
    setCloseInlineError("");
    try {
      const submittedClosedSize = parseFloat(closeAmount);
      const closePrice = currentPrice || entryPrice;
      const closeNotional = submittedClosedSize * closePrice;
      const closedFraction = absSize > 0 ? submittedClosedSize / absSize : 1;
      submittedCloseRef.current = {
        closedSize: submittedClosedSize,
        absSizeAtSubmission: absSize,
        isLong,
        entryPrice,
        currentMark: currentPrice,
        marketName: position.marketName || position.marketKey || "H100-GPU-PERP",
        marketKey: position.marketKey || position.marketName || "H100-PERP",
        marketDisplayName: position.displayName || position.marketName || position.marketKey || "H100-GPU-PERP",
        closePrice,
        closeNotional,
        pnl: currentPnL * closedFraction,
        fundingEarned: fundingEarned * closedFraction,
        feesPaid: (closeNotional * feeBps) / 10000,
      };
      toast.loading("Review close transaction in wallet...", { id: "close" });
      await closePosition(closeAmount, 0);
    } catch (err) {
      const message = formatTransactionError(err, { action: "close" });
      setCloseInlineError(message);
      toast.error(message, { id: "close" });
    } finally {
      setIsCloseSubmitting(false);
    }
  };

  const handleAddMargin = async () => {
    if (isAddMarginBusy) return;
    if (!addMarginAmount || parseFloat(addMarginAmount) <= 0) {
      toast.error("Enter a valid margin amount");
      return;
    }
    if (isAddMarginOverAvailable) {
      const message = `Not enough available deposited USDC. Available: ${availableQuoteCollateral.toFixed(2)} USDC.`;
      setAddMarginInlineError(message);
      toast.error(message, { id: "add-margin" });
      return;
    }
    setIsAddMarginSubmitting(true);
    setAddMarginInlineError("");
    try {
      const latestPosition = await refetchLivePosition?.();
      const stillHasPosition = latestPosition?.data
        ? hasOpenPositionData(latestPosition.data)
        : livePosition?.hasPosition || position?.hasPosition;
      if (!stillHasPosition) {
        const message = "This position is no longer open. Refresh and try again.";
        setAddMarginInlineError(message);
        toast.error(message, { id: "add-margin" });
        return;
      }

      submittedAddMarginRef.current = {
        amount: parseFloat(addMarginAmount),
        marginBefore: margin,
      };
      toast.loading("Review add-margin transaction in wallet...", { id: "add-margin" });
      await addMargin(addMarginAmount);
    } catch (err) {
      const message = formatTransactionError(err, { action: "add margin" });
      setAddMarginInlineError(message);
      toast.error(message, { id: "add-margin" });
    } finally {
      setIsAddMarginSubmitting(false);
    }
  };

  useEffect(() => {
    if (hash && isConfirming && hash !== handledTxHashRef.current) {
      toast.loading(
        <div>
          <div>Submitted, waiting for confirmation...</div>
          <a href={getSepoliaTxUrl(hash)} target="_blank" rel="noopener noreferrer" className="underline text-sm">
            View on Etherscan
          </a>
        </div>,
        { id: "close" }
      );

      // Write to position_closes here — card is guaranteed mounted while tx is pending.
      // By the time isSuccess fires the card may have unmounted (position gone from chain).
      const submittedClose = submittedCloseRef.current;
      if (address && submittedClose) {
        const netPnl =
          submittedClose.pnl != null &&
          submittedClose.fundingEarned != null &&
          submittedClose.feesPaid != null
            ? submittedClose.pnl + submittedClose.fundingEarned - submittedClose.feesPaid
            : null;

        (async () => {
          const { error } = await supabase
            .from("position_closes")
            .upsert(
              {
                user_address:   address.toLowerCase(),
                market:         submittedClose.marketDisplayName,
                side:           submittedClose.isLong ? "Long" : "Short",
                size:           submittedClose.closedSize,
                entry_price:    submittedClose.entryPrice,
                close_price:    submittedClose.closePrice,
                notional:       submittedClose.closeNotional,
                pnl:            submittedClose.pnl,
                funding_earned: submittedClose.fundingEarned,
                fees_paid:      submittedClose.feesPaid,
                net_pnl:        netPnl,
                tx_hash:        hash,
              },
              { onConflict: "tx_hash" }
            );
          if (error) console.error("[position_closes]", error.message, error.code);

          // Write price to vamm_price_history so the chart updates instantly
          // rather than waiting for the 60-second indexer snapshot cycle.
          supabase
            .from("vamm_price_history")
            .insert({
              market:    submittedClose.marketKey,
              price:     submittedClose.closePrice,
              twap:      submittedClose.closePrice,
              timestamp: new Date().toISOString(),
            })
            .then(({ error: e }) => {
              if (e) console.error("[vamm_price_history]", e.message);
            });
        })();
      }
    }
  }, [hash, isConfirming]);

  useEffect(() => {
    if (isSuccess && hash && hash !== handledTxHashRef.current) {
      handledTxHashRef.current = hash;
      const submittedClose = submittedCloseRef.current;
      const closeLabel = submittedClose?.closedSize >= submittedClose?.absSizeAtSubmission
        ? "Position closed."
        : "Position reduced.";
      toast.success(
        <div>
          <div>{closeLabel}</div>
          <a href={getSepoliaTxUrl(hash)} target="_blank" rel="noopener noreferrer" className="underline text-sm">
            View on Etherscan
          </a>
        </div>,
        { id: "close", duration: 5000 }
      );
      const save = async () => {
        if (!address || !submittedClose) return;
        await recordTradeWithRetry(
          {
            userAddress:   address,
            market:        submittedClose.marketDisplayName,
            side:          submittedClose.isLong ? "Long" : "Short",
            size:          submittedClose.closedSize,
            price:         submittedClose.closePrice,
            notional:      submittedClose.closeNotional,
            txHash:        hash,
            pnl:           submittedClose.pnl,
            fundingEarned: submittedClose.fundingEarned,
            feesPaid:      submittedClose.feesPaid,
          },
          {
            market:    submittedClose.marketKey,
            price:     submittedClose.closePrice,
            twap:      submittedClose.closePrice,
            timestamp: new Date().toISOString(),
          }
        );
      };
      save();
      setClosingPosition(null);
      setCloseSize("");
      setShowConfirmModal(false);
      setPendingCloseAmount(null);
      setCloseInlineError("");
      setTimeout(() => resetClose(), 100);
    }
  }, [isSuccess, hash, address, resetClose, setClosingPosition, setCloseSize]);

  useEffect(() => {
    const failure = closeError || receiptError;
    if (failure) {
      const message = formatTransactionError(failure, { action: "close" });
      setCloseInlineError(message);
      toast.error(message, { id: "close" });
      resetClose();
    }
  }, [closeError, receiptError, resetClose]);

  useEffect(() => {
    if (isReverted && hash && hash !== handledFailureHashRef.current) {
      handledFailureHashRef.current = hash;
      const message = formatTransactionError(
        { message: "Transaction receipt status is reverted", receipt },
        { action: "close" }
      );
      setCloseInlineError(message);
      toast.error(
        <div>
          <div>{message}</div>
          <a href={getSepoliaTxUrl(hash)} target="_blank" rel="noopener noreferrer" className="underline text-sm">
            View on Etherscan
          </a>
        </div>,
        { id: "close" }
      );
      setTimeout(() => resetClose(), 100);
    }
  }, [isReverted, hash, receipt, resetClose]);

  useEffect(() => {
    if (addMarginHash && isAddMarginConfirming && addMarginHash !== handledAddMarginHashRef.current) {
      toast.loading(
        <div>
          <div>Submitted, waiting for confirmation...</div>
          <a href={getSepoliaTxUrl(addMarginHash)} target="_blank" rel="noopener noreferrer" className="underline text-sm">
            View on Etherscan
          </a>
        </div>,
        { id: "add-margin" }
      );
    }
  }, [addMarginHash, isAddMarginConfirming]);

  useEffect(() => {
    if (isAddMarginSuccess && addMarginHash && addMarginHash !== handledAddMarginHashRef.current) {
      handledAddMarginHashRef.current = addMarginHash;
      const submittedAddMargin = submittedAddMarginRef.current;
      toast.success(
        <div>
          <div>Margin added{submittedAddMargin?.amount ? `: ${submittedAddMargin.amount.toFixed(2)} USDC` : ""}.</div>
          <a href={getSepoliaTxUrl(addMarginHash)} target="_blank" rel="noopener noreferrer" className="underline text-sm">
            View on Etherscan
          </a>
        </div>,
        { id: "add-margin", duration: 5000 }
      );
      setIsAddingMargin(false);
      setAddMarginAmount("");
      setAddMarginInlineError("");
      refetchLivePosition?.();
      refetchPositions?.();
      refetchAccountValue?.();
      refetchVaultBalance?.();
      setTimeout(() => resetAddMargin(), 100);
    }
  }, [
    isAddMarginSuccess,
    addMarginHash,
    resetAddMargin,
    refetchLivePosition,
    refetchPositions,
    refetchAccountValue,
    refetchVaultBalance,
  ]);

  useEffect(() => {
    const failure = addMarginError || addMarginReceiptError;
    if (failure) {
      const message = formatTransactionError(failure, { action: "add margin" });
      setAddMarginInlineError(message);
      toast.error(message, { id: "add-margin" });
      resetAddMargin();
    }
  }, [addMarginError, addMarginReceiptError, resetAddMargin]);

  useEffect(() => {
    if (isAddMarginReverted && addMarginHash && addMarginHash !== handledAddMarginFailureHashRef.current) {
      handledAddMarginFailureHashRef.current = addMarginHash;
      const message = formatTransactionError(
        { message: "Transaction receipt status is reverted", receipt: addMarginReceipt },
        { action: "add margin" }
      );
      setAddMarginInlineError(message);
      toast.error(
        <div>
          <div>{message}</div>
          <a href={getSepoliaTxUrl(addMarginHash)} target="_blank" rel="noopener noreferrer" className="underline text-sm">
            View on Etherscan
          </a>
        </div>,
        { id: "add-margin" }
      );
      setTimeout(() => resetAddMargin(), 100);
    }
  }, [isAddMarginReverted, addMarginHash, addMarginReceipt, resetAddMargin]);

  const accentColor = isLong ? "bg-emerald-500" : "bg-red-500";
  const directionBadge = isLong
    ? "text-emerald-400 bg-emerald-500/[0.08] border-emerald-500/20"
    : "text-red-400 bg-red-500/[0.08] border-red-500/20";
  const projectedMargin = margin + addMarginAmountNum;
  const projectedLeverage = projectedMargin > 0 ? openNotional / projectedMargin : leverage;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      className="relative rounded-2xl border border-white/[0.07] bg-[#0c0c12] overflow-hidden"
    >
      {/* Top accent line */}
      <div className={`h-[2px] w-full ${accentColor}`} />

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[15px] font-semibold text-white tracking-tight leading-none">
              {position.marketName?.replace("-PERP", "") || "GPU"}
            </span>
            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border tracking-wide ${directionBadge}`}>
              {isLong ? "Long" : "Short"}
            </span>
            {leverage > 0 && (
              <span className="text-[9px] font-mono text-zinc-500 border border-zinc-800/80 px-1.5 py-0.5 rounded-full">
                {leverage.toFixed(1)}×
              </span>
            )}
          </div>
          <span className="text-[11px] text-zinc-500 font-mono tabular-nums">
            {absSize.toFixed(4)} GPU-HRS
          </span>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-[20px] font-mono font-semibold leading-none tracking-tight ${isProfitable ? "text-emerald-400" : "text-red-400"}`}>
            {isProfitable ? "+" : ""}{netPnL.toFixed(3)}
          </div>
          <div className="text-[9px] text-zinc-600 font-mono mt-1 uppercase tracking-widest">USDC</div>
          <div className={`text-[10px] font-mono mt-1 ${isProfitable ? "text-emerald-500/50" : "text-red-500/50"}`}>
            {roe >= 0 ? "+" : ""}{roe.toFixed(2)}% ROE
          </div>
        </div>
      </div>

      {/* ── Stats grid — 6 cells, 3×2 ────────────────────────────────────── */}
      <div className="mx-4 mb-3 rounded-xl overflow-hidden border border-white/[0.05] bg-white/[0.015]">
        <div className="grid grid-cols-3 divide-x divide-white/[0.05]">
          {[
            { label: "Entry",    value: `$${entryPrice.toFixed(2)}` },
            { label: "Mark",     value: currentPrice > 0 ? `$${currentPrice.toFixed(2)}` : "—" },
            { label: "Liq.",     value: liqPrice && liqPrice > 0 ? `$${liqPrice.toFixed(2)}` : "—", warn: true },
          ].map(({ label, value, warn }) => (
            <div key={label} className="px-3.5 py-2.5">
              <div className="text-[9px] font-medium text-zinc-500 uppercase tracking-[0.12em] mb-1">{label}</div>
              <div className={`text-[12px] font-mono font-semibold ${warn ? "text-yellow-400" : "text-zinc-100"}`}>{value}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 divide-x divide-white/[0.05] border-t border-white/[0.05]">
          {[
            { label: "Notional", value: `$${openNotional.toFixed(2)}` },
            { label: "Margin",   value: `$${margin.toFixed(2)}` },
            { label: "Funding",  value: `${fundingEarned >= 0 ? "+" : ""}$${fundingEarned.toFixed(3)}`, colored: true, pos: fundingEarned >= 0 },
          ].map(({ label, value, colored, pos }) => (
            <div key={label} className="px-3.5 py-2.5">
              <div className="text-[9px] font-medium text-zinc-500 uppercase tracking-[0.12em] mb-1">{label}</div>
              <div className={`text-[12px] font-mono font-semibold ${colored ? (pos ? "text-emerald-400" : "text-red-400") : "text-zinc-100"}`}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── P&L breakdown ────────────────────────────────────────────────── */}
      <div className="mx-4 mb-4 flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/[0.015] border border-white/[0.05]">
        {[
          { label: "Trading P&L", value: `${currentPnL >= 0 ? "+" : ""}$${currentPnL.toFixed(3)}`, cls: currentPnL >= 0 ? "text-emerald-400" : "text-red-400" },
          { label: "Fees",        value: `-$${feesPaid.toFixed(3)}`,                                 cls: "text-zinc-500"                                         },
          { label: "Net P&L",     value: `${netPnL >= 0 ? "+" : ""}$${netPnL.toFixed(3)}`,          cls: netPnL >= 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold" },
        ].map(({ label, value, cls }, i) => (
          <React.Fragment key={label}>
            {i > 0 && <div className="w-px h-6 bg-white/[0.06] shrink-0" />}
            <div className="flex-1 min-w-0 px-1">
              <div className="text-[9px] font-medium text-zinc-500 uppercase tracking-[0.12em] mb-1">{label}</div>
              <div className={`text-[11px] font-mono truncate ${cls}`}>{value}</div>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* ── Position controls ─────────────────────────────────────────────── */}
      <div className="px-4 pb-4">
        {!isClosing ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setIsAddingMargin(true);
                  setAddMarginInlineError("");
                  setClosingPosition(null);
                  setCloseSize("");
                }}
                disabled={isAddMarginBusy}
                className="py-2.5 rounded-xl text-[11px] font-semibold text-zinc-500 hover:text-blue-300 bg-white/[0.02] hover:bg-blue-500/[0.06] border border-white/[0.06] hover:border-blue-500/25 transition-all duration-200 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={11} />
                Add Margin
              </button>
              <button
                onClick={() => {
                  setIsAddingMargin(false);
                  setClosingPosition(position.marketId);
                }}
                disabled={isAddMarginBusy}
                className="py-2.5 rounded-xl text-[11px] font-semibold text-zinc-500 hover:text-red-400 bg-white/[0.02] hover:bg-red-500/[0.06] border border-white/[0.06] hover:border-red-500/25 transition-all duration-200 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X size={11} />
                Close Position
              </button>
            </div>

            {isAddingMargin && (
              <div className="space-y-2 rounded-xl border border-blue-500/20 bg-blue-500/[0.04] p-3">
                <div className="flex items-center justify-between gap-2 px-1 text-[10px]">
                  <span className="text-zinc-600">Available deposited USDC</span>
                  <span className="font-mono font-semibold text-zinc-300">
                    {availableQuoteCollateral.toFixed(2)} USDC
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      placeholder="0.00"
                      value={addMarginAmount}
                      onChange={e => {
                        if (isAddMarginBusy) return;
                        setAddMarginAmount(e.target.value);
                        setAddMarginInlineError("");
                      }}
                      disabled={isAddMarginBusy}
                      className="w-full bg-white/[0.02] border border-white/[0.07] rounded-lg pl-3 pr-20 py-2 text-[12px] text-white focus:outline-none focus:border-blue-500/30 font-mono placeholder-zinc-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                      step="0.01"
                      min="0"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (isAddMarginBusy) return;
                          setAddMarginAmount(availableQuoteCollateral > 0 ? availableQuoteCollateral.toFixed(2) : "");
                          setAddMarginInlineError("");
                        }}
                        disabled={isAddMarginBusy || availableQuoteCollateral <= 0}
                        className="text-[8px] font-bold text-blue-400 hover:text-blue-300 disabled:text-zinc-700 disabled:cursor-not-allowed"
                      >
                        MAX
                      </button>
                      <span className="text-[9px] font-bold text-zinc-600">USDC</span>
                    </div>
                  </div>
                  <button
                    onClick={handleAddMargin}
                    disabled={isAddMarginBusy || !addMarginAmount || isAddMarginOverAvailable}
                    className="px-4 py-2 bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 text-[11px] font-semibold rounded-lg border border-blue-500/25 hover:border-blue-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isAddMarginBusy ? "…" : "Add"}
                  </button>
                  <button
                    onClick={() => {
                      if (isAddMarginBusy) return;
                      setIsAddingMargin(false);
                      setAddMarginAmount("");
                      setAddMarginInlineError("");
                    }}
                    disabled={isAddMarginBusy}
                    className="px-2 py-2 text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.04] rounded-lg transition-all disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <X size={13} />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 px-1 text-[9px] text-zinc-600">
                  <span>Total deposited</span>
                  <span className="font-mono">{depositedQuoteCollateral.toFixed(2)} USDC</span>
                </div>

                {addMarginAmountNum > 0 && (
                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] px-2 py-1.5">
                      <div className="text-[8px] font-bold uppercase tracking-widest text-zinc-600">New Margin</div>
                      <div className="font-mono font-semibold text-zinc-200">{projectedMargin.toFixed(2)} USDC</div>
                    </div>
                    <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] px-2 py-1.5">
                      <div className="text-[8px] font-bold uppercase tracking-widest text-zinc-600">New Lev.</div>
                      <div className="font-mono font-semibold text-blue-300">{projectedLeverage.toFixed(1)}×</div>
                    </div>
                  </div>
                )}

                {isAddMarginOverAvailable && (
                  <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-2 text-[10px] leading-4 text-yellow-200">
                    Amount exceeds available deposited USDC.
                  </div>
                )}

                {addMarginInlineError && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-2 text-[10px] leading-4 text-red-300">
                    {addMarginInlineError}
                  </div>
                )}
              </div>
            )}
          </div>
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
                    className={`py-1.5 text-[10px] font-semibold rounded-lg border transition-all duration-150 ${
                      active
                        ? "bg-red-500/15 border-red-500/40 text-red-400"
                        : "bg-white/[0.02] border-white/[0.06] text-zinc-500 hover:text-zinc-200 hover:border-white/[0.12]"
                    }`}
                  >
                    {pct}%
                  </button>
                );
              })}
            </div>

            {/* Input + actions */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  placeholder="0.0000"
                  value={closeSize}
                  onChange={e => setCloseSize(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/[0.07] rounded-lg pl-3 pr-14 py-2 text-[12px] text-white focus:outline-none focus:border-red-500/30 font-mono placeholder-zinc-700 transition-colors"
                  step="0.0001"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-zinc-600">
                  GPU-HRS
                </span>
              </div>
              <button
                onClick={() => initiateClose(closeSize)}
                disabled={isCloseBusy || !closeSize}
                className="px-4 py-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 text-[11px] font-semibold rounded-lg border border-red-500/25 hover:border-red-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isCloseBusy ? "…" : "Close"}
              </button>
              <button
                onClick={() => { setClosingPosition(null); setCloseSize(""); }}
                className="px-2 py-2 text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.04] rounded-lg transition-all"
              >
                <X size={13} />
              </button>
            </div>

            {/* Estimated P&L */}
            {closeSize && parseFloat(closeSize) > 0 && (
              <div className="flex items-center justify-between text-[10px] px-0.5">
                <span className="text-zinc-600">Est. P&L on close</span>
                <span className={`font-mono font-semibold ${currentPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {currentPnL >= 0 ? "+" : ""}${((currentPnL / absSize) * parseFloat(closeSize)).toFixed(3)}
                </span>
              </div>
            )}
            {closeInlineError && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/[0.07] px-3 py-2 text-[10px] leading-4 text-red-300">
                {closeInlineError}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => {
          if (isCloseBusy) return;
          setShowConfirmModal(false);
          setPendingCloseAmount(null);
        }}
        onConfirm={() => handleClose(pendingCloseAmount)}
        title="Close Position"
        message={`Close ${pendingCloseAmount || 0} GPU-HRS of your ${isLong ? "Long" : "Short"} position?`}
        confirmText="Close Position"
        cancelText="Cancel"
        variant="danger"
        isLoading={isCloseBusy}
        details={
          <div className="space-y-2.5">
            {[
              { label: "Market",        value: position.displayName || position.marketKey },
              { label: "Size",          value: `${pendingCloseAmount} GPU-HRS`, mono: true },
              { label: "Est. P&L",      value: `${currentPnL >= 0 ? "+" : ""}$${((currentPnL / absSize) * parseFloat(pendingCloseAmount || 0)).toFixed(3)}`,
                cls: currentPnL >= 0 ? "text-emerald-400" : "text-red-400" },
            ].map(({ label, value, mono, cls }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-500 uppercase tracking-[0.1em]">{label}</span>
                <span className={`text-[12px] font-medium ${mono ? "font-mono" : ""} ${cls || "text-zinc-200"}`}>{value}</span>
              </div>
            ))}
            {closeInlineError && (
              <div className="mt-1 rounded-lg border border-red-500/20 bg-red-500/[0.07] px-3 py-2 text-[11px] leading-4 text-red-300">
                {closeInlineError}
              </div>
            )}
          </div>
        }
      />
    </motion.div>
  );
}

export default PositionPanel;
