import React, { useState } from "react";
import PriceIndexChart from "../chart";
import VAMMChart from "./VAMMChart";

const ChartToggle = ({ selectedMarket }) => {
  const [activeChart, setActiveChart] = useState("index"); // 'index' or 'vamm'

  // Get market name for vAMM chart - map frontend names to database names
  const frontendMarket =
    typeof selectedMarket === "string"
      ? selectedMarket
      : selectedMarket?.name || "H100-PERP";

  // Map frontend market names to database market names
  const marketNameMap = {
    "H100-PERP": "H100-GPU-PERP",
    "ETH-PERP-V2": "H100-GPU-PERP", // Same vAMM
  };
  const marketName = marketNameMap[frontendMarket] || "H100-GPU-PERP";

  return (
    <div className="flex flex-col h-full">
      {/* Toggle Buttons */}
      <div className="flex items-center gap-2 p-2 border-b border-slate-800 bg-slate-900/50">
        <div className="flex bg-slate-950 rounded-lg p-1">
          <button
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeChart === "index"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-300"
            }`}
            onClick={() => setActiveChart("index")}
          >
            Index Price
          </button>
          <button
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeChart === "vamm"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-300"
            }`}
            onClick={() => setActiveChart("vamm")}
          >
            vAMM Price
          </button>
        </div>
      </div>

      {/* Chart Display */}
      <div className="flex-1 relative min-h-0">
        {activeChart === "index" ? (
          <PriceIndexChart />
        ) : (
          <VAMMChart market={marketName} />
        )}
      </div>
    </div>
  );
};

export default ChartToggle;
