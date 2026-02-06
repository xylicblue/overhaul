import React, { useState, useMemo } from "react";
import TradingViewChart from "./TradingViewChart";
import { Maximize2, X } from "lucide-react";

const ChartToggle = ({ selectedMarket }) => {
  const [activeChart, setActiveChart] = useState("index"); // 'vamm' or 'index' - default to index
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Memoize market name to prevent unnecessary re-renders
  const marketName = useMemo(() => {
    return typeof selectedMarket === "string"
      ? selectedMarket
      : selectedMarket?.name || "H100-PERP";
  }, [selectedMarket]);

  // Memoize price type to prevent unnecessary re-renders
  const priceType = useMemo(() => {
    return activeChart === "vamm" ? "mark" : "index";
  }, [activeChart]);

  // Chart header component (shared between normal and fullscreen)
  const ChartHeader = ({ showCloseButton = false }) => (
    <div className="flex items-center justify-between gap-2 p-2 border-b border-zinc-800 bg-[#0A0A0A]/50">
      <div className="flex bg-[#050505] rounded-lg p-1">
        <button
          className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
            activeChart === "vamm"
              ? "bg-zinc-800 text-white shadow-sm"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
          onClick={() => setActiveChart("vamm")}
        >
          Mark Price
        </button>
        <button
          className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
            activeChart === "index"
              ? "bg-zinc-800 text-white shadow-sm"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
          onClick={() => setActiveChart("index")}
        >
          Index Price
        </button>
      </div>
      
      {/* Fullscreen Toggle */}
      {!showCloseButton ? (
        <button
          onClick={() => setIsFullscreen(true)}
          className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all"
          title="Expand chart"
        >
          <Maximize2 size={16} />
        </button>
      ) : (
        <button
          onClick={() => setIsFullscreen(false)}
          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-all"
          title="Close"
        >
          <X size={20} />
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Regular Chart View */}
      <div className="h-full flex flex-col overflow-hidden">
        <ChartHeader />
        <div className="flex-1 relative min-h-0 overflow-hidden" style={{ height: 'calc(100% - 48px)' }}>
          <TradingViewChart market={marketName} priceType={priceType} />
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-8">
          <div 
            className="w-full h-full max-w-7xl max-h-[90vh] bg-[#0A0A0A] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#050505]">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {marketName.replace("-PERP", "")} Chart
                </h2>
                <p className="text-xs text-zinc-500">
                  {activeChart === "vamm" ? "Mark Price" : "Index Price"} • Detailed View
                </p>
              </div>
              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Modal Chart Content */}
            <div className="flex-1 min-h-0 flex flex-col">
              <ChartHeader showCloseButton />
              <div className="flex-1 relative min-h-0 overflow-hidden">
                <TradingViewChart market={marketName} priceType={priceType} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChartToggle;

