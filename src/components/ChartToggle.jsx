import React, { useState } from "react";
import PriceIndexChart from "../chart";
import AdvancedChart from "./AdvancedChart";

const ChartToggle = ({ selectedMarket }) => {
  const [activeChart, setActiveChart] = useState("vamm"); // 'vamm' or 'index'

  // Get market name - use directly as stored in database
  const marketName =
    typeof selectedMarket === "string"
      ? selectedMarket
      : selectedMarket?.name || "H100-PERP";

  return (
    <div className="flex flex-col h-full">
      {/* Toggle Buttons */}
      <div className="flex items-center gap-2 p-2 border-b border-zinc-800 bg-[#0A0A0A]/50">
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
      </div>

      {/* Chart Display */}
      <div className="flex-1 relative min-h-0">
        {activeChart === "vamm" ? (
          <AdvancedChart market={marketName} />
        ) : (
          <PriceIndexChart market={marketName} />
        )}
      </div>
    </div>
  );
};

export default ChartToggle;
