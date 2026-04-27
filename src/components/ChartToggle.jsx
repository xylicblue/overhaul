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
    <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/80 bg-[#06060a]">
      {/* Chart type tabs */}
      <div className="flex items-center bg-white/[0.02] border border-white/[0.05] rounded-md p-0.5">
        {[
          { key: "index", label: "Index" },
          { key: "vamm",  label: "Mark"  },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveChart(key)}
            className={`px-3 py-1 rounded text-[11px] font-medium transition-colors duration-150 ${
              activeChart === key
                ? "bg-white/[0.06] text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-zinc-500 tracking-wide hidden sm:block">
          {marketName.replace("-PERP", "")} · PERP
        </span>
        {!showCloseButton ? (
          <button
            onClick={() => setIsFullscreen(true)}
            className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] rounded-md transition-colors duration-150"
            title="Expand chart"
          >
            <Maximize2 size={13} strokeWidth={1.75} />
          </button>
        ) : (
          <button
            onClick={() => setIsFullscreen(false)}
            className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] rounded-md transition-colors duration-150"
            title="Close"
          >
            <X size={15} strokeWidth={1.75} />
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
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 md:p-8">
          <div
            className="w-full h-full max-w-7xl max-h-[90vh] bg-[#06060a] border border-white/[0.06] rounded-lg overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/80 bg-[#06060a]">
              <div>
                <h2 className="text-sm font-semibold text-white tracking-tight">{marketName.replace("-PERP", "")} Chart</h2>
                <p className="text-[10px] text-zinc-500 mt-0.5 tracking-wide">
                  {activeChart === "vamm" ? "Mark Price" : "Index Price"} · Detailed view
                </p>
              </div>
              <button
                onClick={() => setIsFullscreen(false)}
                className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] rounded-md transition-colors duration-150"
              >
                <X size={18} strokeWidth={1.75} />
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
