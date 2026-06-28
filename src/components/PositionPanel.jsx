import React, { useState, useEffect, useRef } from "react";
import { useTradingStore } from "../stores/useTradingStore";
import { useAccount, useReadContract } from "wagmi";
import { toast } from "react-hot-toast";
import { formatUnits, parseUnits } from "ethers";
import {
  useAccountValue,
  useAddMargin,
  useAllPositions,
  useClosePosition,
  usePosition,
  useVaultBalance,
} from "../hooks/useClearingHouse";
import { usePositionMetrics } from "../hooks/usePositionMetrics";
import { MARKET_IDS, SEPOLIA_CONTRACTS } from "../contracts/addresses";
import MarketRegistryABI from "../contracts/abis/MarketRegistry.json";
import ConfirmationModal from "./ConfirmationModal";
import { CompactEmptyState } from "./EmptyState";
import { Wallet, TrendingUp, TrendingDown, X, AlertCircle, Activity, Plus } from "lucide-react";
import { supabase } from "../creatclient";
import { recordTradeWithRetry } from "../services/tradeQueue";
import { formatTransactionError, getSepoliaTxUrl } from "../utils/transactionErrors";
import { absolutePositionSize, closePresetSize, formatPositionSize } from "../utils/positionSize";

const hasOpenPositionData = (data) => {
  if (!data) return false;
  const size = data.size ?? data[0] ?? 0n;
  return size !== 0n;
};

