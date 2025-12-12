import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { toast } from "react-hot-toast";
import { useAccount } from "wagmi";
import { supabase } from "./creatclient";
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
import {
  Info,
  Wallet,
  Settings,
  TrendingUp,
  Zap,
  Target,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Separator } from "./components/ui/separator";

// Info Tooltip Component
const InfoTooltip = ({ title, description }) => {
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const [isHovered, setIsHovered] = React.useState(false);
  const wrapperRef = React.useRef(null);

  const handleMouseEnter = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 8, left: rect.right - 220 });
      setIsHovered(true);
    }
  };

  return (
    <>
      <div
        className="inline-flex text-blue-400 hover:text-blue-300 cursor-help transition-colors"
        ref={wrapperRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Info size={14} className="opacity-80 hover:opacity-100" />
      </div>
      {isHovered &&
        ReactDOM.createPortal(
          <div
            className="fixed z-50 w-64 p-3 bg-[#0A0A0A] border border-zinc-700 rounded-lg shadow-xl text-xs text-zinc-300 pointer-events-none"
            style={{ top: `${position.top}px`, left: `${position.left}px` }}
          >
            <div className="font-semibold text-white mb-1">{title}</div>
            <div className="leading-relaxed">{description}</div>
          </div>,
          document.body
        )}
    </>
  );
};

