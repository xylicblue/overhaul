import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { useMarket } from "../marketcontext";
import { useMarketRealTimeData, useMarketsData } from "../marketData";
import { useReadContract } from "wagmi";
import { SEPOLIA_CONTRACTS, MARKET_IDS } from "../contracts/addresses";
import MarketRegistryABI from "../contracts/abis/MarketRegistry.json";
import {
  ChevronDown,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Info,
} from "lucide-react";

// Info Tooltip Component with Portal
const InfoTooltip = ({ title, description }) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const wrapperRef = useRef(null);

  const handleMouseEnter = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: Math.max(10, rect.left - 100),
      });
      setIsHovered(true);
    }
  };

  return (
    <>
      <div
        className="inline-flex text-zinc-500 hover:text-zinc-300 cursor-help transition-colors ml-1"
        ref={wrapperRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Info size={10} />
      </div>
      {isHovered &&
        ReactDOM.createPortal(
          <div
            className="fixed z-[100] w-56 p-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg shadow-xl text-xs text-zinc-300 pointer-events-none"
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

const TickerBar = () => {
  const { selectedMarket, selectMarket } = useMarket();
  const { markets } = useMarketsData();

  const marketName =
    typeof selectedMarket === "string"
      ? selectedMarket
      : selectedMarket?.name || "H100-PERP";
  const { data: marketData } = useMarketRealTimeData(marketName);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  // Fetch market config for fee display
  const marketId = MARKET_IDS[marketName] || MARKET_IDS["H100-PERP"];
  const { data: marketConfig } = useReadContract({
    address: SEPOLIA_CONTRACTS.marketRegistry,
    abi: MarketRegistryABI.abi,
    functionName: "getMarket",
    args: [marketId],
    chainId: 11155111,
  });

  const marketFee = marketConfig?.feeBps
    ? `${(marketConfig.feeBps / 100).toFixed(2)}%`
    : "0.10%";

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredMarkets = markets.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.displayName &&
        m.displayName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const changeIsPositive = marketData?.change24hValue >= 0;

  return (
    <div className="h-12 bg-[#050505] border-b border-zinc-800 flex items-center px-4 gap-4 md:gap-6 shrink-0 overflow-x-auto no-scrollbar">
      {/* Market Selector */}
      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          className="flex items-center gap-2 hover:bg-zinc-900 px-2 py-1 rounded transition-colors"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base md:text-lg text-white whitespace-nowrap">
                {marketData?.displayName || marketName}
              </span>
              <span className="text-[10px] text-zinc-500 bg-zinc-900 px-1 rounded border border-zinc-800 hidden sm:inline-block">
                PERP
              </span>
              <ChevronDown size={14} className="text-zinc-500" />
            </div>
          </div>
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute top-full left-0 mt-2 w-64 bg-[#0A0A0A] border border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="p-2 border-b border-zinc-800">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-zinc-500 w-3 h-3" />
                <input
                  type="text"
                  placeholder="Search markets..."
                  className="w-full bg-[#050505] border border-zinc-800 rounded pl-7 pr-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto custom-scrollbar">
              {filteredMarkets.length === 0 ? (
                <div className="px-3 py-2 text-xs text-zinc-500">No markets found</div>
              ) : (
                filteredMarkets.map((market) => (
                  <button
                    key={market.name}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-zinc-800 flex justify-between items-center ${
                      market.name === marketName
                        ? "bg-blue-900/20 text-blue-400"
                        : "text-zinc-300"
                    }`}
                    onClick={() => {
                      selectMarket(market.name);
                      setIsDropdownOpen(false);
                    }}
                  >
                    <span className="font-medium text-white">
                      {market.displayName || market.name}
                    </span>
                    <span
                      className={
                        market.change24h >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    >
                      ${market.markPrice?.toFixed(2) || market.oraclePrice?.toFixed(2) || '0.00'}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Ticker Stats */}
      <div className="flex items-center gap-4 md:gap-6 overflow-x-auto no-scrollbar flex-1">
        <div className="flex flex-col shrink-0">
          <span
            className={`text-base md:text-lg font-mono font-bold whitespace-nowrap ${
              changeIsPositive ? "text-green-400" : "text-red-400"
            }`}
          >
            ${marketData?.price || "0.00"}
          </span>
          <span className="text-[10px] text-zinc-500 flex items-center whitespace-nowrap">
            Mark Price
            <InfoTooltip
              title="Mark Price ($/hour)"
              description="The current trading price for H100 GPU compute hours from the vAMM. This is the price at which you can buy or sell GPU-hour exposure on ByteStrike."
            />
          </span>
        </div>

        <div className="flex flex-col shrink-0">
          <span
            className={`text-xs font-medium flex items-center gap-1 whitespace-nowrap ${
              changeIsPositive ? "text-green-400" : "text-red-400"
            }`}
          >
            {changeIsPositive ? (
              <ArrowUpRight size={12} />
            ) : (
              <ArrowDownRight size={12} />
            )}
            {marketData?.change24h || "0.00%"}
          </span>
          <span className="text-[10px] text-zinc-500 flex items-center whitespace-nowrap">
            24h Change
            <InfoTooltip
              title="24h Change"
              description="The percentage price change over the last 24 hours. Calculated by comparing current price with the price from 24 hours ago."
            />
          </span>
        </div>

        <div className="flex flex-col shrink-0">
          <span className="text-xs font-medium text-zinc-200 font-mono whitespace-nowrap">
            ${marketData?.indexPrice || "0.00"}
          </span>
          <span className="text-[10px] text-zinc-500 flex items-center whitespace-nowrap">
            Index Price
            <InfoTooltip
              title="Index Price (Oracle)"
              description="The reference price from external oracles tracking real H100 GPU rental rates. Currently fixed at $3.75/hour. Used to calculate funding rates and anchor the perpetual to spot market."
            />
          </span>
        </div>

        <div className="flex flex-col shrink-0">
          <span className="text-xs font-medium text-yellow-500 font-mono whitespace-nowrap">
            {marketData?.fundingRate || "0.0000%"}
          </span>
          <span className="text-[10px] text-zinc-500 flex items-center whitespace-nowrap">
            Funding Rate
            <InfoTooltip
              title="Funding Rate"
              description="The periodic payment between long and short positions every 8 hours. Positive rates mean longs (GPU buyers) pay shorts (GPU sellers); negative means shorts pay longs. This keeps the perpetual price anchored to real H100 rental market rates."
            />
          </span>
        </div>

        <div className="flex flex-col shrink-0">
          <span className="text-xs font-medium text-blue-400 font-mono whitespace-nowrap">
            {marketFee}
          </span>
          <span className="text-[10px] text-zinc-500 flex items-center whitespace-nowrap">
            Market Fee
            <InfoTooltip
              title="Trading Fee"
              description="Fee charged on each trade as a percentage of notional value. This fee is split between the insurance fund and protocol treasury to maintain system stability."
            />
          </span>
        </div>

        <div className="flex flex-col shrink-0">
          <span className="text-xs font-medium text-zinc-200 font-mono whitespace-nowrap">
            {marketData?.volume24h || "$24.5M"}
          </span>
          <span className="text-[10px] text-zinc-500 flex items-center whitespace-nowrap">
            24h Volume
            <InfoTooltip
              title="24h Volume"
              description="Total trading volume in USD over the last 24 hours. Higher volume indicates more active trading and better liquidity."
            />
          </span>
        </div>
      </div>
    </div>
  );
};

export default TickerBar;
