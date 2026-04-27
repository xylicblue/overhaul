import React, { useState, useEffect } from "react";
import ChartToggle from "./components/ChartToggle";
import { TradingPanel } from "./tradingpanel";
import PositionPanel from "./components/PositionPanel";
import TickerBar from "./components/TickerBar";
import { useMarket } from "./marketcontext";
import { LayoutDashboard, CandlestickChart, ArrowLeftRight, ChevronUp, ChevronDown, Activity } from "lucide-react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAllPositions } from "./hooks/useClearingHouse";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
// ConnectStrip — inline disabled-state notice (no modal)
// ─────────────────────────────────────────────────────────────────────────────
const ConnectStrip = () => (
  <div className="px-3 py-2 border-b border-zinc-800/80 bg-white/[0.015] flex items-center justify-between gap-2 shrink-0">
    <div className="flex flex-col min-w-0">
      <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-[0.14em]">Read only</span>
      <span className="text-[11px] text-zinc-300 leading-tight">Connect wallet to trade</span>
    </div>
    <ConnectButton.Custom>
      {({ openConnectModal, mounted }) => (
        <button
          onClick={openConnectModal}
          disabled={!mounted}
          className="shrink-0 px-3 py-1.5 rounded-md bg-white text-zinc-900 hover:bg-zinc-200 text-[11px] font-medium transition-colors duration-150"
        >
          Connect
        </button>
      )}
    </ConnectButton.Custom>
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
                className={`flex items-center gap-2 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors duration-150 border ${
                  drawerOpen
                    ? "bg-white/[0.06] border-white/[0.1] text-white"
                    : "bg-transparent border-white/[0.06] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] hover:border-white/[0.1]"
                }`}
              >
                <Activity size={11} strokeWidth={1.75} className="text-zinc-500" />
                Open positions
                {positionCount > 0 && (
                  <span className="bg-blue-500/15 text-blue-400 text-[9px] font-semibold tabular-nums px-1.5 py-px rounded">
                    {positionCount}
                  </span>
                )}
                {drawerOpen ? <ChevronDown size={11} strokeWidth={1.75} /> : <ChevronUp size={11} strokeWidth={1.75} />}
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

        {/* Right: Order Form (execution) — always rendered, embedded */}
        <div className="w-[340px] shrink-0 flex flex-col bg-[#06060a]">
          {/* Section header */}
          <div className="h-9 px-3 flex items-center justify-between border-b border-zinc-800/80 shrink-0">
            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-[0.16em]">Order</span>
            <div className="group relative flex items-center gap-1.5 cursor-default select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"></span>
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-yellow-400/80">Testnet · Sepolia</span>
              <div className="absolute top-full right-0 mt-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999]">
                <div className="bg-zinc-900/95 backdrop-blur-xl border border-white/[0.06] rounded-md p-3 w-60">
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    You're trading test tokens on <span className="text-yellow-400/90 font-medium">Sepolia</span>. No real funds are at risk.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Inline connect strip — replaces modal overlay */}
          {!isConnected && <ConnectStrip />}

          {/* Trading panel — always visible, faded when disconnected */}
          <div
            className={`flex-1 overflow-y-auto custom-scrollbar min-h-0 ${
              !isConnected ? "opacity-50 pointer-events-none select-none" : ""
            }`}
          >
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
            <div className="absolute inset-0 flex flex-col bg-[#06060a]">
              {!isConnected && <ConnectStrip />}
              <div
                className={`flex-1 overflow-y-auto custom-scrollbar min-h-0 ${
                  !isConnected ? "opacity-50 pointer-events-none select-none" : ""
                }`}
              >
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
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors duration-150 ${
                activeMobileTab === key ? "text-white" : "text-zinc-500 hover:text-zinc-300"
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
