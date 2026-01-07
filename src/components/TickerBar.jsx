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
        className="inline-flex text-zinc-400 hover:text-white cursor-help transition-colors ml-1.5"
        ref={wrapperRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Info size={14} />
      </div>
      {isHovered &&
        ReactDOM.createPortal(
          <div
            className="fixed z-[100] w-56 p-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg shadow-xl text-xs text-zinc-300 pointer-events-none"
            style={{ top: `${position.top}px`, left: `${position.left}px` }}
          >
            <div className="font-semibold text-white mb-1">{title}</div>
            <div className="leading-relaxed">
              {typeof description === 'string' ? description : description}
            </div>
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
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const portalRef = useRef(null);

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
      // Check if click is outside both the button area and the portal dropdown
      const isOutsideButton = dropdownRef.current && !dropdownRef.current.contains(event.target);
      const isOutsidePortal = portalRef.current && !portalRef.current.contains(event.target);
      
      if (isOutsideButton && isOutsidePortal) {
        setIsDropdownOpen(false);
      }
    };
    
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDropdownOpen]);

  const filteredMarkets = markets.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.displayName &&
        m.displayName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const changeIsPositive = marketData?.change24hValue >= 0;

  return (
    <div className="h-12 bg-[#050505] border-b border-zinc-800 flex items-center px-4 gap-4 md:gap-6 shrink-0 overflow-x-auto no-scrollbar">
      {/* Change Market Button */}
      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          ref={buttonRef}
          className="group flex items-center gap-2 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/30 hover:to-indigo-600/30 px-3 py-1.5 rounded-full transition-all duration-200 border border-blue-500/30 hover:border-blue-400/50 shadow-sm hover:shadow-[0_0_12px_rgba(59,130,246,0.3)]"
          onClick={() => {
            if (!isDropdownOpen && buttonRef.current) {
              const rect = buttonRef.current.getBoundingClientRect();
              setDropdownPosition({ top: rect.bottom + 8, left: rect.left });
            }
            setIsDropdownOpen(!isDropdownOpen);
          }}
        >
          <span className="text-xs font-semibold text-blue-400 group-hover:text-blue-300">Switch</span>
          <ChevronDown size={12} className={`text-blue-400 group-hover:text-blue-300 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu - Rendered via Portal */}
        {isDropdownOpen &&
          ReactDOM.createPortal(
            <div
              className="fixed w-64 bg-[#0A0A0A] border border-zinc-800 rounded-lg shadow-xl z-[9999] overflow-hidden"
              style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
              ref={portalRef}
            >
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
                            ? "text-emerald-400"
                            : "text-red-400"
                        }
                      >
                        ${market.markPrice?.toFixed(2) || market.oraclePrice?.toFixed(2) || '0.00'}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>,
            document.body
          )}
      </div>

      {/* Market Name (Static) */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="font-bold text-base md:text-lg text-white whitespace-nowrap">
          {marketData?.displayName || marketName}
        </span>
        <div onClick={(e) => e.stopPropagation()}>
          <InfoTooltip
            title={marketData?.displayName || marketName}
            description={
              {
                "H100-PERP": "Combined market tracking H100 GPU prices from all providers.",
                "H100-non-HyperScalers-PERP": "H100 prices from Neocloud providers - specialized GPU cloud providers like Lambda, CoreWeave, Vultr, etc.",
                "B200-PERP": "Next-generation NVIDIA Blackwell B200 GPU prices from specialized providers.",
                "H200-PERP": "NVIDIA H200 GPU hourly rental rates - the latest Hopper generation with improved HBM3e memory.",
              }[marketName] || "GPU Compute Market"
            }
          />
        </div>
        <span className="text-[10px] text-zinc-500 bg-zinc-900 px-1 rounded border border-zinc-800 hidden sm:inline-block">
          PERP
        </span>
      </div>

      {/* Ticker Stats */}
      <div className="flex items-center gap-4 md:gap-6 overflow-x-auto no-scrollbar">
        <div className="flex flex-col shrink-0">
          <span
            className={`text-base md:text-lg font-mono font-bold whitespace-nowrap ${
              changeIsPositive ? "text-emerald-400" : "text-red-400"
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
            className={`text-xs font-medium font-mono flex items-center gap-1 whitespace-nowrap ${
              changeIsPositive ? "text-emerald-400" : "text-red-400"
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
