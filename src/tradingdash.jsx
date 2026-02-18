import React, { useState, useEffect } from "react";
import ChartToggle from "./components/ChartToggle";
import { TradingPanel } from "./tradingpanel";
import PositionPanel from "./components/PositionPanel";
import TickerBar from "./components/TickerBar";
import { useMarket } from "./marketcontext";
import { LayoutDashboard, CandlestickChart, ArrowLeftRight, Wallet, ChevronUp, ChevronDown, Activity } from "lucide-react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAllPositions } from "./hooks/useClearingHouse";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
// ConnectWalletOverlay
// ─────────────────────────────────────────────────────────────────────────────
const ConnectWalletOverlay = () => (
  <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md p-6 text-center">
    <div className="relative bg-[#0c0c14] border border-zinc-800 p-6 rounded-2xl shadow-2xl max-w-[280px] w-full overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />
      <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
        <Wallet className="w-6 h-6 text-blue-400" />
      </div>
      <h3 className="text-sm font-bold text-white mb-1">Connect Wallet</h3>
      <p className="text-xs text-zinc-500 mb-5 leading-relaxed">
        Connect your wallet to place trades and manage positions.
      </p>
      <div className="flex justify-center">
        <ConnectButton />
      </div>
    </div>
  </div>
);



// ─────────────────────────────────────────────────────────────────────────────
// TradingDashboard
// ─────────────────────────────────────────────────────────────────────────────
export const TradingDashboard = () => {
  const { selectedMarket }  = useMarket();
  const [activeMobileTab, setActiveMobileTab] = useState("chart");
  const [drawerOpen, setDrawerOpen]           = useState(false);
  const [shouldBounce, setShouldBounce]       = useState(false);
  const { isConnected }     = useAccount();
  const { positions: allPositions } = useAllPositions();

  const positionCount = allPositions?.length || 0;

  // Bounce once on load when there are open positions
  useEffect(() => {
    if (positionCount > 0) {
      const t = setTimeout(() => setShouldBounce(true), 600);
      return () => clearTimeout(t);
    }
  }, [positionCount > 0]);

  return (
    <div className="flex flex-col h-[calc(100dvh-56px)] bg-[#06060a] text-zinc-200 overflow-hidden">
      {/* Ticker Bar */}
      <div className="shrink-0">
        <TickerBar />
      </div>

      {/* ── Desktop Layout ──────────────────────────────────────────────── */}
      <div className="hidden md:flex flex-1 overflow-hidden min-h-0">

        {/* Left: Chart + Positions Drawer */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-zinc-800/80 relative overflow-hidden">

          {/* Chart — always full height */}
          <div className="flex-1 min-h-0 relative overflow-hidden">
            <ChartToggle selectedMarket={selectedMarket} />
          </div>

          {/* Positions tab bar — always visible below chart */}
          <div className="shrink-0 h-10 border-t border-zinc-800/80 bg-[#06060a] flex items-center px-3 gap-3">
            <motion.div
              animate={shouldBounce ? { y: [0, -5, 2, -2, 0] } : {}}
              transition={{ duration: 0.5, ease: "easeOut" }}
              onAnimationComplete={() => setShouldBounce(false)}
            >
              <button
                onClick={() => setDrawerOpen(o => !o)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                  drawerOpen
                    ? "bg-zinc-800 border-zinc-700 text-white"
                    : positionCount > 0
                      ? "bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/15"
                      : "bg-transparent border-zinc-800/60 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
                }`}
              >
                <Activity size={11} className={positionCount > 0 ? "text-blue-400" : "text-zinc-600"} />
                Open Positions
                {positionCount > 0 && (
                  <span className="bg-blue-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
                    {positionCount}
                  </span>
                )}
                {drawerOpen ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
              </button>
            </motion.div>
            {/* Subtle hint when no positions */}
            {positionCount === 0 && (
              <span className="text-[10px] text-zinc-700">No open positions</span>
            )}
          </div>

          {/* Slide-up Positions Drawer */}
          <AnimatePresence>
            {drawerOpen && (
              <motion.div
                key="drawer"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 320, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="shrink-0 border-t border-zinc-800/80 bg-[#06060a] overflow-hidden"
              >
                <PositionPanel selectedMarket={selectedMarket} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Order Form */}
        <div className="w-[340px] shrink-0 flex flex-col bg-[#06060a] border-l border-zinc-800/80 relative">
          {/* Testnet Badge */}
          <div className="group relative flex items-center justify-center gap-1.5 px-3 py-1.5 border-b border-zinc-800/60 bg-yellow-500/[0.03] cursor-default select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"></span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-400/80">Testnet Mode</span>
            <span className="text-[10px] text-zinc-600">· Sepolia</span>
            {/* Hover tooltip */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999]">
              <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/80 rounded-xl shadow-2xl p-4 w-64">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
                  <span className="text-xs font-bold text-white uppercase tracking-wide">Testnet Mode</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  You are trading with test tokens on the <span className="text-yellow-400/90 font-medium">Sepolia</span> network. No real funds are at risk. Trades, balances, and positions are for practice only.
                </p>
              </div>
            </div>
          </div>
          {!isConnected && <ConnectWalletOverlay />}
          <div className={`flex-1 overflow-y-auto custom-scrollbar ${!isConnected ? "blur-[2px] pointer-events-none opacity-40" : ""}`}>
            <TradingPanel selectedMarket={selectedMarket} />
          </div>
        </div>
      </div>

      {/* ── Mobile Layout ───────────────────────────────────────────────── */}
      <div className="md:hidden flex-1 flex flex-col overflow-hidden relative">
        <div className="flex-1 overflow-hidden relative">
          {activeMobileTab === "chart" && (
            <div className="absolute inset-0">
              <ChartToggle selectedMarket={selectedMarket} />
            </div>
          )}
          {activeMobileTab === "trade" && (
            <div className="absolute inset-0 overflow-y-auto custom-scrollbar bg-[#06060a] relative">
              {!isConnected && <ConnectWalletOverlay />}
              <div className={!isConnected ? "blur-[2px] pointer-events-none opacity-40 h-full" : "h-full"}>
                <TradingPanel selectedMarket={selectedMarket} />
              </div>
            </div>
          )}
          {activeMobileTab === "positions" && (
            <div className="absolute inset-0 overflow-y-auto custom-scrollbar bg-[#06060a]">
              <PositionPanel selectedMarket={selectedMarket} />
            </div>
          )}
        </div>

        {/* Mobile Bottom Nav */}
        <div className="shrink-0 h-16 bg-[#06060a] border-t border-zinc-800/80 flex items-center justify-around px-2">
          {[
            { key: "chart",     icon: <CandlestickChart size={20} />, label: "Chart"     },
            { key: "trade",     icon: <ArrowLeftRight   size={20} />, label: "Trade"     },
            { key: "positions", icon: <LayoutDashboard  size={20} />, label: "Positions" },
          ].map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveMobileTab(key)}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                activeMobileTab === key ? "text-blue-400" : "text-zinc-600 hover:text-zinc-400"
              }`}
            >
              {icon}
              <span className="text-[10px] font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
