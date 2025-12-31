import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const TICKER_ITEMS = [
  { symbol: "H100 PCIe", price: "$2.45", change: "+5.2%", trend: "up" },
  { symbol: "A100 80GB", price: "$1.85", change: "-1.2%", trend: "down" },
  { symbol: "RTX 4090", price: "$0.75", change: "+0.5%", trend: "up" },
  { symbol: "L40S", price: "$1.10", change: "+2.8%", trend: "up" },
  { symbol: "H200 SXM", price: "$4.20", change: "+12.5%", trend: "up" },
  { symbol: "MI300X", price: "$3.15", change: "+8.4%", trend: "up" },
  { symbol: "A6000", price: "$0.65", change: "-0.8%", trend: "down" },
  { symbol: "V100", price: "$0.45", change: "-2.1%", trend: "down" },
];

const ComputeTicker = () => {
  return (
    <div className="w-full bg-[#050505]/80 backdrop-blur-md border-y border-white/5 overflow-hidden py-3 relative z-20">
      <div className="flex relative">
        <motion.div
          className="flex gap-12 whitespace-nowrap"
          animate={{ x: "-50%" }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map(
            (item, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="font-mono font-bold text-slate-300 text-sm">
                  {item.symbol}
                </span>
                <span className="font-mono text-white text-sm">
                  {item.price}
                </span>
                <div
                  className={`flex items-center gap-1 text-xs font-medium ${
                    item.trend === "up"
                      ? "text-emerald-400"
                      : item.trend === "down"
                      ? "text-red-400"
                      : "text-slate-400"
                  }`}
                >
                  {item.trend === "up" ? (
                    <TrendingUp size={12} />
                  ) : item.trend === "down" ? (
                    <TrendingDown size={12} />
                  ) : (
                    <Minus size={12} />
                  )}
                  {item.change}
                </div>
              </div>
            )
          )}
        </motion.div>
      </div>
      {/* Gradient masks for smooth fade */}
      <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#050505] to-transparent pointer-events-none"></div>
      <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[#050505] to-transparent pointer-events-none"></div>
    </div>
  );
};

export default ComputeTicker;
