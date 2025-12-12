import React, { useState } from "react";
import ChartToggle from "./components/ChartToggle";
import { TradingPanel } from "./tradingpanel";
import PositionPanel from "./components/PositionPanel";
import TickerBar from "./components/TickerBar";
import { useMarket } from "./marketcontext";
import { LayoutDashboard, CandlestickChart, ArrowLeftRight } from "lucide-react";

export const TradingDashboard = () => {
  const { selectedMarket } = useMarket();
  const [activeMobileTab, setActiveMobileTab] = useState("chart"); // 'chart', 'trade', 'positions'

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-[#050505] text-zinc-200 overflow-hidden">
      {/* Top Bar: Ticker Stats & Market Selector */}
      <div className="shrink-0">
        <TickerBar />
      </div>

      {/* --- Desktop Layout (Hidden on Mobile) --- */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {/* Left Side: Chart & Positions */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-zinc-800">
          {/* Chart Section (Flex Grow) */}
          <div className="flex-[3] min-h-0 border-b border-zinc-800 relative">
             <ChartToggle selectedMarket={selectedMarket} />
          </div>
          
          {/* Positions Section (Flex 1) */}
          <div className="flex-1 min-h-[250px] bg-[#0A0A0A]/30">
            <PositionPanel />
          </div>
        </div>

        {/* Right Side: Order Form (Fixed Width) */}
        <div className="w-[320px] shrink-0 flex flex-col bg-[#0A0A0A]/50 backdrop-blur-sm border-l border-zinc-800">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <TradingPanel selectedMarket={selectedMarket} />
          </div>
        </div>
      </div>

      {/* --- Mobile Layout (Visible only on Mobile) --- */}
      <div className="md:hidden flex-1 flex flex-col overflow-hidden relative">
        {/* Mobile Content Area */}
        <div className="flex-1 overflow-hidden relative">
          {activeMobileTab === "chart" && (
            <div className="absolute inset-0">
              <ChartToggle selectedMarket={selectedMarket} />
            </div>
          )}
          {activeMobileTab === "trade" && (
            <div className="absolute inset-0 overflow-y-auto custom-scrollbar bg-[#050505]">
              <TradingPanel selectedMarket={selectedMarket} />
            </div>
          )}
          {activeMobileTab === "positions" && (
            <div className="absolute inset-0 overflow-y-auto custom-scrollbar bg-[#0A0A0A]/30">
              <PositionPanel />
            </div>
          )}
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="shrink-0 h-16 bg-[#050505] border-t border-zinc-800 flex items-center justify-around px-2 pb-safe">
          <button
            onClick={() => setActiveMobileTab("chart")}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
              activeMobileTab === "chart" ? "text-blue-400" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <CandlestickChart size={20} />
            <span className="text-[10px] font-medium">Chart</span>
          </button>
          
          <button
            onClick={() => setActiveMobileTab("trade")}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
              activeMobileTab === "trade" ? "text-blue-400" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <ArrowLeftRight size={20} />
            <span className="text-[10px] font-medium">Trade</span>
          </button>

          <button
            onClick={() => setActiveMobileTab("positions")}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
              activeMobileTab === "positions" ? "text-blue-400" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <LayoutDashboard size={20} />
            <span className="text-[10px] font-medium">Positions</span>
          </button>
        </div>
      </div>
    </div>
  );
};
