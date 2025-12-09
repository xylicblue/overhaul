// Component to display user's open positions
import { useState, useEffect, useRef } from "react";
import { useAccount, useReadContract } from "wagmi";
import { toast } from "react-hot-toast";
import { useAllPositions, useClosePosition } from "../hooks/useClearingHouse";
import { useMarkPrice, useFundingRate } from "../hooks/useVAMM";
import { SEPOLIA_CONTRACTS, MARKET_IDS } from "../contracts/addresses";
import MarketRegistryABI from "../contracts/abis/MarketRegistry.json";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  X,
  AlertCircle,
  ArrowRight,
  Activity,
} from "lucide-react";
import { supabase } from "../creatclient";

export function PositionPanel() {
  const { address, isConnected } = useAccount();
  const { positions, isLoading, error } = useAllPositions();
  const [closingPosition, setClosingPosition] = useState(null);
  const [closeSize, setCloseSize] = useState("");

  if (!isConnected) {
    return (
      <div className="flex flex-col h-full bg-slate-950/50 backdrop-blur-sm">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur-md z-10">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity size={16} className="text-blue-400" />
            Positions
          </h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
          <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 shadow-inner border border-white/5">
            <Wallet size={24} className="text-slate-600" />
          </div>
          <p className="text-slate-300 font-medium mb-1">
            Wallet Not Connected
          </p>
          <span className="text-xs text-slate-500 max-w-[200px]">
            Connect your wallet to view your active positions and performance.
          </span>
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
        <div className="flex-1 flex flex-col items-center justify-center text-red-400 p-6 text-center">
          <AlertCircle size={32} className="mb-3 opacity-80" />
          <p className="text-sm font-medium">Error loading positions</p>
          <span className="text-xs opacity-70 mt-1">{error.message}</span>
        </div>
      </div>
    );
  }

  if (!positions || positions.length === 0) {
    return (
      <div className="flex flex-col h-full bg-slate-950/50 backdrop-blur-sm">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur-md z-10">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity size={16} className="text-blue-400" />
            Positions
          </h3>
          <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
            0
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
          <div className="w-16 h-16 bg-slate-900/50 rounded-full flex items-center justify-center mb-4 border border-dashed border-slate-700">
            <TrendingUp size={24} className="text-slate-700" />
          </div>
          <p className="text-slate-300 font-medium mb-1">No Open Positions</p>
          <span className="text-xs text-slate-500 max-w-[200px]">
            Open a position in the market to see it tracked here.
          </span>
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

  const handleClose = (closeAmount) => {
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

    try {
      // Store the close size for P&L calculation
      closedSizeRef.current = parseFloat(closeAmount);
      closePosition(closeAmount, 0);
      toast.loading("Closing position...", { id: "close" });
      setClosingPosition(null);
      setCloseSize("");
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

      saveCloseTrade();
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`relative rounded-xl border overflow-hidden transition-all duration-300 group ${
        isLong
          ? "bg-gradient-to-br from-green-900/10 to-slate-900/50 border-green-500/20 hover:border-green-500/40 hover:shadow-[0_0_20px_rgba(34,197,94,0.1)]"
          : "bg-gradient-to-br from-red-900/10 to-slate-900/50 border-red-500/20 hover:border-red-500/40 hover:shadow-[0_0_20px_rgba(239,68,68,0.1)]"
      }`}
    >
      {/* Background Glow */}
      <div
        className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-20 pointer-events-none ${
          isLong ? "bg-green-500" : "bg-red-500"
        }`}
      ></div>

      <div className="p-4 relative z-10">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                isLong
                  ? "bg-green-500/10 text-green-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              {isLong ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
            </div>
            <div>
              <div className="font-bold text-white text-sm tracking-wide">
                {position.marketName}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    isLong ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {isLong ? "Long" : "Short"}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">|</span>
                <span className="text-[10px] text-slate-300 font-mono">
                  {absSize.toFixed(4)} Size
                </span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div
              className={`font-mono font-bold text-base ${
                isProfitable
                  ? "text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]"
                  : "text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]"
              }`}
            >
              {isProfitable ? "+" : ""}${currentPnL.toFixed(2)}
            </div>
            <div
              className={`text-xs font-medium ${
                isProfitable ? "text-green-500/70" : "text-red-500/70"
              }`}
            >
              Trading P&L {isProfitable ? "+" : ""}
              {pnlPercent.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* P&L Breakdown */}
        <div className="mb-3 bg-slate-950/30 rounded-lg p-3 border border-white/5 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Trading P&L</span>
            <span
              className={`font-mono font-semibold ${
                currentPnL >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {currentPnL >= 0 ? "+" : ""}${currentPnL.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">
              Funding {fundingEarned >= 0 ? "Received" : "Paid"}
            </span>
            <span
              className={`font-mono font-semibold ${
                fundingEarned >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {fundingEarned >= 0 ? "+" : ""}${fundingEarned.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Fees Paid</span>
            <span className="text-red-400/80 font-mono font-semibold">
              -${feesPaid.toFixed(2)}
            </span>
          </div>
          <div className="border-t border-white/5 pt-2 flex justify-between items-center text-xs">
            <span className="text-white font-semibold">Net P&L</span>
            <span
              className={`font-mono font-bold ${
                currentPnL + fundingEarned - feesPaid >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {currentPnL + fundingEarned - feesPaid >= 0 ? "+" : ""}$
              {(currentPnL + fundingEarned - feesPaid).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs mb-4 bg-slate-950/30 rounded-lg p-3 border border-white/5">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Entry Price</span>
            <span className="text-slate-200 font-mono">
              ${entryPrice.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Mark Price</span>
            <span className="text-slate-200 font-mono">
              ${currentPrice > 0 ? currentPrice.toFixed(2) : "..."}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Notional</span>
            <span className="text-slate-200 font-mono">
              ${openNotional.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Margin</span>
            <span className="text-slate-200 font-mono">
              ${margin.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Action Button */}
        {!isClosing ? (
          <button
            className="w-full py-2 bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-lg transition-all border border-white/5 hover:border-white/10 flex items-center justify-center gap-2 group/btn"
            onClick={() => setClosingPosition(position.marketId)}
          >
            Close Position
            <ArrowRight
              size={12}
              className="opacity-0 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all"
            />
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="bg-slate-900/80 rounded-lg p-3 border border-white/10"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-white">Close Amount</span>
              <button
                onClick={() => setClosingPosition(null)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <input
                  type="number"
                  placeholder="Amount"
                  value={closeSize}
                  onChange={(e) => setCloseSize(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                  step="0.0001"
                />
                <button
                  className="absolute right-1 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-slate-800 text-blue-400 text-[10px] font-bold rounded hover:bg-slate-700 transition-colors"
                  onClick={() => setCloseSize(absSize.toString())}
                >
                  MAX
                </button>
              </div>
            </div>

            <button
              className="w-full py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-md transition-all shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => handleClose(closeSize)}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Closing...
                </>
              ) : (
                "Confirm Close"
              )}
            </button>

            {hash && (
              <div className="text-center mt-2">
                <a
                  href={`https://sepolia.etherscan.io/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-blue-400 hover:text-blue-300 hover:underline flex items-center justify-center gap-1"
                >
                  View Transaction <ArrowRight size={10} />
                </a>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export default PositionPanel;
