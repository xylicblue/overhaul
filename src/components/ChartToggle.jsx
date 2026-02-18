import React, { useState, useMemo } from "react";
import TradingViewChart from "./TradingViewChart";
import { Maximize2, X, BarChart2, Activity } from "lucide-react";

const ChartToggle = ({ selectedMarket }) => {
  const [activeChart, setActiveChart] = useState("index");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const marketName = useMemo(() => {
    return typeof selectedMarket === "string"
      ? selectedMarket
      : selectedMarket?.name || "H100-PERP";
  }, [selectedMarket]);

  const priceType = useMemo(() => {
    return activeChart === "vamm" ? "mark" : "index";
  }, [activeChart]);

  const ChartHeader = ({ showCloseButton = false }) => (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/80 bg-[#06060a]">
      {/* Chart type tabs */}
      <div className="flex items-center bg-zinc-900/60 border border-zinc-800/60 rounded-lg p-0.5 gap-0.5">
        {[
          { key: "index", label: "Index Price", icon: <BarChart2 size={11} /> },
          { key: "vamm",  label: "Mark Price",  icon: <Activity  size={11} /> },
        ].map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveChart(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${
              activeChart === key
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span className={activeChart === key ? "text-blue-400" : "text-zinc-600"}>{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-zinc-600 hidden sm:block">
          {marketName.replace("-PERP", "")} · PERP
        </span>
        {!showCloseButton ? (
          <button
            onClick={() => setIsFullscreen(true)}
            className="p-1.5 text-zinc-600 hover:text-white hover:bg-zinc-800 rounded-lg transition-all"
            title="Expand chart"
          >
            <Maximize2 size={14} />
          </button>
        ) : (
          <button
            onClick={() => setIsFullscreen(false)}
            className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all"
            title="Close"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Regular Chart View */}
      <div className="h-full flex flex-col overflow-hidden bg-[#06060a]">
        <ChartHeader />
        <div className="flex-1 relative min-h-0 overflow-hidden" style={{ height: "calc(100% - 48px)" }}>
          <TradingViewChart market={marketName} priceType={priceType} />
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-8">
          <div
            className="w-full h-full max-w-7xl max-h-[90vh] bg-[#06060a] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#06060a]">
              <div>
                <h2 className="text-base font-bold text-white">{marketName.replace("-PERP", "")} Chart</h2>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {activeChart === "vamm" ? "Mark Price" : "Index Price"} · Detailed View
                </p>
              </div>
              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>
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
