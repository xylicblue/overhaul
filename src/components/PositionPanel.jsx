// Component to display user's open positions
import { useState, useEffect, useRef } from "react";
import { useAccount, useReadContract } from "wagmi";
import { toast } from "react-hot-toast";
import { useAllPositions, useClosePosition } from "../hooks/useClearingHouse";
import { useMarkPrice, useFundingRate } from "../hooks/useVAMM";
import { SEPOLIA_CONTRACTS, MARKET_IDS } from "../contracts/addresses";
import MarketRegistryABI from "../contracts/abis/MarketRegistry.json";
import { motion, AnimatePresence } from "framer-motion";
import ConfirmationModal from "./ConfirmationModal";
import EmptyState, { CompactEmptyState } from "./EmptyState";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  X,
  AlertCircle,
  ArrowRight,
  Activity,
  RefreshCw,
} from "lucide-react";
import { supabase } from "../creatclient";

export function PositionPanel({ selectedMarket = null }) {
  const { address, isConnected } = useAccount();
  const { positions: allPositions, isLoading, error } = useAllPositions();
  const [closingPosition, setClosingPosition] = useState(null);
  const [closeSize, setCloseSize] = useState("");

  // Get market ID from selected market
  const marketName = typeof selectedMarket === "string"
    ? selectedMarket
    : selectedMarket?.name || null;
  const selectedMarketId = marketName ? MARKET_IDS[marketName] : null;

  // Filter positions by selected market if a market is selected
  const positions = selectedMarketId && allPositions
    ? allPositions.filter(pos => pos.marketId.toLowerCase() === selectedMarketId.toLowerCase())
    : allPositions;

  if (!isConnected) {
    return (
      <div className="flex flex-col h-full bg-slate-950/50 backdrop-blur-sm">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur-md z-10">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity size={16} className="text-blue-400" />
            Positions
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <CompactEmptyState
            icon={Wallet}
            title="Connect Wallet"
            description="Connect your wallet to view and manage your positions."
          />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-slate-950/50 backdrop-blur-sm">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur-md z-10">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity size={16} className="text-blue-400" />
            Positions
          </h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
          <span className="text-xs font-medium animate-pulse">
            Loading positions...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full bg-slate-950/50 backdrop-blur-sm">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur-md z-10">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity size={16} className="text-blue-400" />
            Positions
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <CompactEmptyState
            icon={AlertCircle}
            title="Error Loading Positions"
            description={error.message || "Something went wrong. Please try again."}
            actionLabel="Retry"
            onAction={() => window.location.reload()}
          />
        </div>
      </div>
    );
  }

  // Market display name for UI
  const marketDisplayNames = {
    "H100-PERP": "H100 GPU",
    "H100-non-HyperScalers-PERP": "Neocloud",
  };
  const displayMarketName = marketName ? marketDisplayNames[marketName] || marketName : "All Markets";

  if (!positions || positions.length === 0) {
    return (
      <div className="flex flex-col h-full bg-slate-950/50 backdrop-blur-sm">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur-md z-10">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity size={16} className="text-blue-400" />
            Positions
            {marketName && (
              <span className="text-[10px] text-zinc-500 font-normal">• {displayMarketName}</span>
            )}
          </h3>
          <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
            0
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <CompactEmptyState
            icon={TrendingUp}
            title="No Open Positions"
            description={marketName
              ? `Open a position in ${displayMarketName} to see it tracked here.`
              : "Open a position to see it tracked here."
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-950/50 backdrop-blur-sm">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur-md z-10">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Activity size={16} className="text-blue-400" />
          Positions
          {marketName && (
            <span className="text-[10px] text-zinc-500 font-normal">• {displayMarketName}</span>
          )}
        </h3>
        <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.2)]">
          {positions.length} Active
        </span>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
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

function PositionCard({
  position,
  closingPosition,
  setClosingPosition,
  closeSize,
  setCloseSize,
}) {
  const isLong = position.isLong;
  const size = parseFloat(position.size);
  const absSize = Math.abs(size);
  const entryPrice = parseFloat(position.entryPriceX18);
  const margin = parseFloat(position.margin);
  const realizedPnL = parseFloat(position.realizedPnL);

  const vammAddress =
    position.vammAddress ||
    (position.marketKey === "H100-PERP" || position.marketKey === "ETH-PERP-V2"
      ? SEPOLIA_CONTRACTS.vammProxy
      : SEPOLIA_CONTRACTS.vammProxyOld);

  const { price: markPrice } = useMarkPrice(vammAddress);
  const currentPrice = markPrice ? parseFloat(markPrice) : 0;

  // Get current funding index to calculate funding payments
  const { cumulativeFunding: currentFundingIndex } =
    useFundingRate(vammAddress);
  const currentIndex = parseFloat(currentFundingIndex || 0);
  const lastIndex = parseFloat(position.lastFundingIndex || 0);

  // Calculate funding payment: (currentIndex - lastIndex) × size / 1e18
  // Negative payment means the position received funding
  const fundingPayment = (currentIndex - lastIndex) * size;
  const fundingEarned = -fundingPayment; // Flip sign: negative payment = positive earning

  // Get market config for fee calculation
  const { data: marketConfig } = useReadContract({
    address: SEPOLIA_CONTRACTS.marketRegistry,
    abi: MarketRegistryABI.abi,
    functionName: "getMarket",
    args: [position.marketId],
    chainId: 11155111,
  });

  // Calculate trading fees paid: notional × feeBps / 10000
  const feeBps = marketConfig?.feeBps || 10; // Default 0.1%
  const openNotional = entryPrice * absSize;
  const feesPaid = (openNotional * feeBps) / 10000;

  const currentPnL =
    currentPrice > 0
      ? isLong
        ? (currentPrice - entryPrice) * absSize
        : (entryPrice - currentPrice) * absSize
      : 0;

  const pnlPercent = openNotional > 0 ? (currentPnL / openNotional) * 100 : 0;
  const isProfitable = currentPnL >= 0;

  const {
    closePosition,
    isPending,
    isSuccess,
    error: closeError,
    hash,
  } = useClosePosition(position.marketId);

  const { address } = useAccount();
  const handledTxHashRef = useRef(null);
  const closedSizeRef = useRef(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingCloseAmount, setPendingCloseAmount] = useState(null);

  // Called when user clicks 'Confirm Close' - shows confirmation modal
  const initiateClose = (closeAmount) => {
    if (!closeAmount || parseFloat(closeAmount) <= 0) {
      toast.error("Please enter a valid size to close");
      return;
    }

    if (parseFloat(closeAmount) > absSize) {
      toast.error(
        `Cannot close more than position size (${absSize.toFixed(4)})`
      );
      return;
    }

    setPendingCloseAmount(closeAmount);
    setShowConfirmModal(true);
  };

  // Called after modal confirmation
  const handleClose = (closeAmount) => {
    try {
      // Store the close size for P&L calculation
      closedSizeRef.current = parseFloat(closeAmount);
      closePosition(closeAmount, 0);
      toast.loading("Closing position...", { id: "close" });
      setClosingPosition(null);
      setCloseSize("");
      setShowConfirmModal(false);
      setPendingCloseAmount(null);
    } catch (error) {
      console.error("Close position error:", error);
      toast.error("Failed to close position: " + error.message, {
        id: "close",
      });
    }
  };

  useEffect(() => {
    if (isSuccess && hash && hash !== handledTxHashRef.current) {
      handledTxHashRef.current = hash;
      toast.success("Position closed successfully!", { id: "close" });

      // Save the closed trade to Supabase with P&L
      const saveCloseTrade = async () => {
        if (!address || !position) return;

        const closedSize = closedSizeRef.current || absSize;
        // Calculate the proportion of position being closed
        const closeProportion = closedSize / absSize;

        // Calculate P&L for the closed portion
        const closedPnL =
          currentPrice > 0
            ? isLong
              ? (currentPrice - entryPrice) * closedSize
              : (entryPrice - currentPrice) * closedSize
            : 0;

        // Calculate funding earned for the closed portion (proportional)
        const closedFundingEarned = fundingEarned * closeProportion;

        // Calculate fees paid for the closed portion
        // Opening fee was already paid, closing fee is on close notional
        const closeNotional = closedSize * (currentPrice || entryPrice);
        const closingFee = (closeNotional * feeBps) / 10000;
        const openingFeeProportion = feesPaid * closeProportion;
        const totalFeesPaid = openingFeeProportion + closingFee;

        const tradeData = {
          user_address: address.toLowerCase(),
          market: position.marketName || position.marketKey || "H100-GPU-PERP",
          side: isLong ? "Long" : "Short",
          size: closedSize,
          price: currentPrice || entryPrice,
          notional: closedSize * (currentPrice || entryPrice),
          tx_hash: hash,
          pnl: closedPnL,
          funding_earned: closedFundingEarned,
          fees_paid: totalFeesPaid,
        };

        try {
          const { error } = await supabase
            .from("trade_history")
            .insert([tradeData]);

          if (error) {
            console.warn("Error saving close trade:", error.message);
          }
        } catch (err) {
          console.warn("Error saving close trade:", err);
        }
      };

      // Save vAMM price to vamm_price_history for chart display (all markets including H200)
      const saveVAMMPrice = async () => {
        const marketName = position.marketName || position.marketKey || "H100-PERP";
        const vammPriceData = {
          market: marketName,
          price: currentPrice || entryPrice,
          twap: currentPrice || entryPrice, // Use current price as TWAP approximation
          timestamp: new Date().toISOString(),
        };

        try {
          const { error: vammError } = await supabase
            .from("vamm_price_history")
            .insert([vammPriceData]);

          if (vammError) {
            console.warn("Error saving vAMM price:", vammError.message);
          } else {
            console.log("vAMM price saved on position close:", vammPriceData);
          }
        } catch (err) {
          console.warn("Error saving vAMM price:", err);
        }
      };

      saveCloseTrade();
      saveVAMMPrice();
    }
  }, [
    isSuccess,
    hash,
    address,
    position,
    absSize,
    isLong,
    entryPrice,
    currentPrice,
    fundingEarned,
    feesPaid,
    feeBps,
  ]);

  useEffect(() => {
    if (closeError) {
      const errorMsg = closeError.message?.includes("User rejected")
        ? "Transaction cancelled"
        : "Failed to close position";
      toast.error(errorMsg, { id: "close" });
    }
  }, [closeError]);

  const isClosing = closingPosition === position.marketId;
  const [showDetails, setShowDetails] = useState(false);
  const netPnL = currentPnL + fundingEarned - feesPaid;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`relative rounded-xl border overflow-hidden transition-all duration-300 ${
        isLong
          ? "bg-gradient-to-br from-green-900/10 to-slate-900/50 border-emerald-500/20 hover:border-emerald-500/30"
          : "bg-gradient-to-br from-red-900/10 to-slate-900/50 border-red-500/20 hover:border-red-500/30"
      }`}
    >
      <div className="p-3 relative z-10">
        {/* Header Row */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-lg ${
                isLong
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              {isLong ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-sm">
                  {position.marketName?.replace("-PERP", "")}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    isLong ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {isLong ? "Long" : "Short"}
                </span>
              </div>
              <div className="text-xs text-slate-400 font-mono">
                {absSize.toFixed(2)} GPU-HRS @ ${entryPrice.toFixed(2)}
              </div>
            </div>
          </div>

          {/* P&L on Right */}
          <div className="text-right">
            <div
              className={`font-mono font-bold text-base ${
                netPnL >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {netPnL >= 0 ? "+" : ""}${netPnL.toFixed(2)}
            </div>
            <div
              className={`text-xs font-medium ${
                isProfitable ? "text-emerald-500/70" : "text-red-500/70"
              }`}
            >
              {isProfitable ? "+" : ""}{pnlPercent.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="flex items-center justify-between text-xs mb-3 py-2 px-3 bg-slate-950/40 rounded-lg">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Mark:</span>
              <span className="text-white font-mono">${currentPrice > 0 ? currentPrice.toFixed(2) : "..."}</span>
            </div>
            <div className="w-px h-3 bg-slate-700"></div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">P&L:</span>
              <span className={`font-mono font-semibold ${netPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {netPnL >= 0 ? "+" : ""}${netPnL.toFixed(2)}
              </span>
            </div>
            <div className="w-px h-3 bg-slate-700"></div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Notional:</span>
              <span className="text-white font-mono">${openNotional.toFixed(0)}</span>
            </div>
            <div className="w-px h-3 bg-slate-700"></div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Margin:</span>
              <span className="text-white font-mono">${margin.toFixed(0)}</span>
            </div>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors ml-2 shrink-0"
          >
            {showDetails ? "Hide" : "Details"}
          </button>
        </div>

        {/* Expandable Details */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 overflow-hidden"
            >
              <div className="bg-slate-950/40 rounded-lg p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Trading P&L</span>
                  <span className={`font-mono ${currentPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {currentPnL >= 0 ? "+" : ""}${currentPnL.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Funding {fundingEarned >= 0 ? "Received" : "Paid"}</span>
                  <span className={`font-mono ${fundingEarned >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {fundingEarned >= 0 ? "+" : ""}${fundingEarned.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Fees Paid</span>
                  <span className="text-red-400/80 font-mono">-${feesPaid.toFixed(2)}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Close Position Button - Prominent */}
        {!isClosing ? (
          <button
            className="w-full py-2 mt-1 flex items-center justify-center gap-2 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-red-600 rounded-lg transition-all border border-zinc-700/50 hover:border-red-500"
            onClick={() => setClosingPosition(position.marketId)}
          >
            <X size={14} />
            Close Position
          </button>
        ) : (
          <div className="mt-1 space-y-2">
            {/* Quick % buttons row */}
            <div className="flex gap-1.5">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  className={`flex-1 py-1 text-[10px] font-bold rounded transition-all ${
                    closeSize === (absSize * pct / 100).toFixed(2)
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700/50"
                  }`}
                  onClick={() => setCloseSize((absSize * pct / 100).toFixed(2))}
                >
                  {pct}%
                </button>
              ))}
            </div>
            {/* Input + Buttons row */}
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Size..."
                value={closeSize}
                onChange={(e) => setCloseSize(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                step="0.01"
              />
              <button
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50"
                onClick={() => initiateClose(closeSize)}
                disabled={isPending || !closeSize}
              >
                {isPending ? "..." : "Close"}
              </button>
              <button
                onClick={() => setClosingPosition(null)}
                className="px-2 py-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setPendingCloseAmount(null);
        }}
        onConfirm={() => handleClose(pendingCloseAmount)}
        title="Close Position"
        message={`Are you sure you want to close ${pendingCloseAmount || 0} GPU-HOURS of your ${isLong ? 'Long' : 'Short'} position?`}
        confirmText="Close Position"
        cancelText="Cancel"
        variant="danger"
        isLoading={isPending}
        details={
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Market</span>
              <span className="text-white font-medium">{position.displayName || position.marketKey}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Size to Close</span>
              <span className="text-white font-mono">{pendingCloseAmount} GPU-HRS</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Estimated P&L</span>
              <span className={`font-mono font-semibold ${currentPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {currentPnL >= 0 ? '+' : ''}${((currentPnL / absSize) * parseFloat(pendingCloseAmount || 0)).toFixed(2)}
              </span>
            </div>
          </div>
        }
      />
    </motion.div>
  );
}

export default PositionPanel;