export const TradingPanel = ({ selectedMarket }) => {
  const [side, setSide] = useState("Buy");
  const [size, setSize] = useState("");
  const [priceLimit, setPriceLimit] = useState("");
  const [leverage, setLeverage] = useState(1);
  const { address } = useAccount();

  const marketId = MARKET_IDS[selectedMarket] || MARKET_IDS["H100-PERP"];
  const { accountValue } = useAccountValue();
  const { totalCollateralValue } = useVaultBalance();
  const { riskParams } = useMarketRiskParams(marketId);

  const {
    openPosition,
    isPending,
    isSuccess,
    error: tradeError,
    hash,
    reset: resetTrade,
  } = useOpenPosition(marketId);

  const marketName =
    typeof selectedMarket === "string" ? selectedMarket : selectedMarket?.name;
  const { data: market, isLoading, error } = useMarketRealTimeData(marketName);
  const [handledTxHash, setHandledTxHash] = useState(null);

  useEffect(() => {
    if (isSuccess && hash && hash !== handledTxHash) {
      setHandledTxHash(hash);
      toast.success(
        <div>
          <div>Position opened successfully!</div>
          <a
            href={`https://sepolia.etherscan.io/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-sm"
          >
            View on Etherscan →
          </a>
        </div>,
        { id: "trade", duration: 5000 }
      );

      // Save trade to Supabase for trade history and volume tracking
      const saveTrade = async () => {
        if (!address || !market) return;

        const tradeData = {
          user_address: address.toLowerCase(),
          market: market.displayName || market.name,
          side: side === "Buy" ? "Long" : "Short",
          size: parseFloat(size),
          price:
            parseFloat(market.price) || parseFloat(market.markPriceRaw) || 0,
          notional:
            parseFloat(size) *
            (parseFloat(market.price) || parseFloat(market.markPriceRaw) || 0),
          tx_hash: hash,
        };

        try {
          const { error } = await supabase
            .from("trade_history")
            .insert([tradeData]);

          if (error) {
            console.warn("Error saving trade history:", error.message);
          }
        } catch (err) {
          console.warn("Error saving trade:", err);
        }
      };

      saveTrade();
      setSize("");
      setPriceLimit("");
      setTimeout(() => resetTrade(), 100);
    }
  }, [isSuccess, hash, handledTxHash, address, market, side, size, resetTrade]);

  useEffect(() => {
    if (tradeError) {
      toast.error("Trade failed: " + tradeError.message, { id: "trade" });
      resetTrade();
    }
  }, [tradeError, resetTrade]);

  if (!selectedMarket)
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-xs">
        Select Market
      </div>
    );
  if (isLoading)
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-xs">
        Loading...
      </div>
    );
  if (error || !market)
    return (
      <div className="flex items-center justify-center h-full text-red-400 text-xs">
        Error
      </div>
    );

  const handleSizeButtonClick = (percentage) => {
    const accountValueNum = parseFloat(accountValue) || 0;
    const vaultBalanceNum = parseFloat(totalCollateralValue) || 0;
    const effectiveBalance =
      accountValueNum > 0 ? accountValueNum : vaultBalanceNum;
    const currentPrice = parseFloat(market?.markPriceRaw) || 3.79;
    const imr = riskParams?.imrPercent ? riskParams.imrPercent / 100 : 0.1;
    // Adjust max size based on leverage
    const maxPositionSize = (effectiveBalance * leverage) / currentPrice / imr;
    const calculatedSize = maxPositionSize * (percentage / 100);
    setSize(calculatedSize > 0 ? calculatedSize.toFixed(4) : "");
  };

  const handleTrade = async () => {
    if (!size || parseFloat(size) <= 0)
      return toast.error("Please enter a valid size");
    try {
      const isLong = side === "Buy";
      let priceLimitValue =
        priceLimit && parseFloat(priceLimit) > 0 ? parseFloat(priceLimit) : 0;
      openPosition(isLong, size, priceLimitValue);
      toast.loading(
        `${side === "Buy" ? "Opening long" : "Opening short"} position...`,
        { id: "trade" }
      );
    } catch (error) {
      toast.error("Failed to execute trade: " + error.message);
    }
  };

  const notionalValue =
    (parseFloat(size) || 0) * (parseFloat(market.price) || 0);
  const fees = notionalValue * 0.001; // Est. 0.1% fee
  const marginRequired = notionalValue / leverage;

  return (
    <div className="flex flex-col h-full bg-[#050505]">
      {/* Header Tabs */}
      <div className="flex border-b border-zinc-800">
        <button
          className={`flex-1 py-3 text-sm font-bold transition-all ${
            side === "Buy"
              ? "text-green-400 border-b-2 border-green-400 bg-green-400/5"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
          }`}
          onClick={() => setSide("Buy")}
        >
          Buy / Long
        </button>
        <button
          className={`flex-1 py-3 text-sm font-bold transition-all ${
            side === "Sell"
              ? "text-red-400 border-b-2 border-red-400 bg-red-400/5"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
          }`}
          onClick={() => setSide("Sell")}
        >
          Sell / Short
        </button>
      </div>

      <div className="p-4 space-y-5 flex-1 overflow-y-auto custom-scrollbar">
        {/* Collateral & Mint - Moved to top */}
        <div className="space-y-3">
          <CollateralManager />
          <MintUSDC />
        </div>

        <Separator className="bg-zinc-800/50" />

        {/* Order Type */}
        <div className="flex gap-4 text-xs font-medium text-zinc-400 pb-2 border-b border-zinc-800/50">
          <button className="text-white">Market</button>
        </div>

        {/* Size Input */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-zinc-400">
            <span>Size</span>
            <span>
              Max:{" "}
              {(
                (parseFloat(accountValue) * leverage) /
                parseFloat(market.price)
              ).toFixed(2)}{" "}
              {market.baseAsset}
            </span>
          </div>
          <div className="relative group">
            <input
              type="number"
              placeholder="0.00"
              className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-lg pl-3 pr-12 py-3 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder-zinc-600 font-mono"
              value={size}
              onChange={(e) => setSize(e.target.value)}
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-500 text-xs font-bold">
              {market.baseAsset}
            </span>
          </div>
          {/* Quick Size Percentages */}
          <div className="grid grid-cols-4 gap-2 mt-2">
            {[25, 50, 75, 100].map((p) => (
              <button
                key={p}
                onClick={() => handleSizeButtonClick(p)}
                className="py-1 text-[10px] font-medium bg-[#0A0A0A] hover:bg-zinc-800 text-zinc-400 hover:text-white rounded border border-zinc-800 transition-colors"
              >
                {p}%
              </button>
            ))}
          </div>
        </div>

        {/* Price Input */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-zinc-400">
            <span>Price</span>
            <span
              className="text-blue-400 cursor-pointer"
              onClick={() => setPriceLimit(market.price)}
            >
              Use Market
            </span>
          </div>
          <div className="relative group">
            <input
              type="number"
              placeholder="Market Price"
              className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-lg pl-3 pr-12 py-3 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder-zinc-600 font-mono"
              value={priceLimit}
              onChange={(e) => setPriceLimit(e.target.value)}
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-500 text-xs">
              USDC
            </span>
          </div>
        </div>

        {/* Leverage Slider */}
        <div className="space-y-3 pt-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-400 font-medium">Leverage</span>
            <span className="text-xs font-bold text-white bg-zinc-800 px-2 py-0.5 rounded">
              {leverage}x
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={leverage}
            onChange={(e) => setLeverage(parseInt(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
            <span>1x</span>
            <span>3x</span>
            <span>5x</span>
            <span>7x</span>
            <span>10x</span>
          </div>
        </div>

        {/* Order Summary */}
        <Card className="bg-[#0A0A0A]/30 border-zinc-800/50">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Target size={12} className="text-zinc-400" />
              <span className="text-xs text-zinc-400 font-medium">
                Order Summary
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Notional Value</span>
              <span className="text-zinc-300 font-mono">
                ${notionalValue.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Est. Fees (0.1%)</span>
              <span className="text-zinc-300 font-mono">
                ${fees.toFixed(2)}
              </span>
            </div>
            <Separator className="bg-zinc-800/50" />
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400 font-medium">
                Margin Required
              </span>
              <span className="text-white font-bold font-mono">
                ${marginRequired.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Risk Metrics */}
        <Card className="bg-[#0A0A0A]/30 border-zinc-800/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={16} className="text-blue-400" />
              <span className="text-sm text-zinc-300 font-semibold">
                Risk Parameters
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#0A0A0A]/50 p-3 rounded-lg border border-zinc-800 flex flex-col items-center justify-center">
                <span className="text-xs text-zinc-500 mb-1 flex items-center gap-1.5">
                  IMR
                  <InfoTooltip
                    title="Initial Margin Requirement"
                    description="The minimum margin required to open a new position. For example, 10% IMR means you need $100 margin to open a $1000 position (10x leverage)."
                  />
                </span>
                <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5">
                  {riskParams?.imrPercent
                    ? riskParams.imrPercent.toFixed(1) + "%"
                    : "10.0%"}
                </Badge>
              </div>
              <div className="bg-[#0A0A0A]/50 p-3 rounded-lg border border-zinc-800 flex flex-col items-center justify-center">
                <span className="text-xs text-zinc-500 mb-1 flex items-center gap-1.5">
                  MMR
                  <InfoTooltip
                    title="Maintenance Margin Requirement"
                    description="The minimum margin needed to keep your position open. If your margin falls below this level, your position can be liquidated. Lower than IMR to give you buffer room."
                  />
                </span>
                <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5">
                  {riskParams?.mmrPercent
                    ? riskParams.mmrPercent.toFixed(1) + "%"
                    : "5.0%"}
                </Badge>
              </div>
              <div className="bg-[#0A0A0A]/50 p-3 rounded-lg border border-zinc-800 flex flex-col items-center justify-center">
                <span className="text-xs text-zinc-500 mb-1 flex items-center gap-1.5">
                  Liq. Pen
                  <InfoTooltip
                    title="Liquidation Penalty"
                    description="The penalty charged if your position gets liquidated. This goes to the liquidator (50%) and protocol insurance fund (50%). Avoid liquidation!"
                  />
                </span>
                <Badge variant="warning" className="font-mono text-xs px-2 py-0.5">
                  {riskParams?.liquidationPenaltyPercent
                    ? riskParams.liquidationPenaltyPercent.toFixed(1) + "%"
                    : "5.0%"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submit Button (Fixed at Bottom) */}
      <div className="p-4 border-t border-zinc-800 bg-[#050505]">
        <button
          className={`w-full py-3.5 rounded-lg font-bold text-white text-sm shadow-lg transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
            side === "Buy"
              ? "bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 shadow-green-900/20"
              : "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 shadow-red-900/20"
          }`}
          onClick={handleTrade}
          disabled={isPending || !size || parseFloat(size) <= 0}
        >
          {isPending
            ? "Processing..."
            : `${side === "Buy" ? "Buy / Long" : "Sell / Short"} ${
                market.baseAsset
              }`}
        </button>
      </div>
    </div>
  );
};