// ─────────────────────────────────────────────────────────────────────────────
// PositionPanel — container with compact table layout
// ─────────────────────────────────────────────────────────────────────────────
export function PositionPanel({ selectedMarket = null }) {
  const { isConnected } = useAccount();
  const { positions: allPositions, isLoading, error, refetch: refetchPositions } = useAllPositions();
  const { closingPositionId: closingPosition, closeSize, setClosingPosition, setCloseSize } = useTradingStore();

  const marketName       = typeof selectedMarket === "string" ? selectedMarket : selectedMarket?.name || null;
  const selectedMarketId = marketName ? MARKET_IDS[marketName] : null;
  const positions        = selectedMarketId && allPositions
    ? allPositions.filter(pos => pos.marketId.toLowerCase() === selectedMarketId.toLowerCase())
    : allPositions;

  const count = positions?.length ?? 0;

  return (
    <div className="flex flex-col h-full bg-surface-1">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-4 py-2.5 border-b border-line-subtle flex items-center justify-between bg-surface-1 sticky top-0 z-10 shrink-0">
        <h3 className="text-[10px] font-bold text-ink-faint flex items-center gap-2 uppercase tracking-widest">
          <Activity size={12} className="text-blue-400" />
          Positions
          {marketName && (
            <span className="text-[9px] text-ink-faint font-normal normal-case tracking-normal">
              · {marketName.replace("-PERP", "")}
            </span>
          )}
        </h3>
        {count > 0 && (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
            {count} Active
          </span>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      {!isConnected ? (
        <div className="flex-1 flex items-center justify-center">
          <CompactEmptyState icon={Wallet} title="Connect Wallet" description="Connect your wallet to view positions." />
        </div>
      ) : isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-ink-faint">
          <div className="w-4 h-4 border-2 border-line border-t-blue-500 rounded-full animate-spin" />
          <span className="text-[10px]">Loading…</span>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <CompactEmptyState icon={AlertCircle} title="Error" description={error.message || "Something went wrong."} actionLabel="Retry" onAction={() => window.location.reload()} />
        </div>
      ) : !positions || positions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <CompactEmptyState
            icon={TrendingUp}
            title="No Open Positions"
            description={marketName ? `No positions in ${marketName.replace("-PERP", "")}` : "Open a position to see it here."}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-surface-1 sticky top-0 z-10">
                {[
                  { label: "Market",    right: false },
                  { label: "Side",      right: false },
                  { label: "Size",      right: true  },
                  { label: "Entry",     right: true  },
                  { label: "Leverage",  right: true  },
                  { label: "Margin",    right: true  },
                  { label: "Liq.",      right: true  },
                  { label: "P&L / ROE", right: true  },
                ].map(({ label, right }) => (
                  <th key={label} className={`px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-ink-faint whitespace-nowrap ${right ? "text-right" : ""}`}>
                    {label}
                  </th>
                ))}
                <th className="px-3 py-2 w-20" />
              </tr>
            </thead>
            <tbody>
              {positions.map((position, index) => (
                <PositionRow
                  key={`${position.marketId}-${index}`}
                  position={position}
                  closingPosition={closingPosition}
                  setClosingPosition={setClosingPosition}
                  closeSize={closeSize}
                  setCloseSize={setCloseSize}
                  refetchPositions={refetchPositions}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PositionRow — one table row per position + expandable close / add-margin rows
// ─────────────────────────────────────────────────────────────────────────────
function PositionRow({ position, closingPosition, setClosingPosition, closeSize, setCloseSize, refetchPositions }) {
  const isLong     = position.isLong;
  const absSizeRaw = absolutePositionSize(position.sizeRaw);
  const absSize    = Math.abs(parseFloat(position.size));
  const displayedSize = formatPositionSize(absSizeRaw);
  const metrics = usePositionMetrics(position);
  const entryPrice = metrics.entryPrice;
  const margin = metrics.margin;
  const currentPrice = metrics.markPrice;
  const openNotional = metrics.markNotional;
  const leverage = metrics.leverage;
  const currentPnL = metrics.unrealizedPnl;
  const fundingEarned = metrics.pendingFunding;
  const netPnL = metrics.positionPnl;
  const roe = metrics.roePercent;
  const isProfitable = netPnL >= 0;
  const liqPrice = metrics.liquidationPrice;

  const { data: marketConfig } = useReadContract({
    address: SEPOLIA_CONTRACTS.marketRegistry,
    abi: MarketRegistryABI.abi,
    functionName: "getMarket",
    args: [position.marketId],
    chainId: 11155111,
  });

  const feeBps = Number(marketConfig?.feeBps ?? marketConfig?.[1] ?? 10);

  const { closePositionRaw, isPending, isConfirming, isSuccess, isReverted, error: closeError, receiptError, hash, receipt, reset: resetClose } = useClosePosition(position.marketId);
  const { address } = useAccount();
  const { position: livePosition, refetch: refetchLivePosition } = usePosition(position.marketId, address);
  const { accountValue, refetch: refetchAccountValue }           = useAccountValue(address);
  const { refetch: refetchVaultBalance }                        = useVaultBalance(address);

  const handledTxHashRef            = useRef(null);
  const handledFailureHashRef       = useRef(null);
  const handledAddMarginHashRef     = useRef(null);
  const handledAddMarginFailureHashRef = useRef(null);
  const submittedCloseRef           = useRef(null);
  const submittedAddMarginRef       = useRef(null);

  const [showConfirmModal, setShowConfirmModal]     = useState(false);
  const [pendingCloseAmount, setPendingCloseAmount] = useState(null);
  const [isCloseSubmitting, setIsCloseSubmitting]   = useState(false);
  const [closeInlineError, setCloseInlineError]     = useState("");
  const [isAddingMargin, setIsAddingMargin]         = useState(false);
  const [addMarginAmount, setAddMarginAmount]       = useState("");
  const [isAddMarginSubmitting, setIsAddMarginSubmitting] = useState(false);
  const [addMarginInlineError, setAddMarginInlineError]   = useState("");

  const isClosing     = closingPosition === position.marketId;
  const isCloseBusy   = isCloseSubmitting || isPending || isConfirming;

  const { addMargin, isPending: isAddMarginPending, isConfirming: isAddMarginConfirming, isSuccess: isAddMarginSuccess, isReverted: isAddMarginReverted, error: addMarginError, receiptError: addMarginReceiptError, hash: addMarginHash, receipt: addMarginReceipt, reset: resetAddMargin } = useAddMargin(position.marketId);
  const isAddMarginBusy = isAddMarginSubmitting || isAddMarginPending;

  const addMarginAmountNum           = parseFloat(addMarginAmount) || 0;
  const availableQuoteCollateral     = Math.max(parseFloat(accountValue) || 0, 0);
  const isAddMarginOverAvailable     = addMarginAmountNum > 0 && addMarginAmountNum > availableQuoteCollateral;
  const projectedMargin              = margin + addMarginAmountNum;
  const projectedLeverage            = projectedMargin > 0 ? openNotional / projectedMargin : leverage;

  const initiateClose = (closeAmount) => {
    if (isCloseBusy) return;
    let closeAmountRaw;
    try {
      closeAmountRaw = parseUnits(closeAmount?.toString() || "0", 18);
    } catch {
      toast.error("Enter a valid size to close");
      return;
    }
    if (closeAmountRaw <= 0n) { toast.error("Enter a valid size to close"); return; }
    if (closeAmountRaw > absSizeRaw) { toast.error(`Max size: ${formatUnits(absSizeRaw, 18)}`); return; }
    setCloseInlineError("");
    setPendingCloseAmount(closeAmount);
    setShowConfirmModal(true);
  };

  const handleClose = async (closeAmount) => {
    if (isCloseBusy) return;
    setIsCloseSubmitting(true);
    setCloseInlineError("");
    try {
      const closeAmountRaw = parseUnits(closeAmount.toString(), 18);
      const submittedClosedSize = parseFloat(closeAmount);
      const closePrice          = currentPrice || entryPrice;
      const closeNotional       = submittedClosedSize * closePrice;
      const closedFraction      = absSize > 0 ? submittedClosedSize / absSize : 1;
      submittedCloseRef.current = {
        closedSize: submittedClosedSize,
        absSizeAtSubmission: absSize,
        isLong,
        entryPrice,
        currentMark: currentPrice,
        marketName: position.marketName || position.marketKey || "H100-GPU-PERP",
        marketKey:  position.marketKey || position.marketName || "H100-PERP",
        marketDisplayName: position.displayName || position.marketName || position.marketKey || "H100-GPU-PERP",
        closePrice,
        closeNotional,
        pnl:          currentPnL * closedFraction,
        fundingEarned: fundingEarned * closedFraction,
        feesPaid:      (closeNotional * feeBps) / 10000,
      };
      toast.loading("Review close transaction in wallet...", { id: "close" });
      await closePositionRaw(closeAmountRaw, 0n);
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
    if (!addMarginAmount || parseFloat(addMarginAmount) <= 0) { toast.error("Enter a valid margin amount"); return; }
    if (isAddMarginOverAvailable) {
      const msg = `Not enough available deposited USDC. Available: ${availableQuoteCollateral.toFixed(2)} USDC.`;
      setAddMarginInlineError(msg);
      toast.error(msg, { id: "add-margin" });
      return;
    }
    setIsAddMarginSubmitting(true);
    setAddMarginInlineError("");
    try {
      const latestPosition  = await refetchLivePosition?.();
      const stillHasPosition = latestPosition?.data
        ? hasOpenPositionData(latestPosition.data)
        : livePosition?.hasPosition || position?.hasPosition;
      if (!stillHasPosition) {
        const msg = "This position is no longer open. Refresh and try again.";
        setAddMarginInlineError(msg);
        toast.error(msg, { id: "add-margin" });
        return;
      }
      submittedAddMarginRef.current = { amount: parseFloat(addMarginAmount), marginBefore: margin };
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

  // ── tx effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (hash && isConfirming && hash !== handledTxHashRef.current) {
      toast.loading(
        <div>
          <div>Submitted, waiting for confirmation...</div>
          <a href={getSepoliaTxUrl(hash)} target="_blank" rel="noopener noreferrer" className="underline text-sm">View on Etherscan</a>
        </div>,
        { id: "close" }
      );
      const submittedClose = submittedCloseRef.current;
      if (submittedClose) {
        supabase.from("vamm_price_history").insert({
          market: submittedClose.marketKey, price: submittedClose.closePrice,
          twap: submittedClose.closePrice, timestamp: new Date().toISOString(),
        }).then(({ error: e }) => { if (e) console.error("[vamm_price_history]", e.message); });
      }
    }
  }, [hash, isConfirming]);

  useEffect(() => {
    if (isSuccess && hash && hash !== handledTxHashRef.current) {
      handledTxHashRef.current = hash;
      const submittedClose = submittedCloseRef.current;
      const closeLabel = submittedClose?.closedSize >= submittedClose?.absSizeAtSubmission ? "Position closed." : "Position reduced.";
      toast.success(
        <div>
          <div>{closeLabel}</div>
          <a href={getSepoliaTxUrl(hash)} target="_blank" rel="noopener noreferrer" className="underline text-sm">View on Etherscan</a>
        </div>,
        { id: "close", duration: 5000 }
      );

      if (submittedClose) {
        try {
          const stored = JSON.parse(localStorage.getItem("bs_pending_closes") || "[]");
          stored.push({
            tx_hash:     hash,
            market_name: submittedClose.marketDisplayName,
            side:        submittedClose.isLong ? "Long" : "Short",
            size:        submittedClose.closedSize,
            price:       submittedClose.closePrice,
            timestamp:   Date.now(),
          });
          localStorage.setItem("bs_pending_closes", JSON.stringify(stored));
          window.dispatchEvent(new Event("bs_pending_closes_updated"));
        } catch {
          // Local close-history cache is non-critical.
        }
      }

      const save = async () => {
        if (!address || !submittedClose) return;
        await recordTradeWithRetry(
          {
            userAddress: address,
            market:      submittedClose.marketDisplayName,
            side:        submittedClose.isLong ? "Long" : "Short",
            size:        submittedClose.closedSize,
            price:       submittedClose.closePrice,
            notional:    submittedClose.closeNotional,
            txHash:      hash,
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
      const message = formatTransactionError({ message: "Transaction receipt status is reverted", receipt }, { action: "close" });
      setCloseInlineError(message);
      toast.error(
        <div>
          <div>{message}</div>
          <a href={getSepoliaTxUrl(hash)} target="_blank" rel="noopener noreferrer" className="underline text-sm">View on Etherscan</a>
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
          <a href={getSepoliaTxUrl(addMarginHash)} target="_blank" rel="noopener noreferrer" className="underline text-sm">View on Etherscan</a>
        </div>,
        { id: "add-margin" }
      );
    }
  }, [addMarginHash, isAddMarginConfirming]);

  useEffect(() => {
    if (isAddMarginSuccess && addMarginHash && addMarginHash !== handledAddMarginHashRef.current) {
      handledAddMarginHashRef.current = addMarginHash;
      const sub = submittedAddMarginRef.current;
      toast.success(
        <div>
          <div>Margin added{sub?.amount ? `: ${sub.amount.toFixed(2)} USDC` : ""}.</div>
          <a href={getSepoliaTxUrl(addMarginHash)} target="_blank" rel="noopener noreferrer" className="underline text-sm">View on Etherscan</a>
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
  }, [isAddMarginSuccess, addMarginHash, resetAddMargin, refetchLivePosition, refetchPositions, refetchAccountValue, refetchVaultBalance]);

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
      const message = formatTransactionError({ message: "Transaction receipt status is reverted", receipt: addMarginReceipt }, { action: "add margin" });
      setAddMarginInlineError(message);
      toast.error(
        <div>
          <div>{message}</div>
          <a href={getSepoliaTxUrl(addMarginHash)} target="_blank" rel="noopener noreferrer" className="underline text-sm">View on Etherscan</a>
        </div>,
        { id: "add-margin" }
      );
      setTimeout(() => resetAddMargin(), 100);
    }
  }, [isAddMarginReverted, addMarginHash, addMarginReceipt, resetAddMargin]);

  // ── Render ──────────────────────────────────────────────────────────────────

  const rowBg = isClosing || isAddingMargin ? "bg-surface-2" : "hover:bg-surface-2/50";

  return (
    <React.Fragment>
      {/* ── Main position row ──────────────────────────────────────────── */}
      <tr className={`transition-colors border-b border-line-subtle ${rowBg}`}>

        {/* Market */}
        <td className="px-3 py-2.5 min-w-[100px]">
          <span className="text-[11px] font-semibold text-ink leading-none">
            {position.marketName?.replace("-PERP", "") || "GPU"}
          </span>
          <span className="text-[9px] text-ink-faint ml-1">PERP</span>
        </td>

        {/* Side */}
        <td className="px-3 py-2.5">
          <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
            isLong
              ? "text-up bg-up/10"
              : "text-down bg-down/10"
          }`}>
            {isLong ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
            {isLong ? "Long" : "Short"}
          </span>
        </td>

        {/* Size — dollar value on top (bright), GPU hours opened below (dim) */}
        <td className="px-3 py-2.5 text-right">
          <div className="num text-[12px] text-ink leading-tight">
            {metrics.hasMarkPrice ? `$${openNotional.toFixed(2)}` : "—"}
          </div>
          <div className="num text-[10px] text-ink-muted leading-tight mt-0.5">{displayedSize}</div>
        </td>

        {/* Entry */}
        <td className="px-3 py-2.5 text-right num text-[11px] text-ink-muted">
          ${entryPrice.toFixed(2)}
        </td>

        {/* Leverage */}
        <td className="px-3 py-2.5 text-right num text-[11px] text-ink">
          {metrics.hasMarkPrice && leverage > 0 ? `${leverage.toFixed(2)}×` : "—"}
        </td>

        {/* Margin */}
        <td className="px-3 py-2.5 text-right num text-[11px] text-ink-muted">
          ${margin.toFixed(2)}
        </td>

        {/* Liq */}
        <td className="px-3 py-2.5 text-right num text-[11px] text-warn">
          {metrics.hasLiquidationData && liqPrice > 0 ? `$${liqPrice.toFixed(2)}` : "—"}
        </td>

        {/* P&L + ROE */}
        <td className="px-3 py-2.5 text-right">
          <div className={`text-[12px] num font-semibold leading-none ${isProfitable ? "text-up" : "text-down"}`}>
            {metrics.hasPnlData ? `${isProfitable ? "+" : ""}${netPnL.toFixed(3)}` : "—"}
          </div>
          <div className={`text-[9px] num mt-0.5 ${isProfitable ? "text-up/70" : "text-down/70"}`}>
            {metrics.hasPnlData ? `${roe >= 0 ? "+" : ""}${roe.toFixed(2)}%` : "—"}
          </div>
        </td>

        {/* Actions */}
        <td className="px-3 py-2.5 text-right">
          <div className="flex items-center gap-1 justify-end">
            <button
              onClick={() => {
                setIsAddingMargin(v => !v);
                if (isClosing) { setClosingPosition(null); setCloseSize(""); }
              }}
              disabled={isCloseBusy || isAddMarginBusy}
              title="Add margin"
              className={`p-1.5 rounded transition-all disabled:opacity-40 ${
                isAddingMargin
                  ? "text-blue-400 bg-blue-500/15 border border-blue-500/25"
                  : "text-ink-faint hover:text-blue-400 hover:bg-blue-500/10 border border-transparent"
              }`}
            >
              <Plus size={11} />
            </button>
            <button
              onClick={() => {
                setIsAddingMargin(false);
                if (isClosing) { setClosingPosition(null); setCloseSize(""); }
                else setClosingPosition(position.marketId);
              }}
              disabled={isAddMarginBusy}
              className={`px-2 py-1 text-[9px] font-bold rounded border transition-all disabled:opacity-40 ${
                isClosing
                  ? "text-ink-muted bg-surface-3 border-line"
                  : "text-down bg-red-500/10 hover:bg-red-500/20 border-red-500/20 hover:border-red-500/35"
              }`}
            >
              {isClosing ? "Cancel" : "Close"}
            </button>
          </div>
        </td>
      </tr>

      {/* ── Close controls row ─────────────────────────────────────────── */}
      {isClosing && (
        <tr className="border-b border-line-subtle bg-surface-2">
          <td colSpan={9} className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[9px] text-ink-faint uppercase tracking-widest font-bold shrink-0">Close size</span>

              {/* Presets */}
              <div className="flex gap-1">
                {[25, 50, 75, 100].map(pct => {
                  const val = closePresetSize(absSizeRaw, pct).formatted;
                  return (
                    <button
                      key={pct}
                      onClick={() => setCloseSize(val)}
                      className={`px-2 py-1 text-[9px] font-bold rounded border transition-all ${
                        closeSize === val
                          ? "bg-red-500/15 border-red-500/35 text-down"
                          : "bg-surface-2 border-line-subtle text-ink-faint hover:text-ink hover:border-line"
                      }`}
                    >
                      {pct}%
                    </button>
                  );
                })}
              </div>

              {/* Size input */}
              <div className="relative">
                <input
                  type="number"
                  placeholder="0.0000"
                  value={closeSize}
                  onChange={e => setCloseSize(e.target.value)}
                  className="w-36 bg-surface-2 border border-line rounded px-2 pr-16 py-1.5 text-[11px] text-ink num focus:outline-none focus:border-red-500/30 placeholder-ink-ghost transition-colors"
                  step="any"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] num text-ink-faint pointer-events-none">
                  GPU-HRS
                </span>
              </div>

              {/* Confirm button */}
              <button
                onClick={() => initiateClose(closeSize)}
                disabled={isCloseBusy || !closeSize}
                className="px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-down text-[10px] font-bold rounded border border-red-500/25 hover:border-red-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isCloseBusy ? "…" : "Confirm Close"}
              </button>

              {/* Est P&L */}
              {closeSize && parseFloat(closeSize) > 0 && (
                <span className="text-[9px] text-ink-faint ml-1">
                  Est. P&L:{" "}
                  <span className={`num font-semibold ${currentPnL >= 0 ? "text-up" : "text-down"}`}>
                    {currentPnL >= 0 ? "+" : ""}${((currentPnL / absSize) * parseFloat(closeSize)).toFixed(3)}
                  </span>
                </span>
              )}
            </div>

            {closeInlineError && (
              <div className="mt-2 text-[10px] text-red-300 bg-red-500/10 border border-red-500/20 rounded px-2.5 py-1.5">
                {closeInlineError}
              </div>
            )}
          </td>
        </tr>
      )}

      {/* ── Add-margin controls row ────────────────────────────────────── */}
      {isAddingMargin && (
        <tr className="border-b border-line-subtle bg-surface-2">
          <td colSpan={9} className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[9px] text-ink-faint uppercase tracking-widest font-bold shrink-0">Add margin</span>
              <span className="text-[9px] text-ink-faint">
                Available: <span className="num text-ink-muted">{availableQuoteCollateral.toFixed(2)} USDC</span>
              </span>

              {/* Amount input */}
              <div className="relative">
                <input
                  type="number"
                  placeholder="0.00"
                  value={addMarginAmount}
                  onChange={e => { if (!isAddMarginBusy) { setAddMarginAmount(e.target.value); setAddMarginInlineError(""); } }}
                  disabled={isAddMarginBusy}
                  className="w-36 bg-surface-2 border border-line rounded px-2 pr-16 py-1.5 text-[11px] text-ink num focus:outline-none focus:border-blue-500/30 placeholder-ink-ghost transition-colors disabled:opacity-60"
                  step="0.01"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => { if (!isAddMarginBusy) setAddMarginAmount(availableQuoteCollateral > 0 ? availableQuoteCollateral.toFixed(2) : ""); }}
                    disabled={isAddMarginBusy || availableQuoteCollateral <= 0}
                    className="text-[8px] font-bold text-blue-400 hover:text-blue-300 disabled:text-ink-ghost"
                  >
                    MAX
                  </button>
                  <span className="text-[8px] num text-ink-faint">USDC</span>
                </div>
              </div>

              {/* Add button */}
              <button
                onClick={handleAddMargin}
                disabled={isAddMarginBusy || !addMarginAmount || isAddMarginOverAvailable}
                className="px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 text-[10px] font-bold rounded border border-blue-500/25 hover:border-blue-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isAddMarginBusy ? "…" : "Add Margin"}
              </button>

              {/* Preview */}
              {addMarginAmountNum > 0 && !isAddMarginOverAvailable && (
                <span className="text-[9px] text-ink-faint ml-1">
                  New lev:{" "}
                  <span className="num text-blue-300">{metrics.hasRiskData ? `${projectedLeverage.toFixed(1)}×` : "—"}</span>
                  {" "}· New margin:{" "}
                  <span className="num text-ink-muted">{projectedMargin.toFixed(2)} USDC</span>
                </span>
              )}
            </div>

            {isAddMarginOverAvailable && (
              <div className="mt-2 text-[10px] text-yellow-300 bg-yellow-500/10 border border-yellow-500/20 rounded px-2.5 py-1.5">
                Amount exceeds available deposited USDC.
              </div>
            )}
            {addMarginInlineError && (
              <div className="mt-2 text-[10px] text-red-300 bg-red-500/10 border border-red-500/20 rounded px-2.5 py-1.5">
                {addMarginInlineError}
              </div>
            )}
          </td>
        </tr>
      )}

      {/* Confirmation modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => { if (isCloseBusy) return; setShowConfirmModal(false); setPendingCloseAmount(null); }}
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
              { label: "Market", value: position.displayName || position.marketKey },
              { label: "Size",   value: `${pendingCloseAmount} GPU-HRS`, mono: true },
              {
                label: "Est. P&L",
                value: `${currentPnL >= 0 ? "+" : ""}$${((currentPnL / absSize) * parseFloat(pendingCloseAmount || 0)).toFixed(3)}`,
                cls:   currentPnL >= 0 ? "text-up" : "text-down",
              },
            ].map(({ label, value, mono, cls }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-[11px] text-ink-faint uppercase tracking-[0.1em]">{label}</span>
                <span className={`text-[12px] font-medium ${mono ? "num" : ""} ${cls || "text-ink"}`}>{value}</span>
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
    </React.Fragment>
  );
}

export default PositionPanel;
