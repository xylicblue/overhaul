import React, { useState, useEffect, useMemo } from "react";
import ChartToggle from "./components/ChartToggle";
import { TradingPanel } from "./tradingpanel";
import PositionPanel from "./components/PositionPanel";
import TickerBar from "./components/TickerBar";
import Sparkline from "./components/Sparkline";
import { useMarket } from "./marketcontext";
import { useMarketsData } from "./marketData";
import { LayoutDashboard, CandlestickChart, ArrowLeftRight, ChevronUp, ChevronDown, Activity, Search } from "lucide-react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAllPositions } from "./hooks/useClearingHouse";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
// MarketsListColumn — left context rail
// ─────────────────────────────────────────────────────────────────────────────
const PIN_ORDER = ["H100-PERP", "B200-PERP"];

const MarketsListColumn = () => {
  const { selectedMarket, selectMarket } = useMarket();
  const { markets } = useMarketsData();
  const [query, setQuery] = useState("");

  const currentName =
    typeof selectedMarket === "string" ? selectedMarket : selectedMarket?.name;

  const sorted = useMemo(() => {
    const filtered = markets.filter((m) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        (m.displayName && m.displayName.toLowerCase().includes(q))
      );
    });
    return filtered.sort((a, b) => {
      const ai = PIN_ORDER.indexOf(a.name);
      const bi = PIN_ORDER.indexOf(b.name);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [markets, query]);

  return (
    <div className="w-[240px] shrink-0 flex flex-col bg-[#06060a] border-r border-zinc-800/80 min-h-0">
      {/* Section header */}
      <div className="h-9 px-3 flex items-center justify-between border-b border-zinc-800/80 shrink-0">
        <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-[0.16em]">Markets</span>
        <span className="text-[10px] font-mono text-zinc-600 tabular-nums">{markets.length}</span>
      </div>

      {/* Search */}
      <div className="px-2 py-2 border-b border-zinc-800/80 shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-600 w-3 h-3" strokeWidth={1.75} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-full bg-white/[0.02] border border-white/[0.05] rounded-md pl-7 pr-2 py-1.5 text-[11px] text-white placeholder-zinc-600 focus:outline-none focus:border-white/[0.12] transition-colors duration-150"
          />
        </div>
      </div>

      {/* Column header */}
      <div className="h-7 px-3 flex items-center justify-between border-b border-zinc-800/60 text-[9px] font-medium text-zinc-600 uppercase tracking-[0.14em] shrink-0">
        <span>Market</span>
        <span>Price · 24h</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
        {sorted.map((m) => {
          const isActive = m.name === currentName;
          const price = m.markPrice || m.oraclePrice || 0;
          const change = m.change24h || 0;
          const positive = change >= 0;
          const shortName =
            (m.displayName && m.displayName.replace(/\s*\(\$.*\)$/, "")) ||
            m.name.replace("-PERP", "");

          return (
            <button
              key={m.name}
              onClick={() => selectMarket(m.name)}
              className={`w-full flex items-center justify-between px-3 py-2 border-b border-zinc-800/40 text-left transition-colors duration-100 relative ${
                isActive ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500/80" />
              )}
              <div className="flex flex-col min-w-0 mr-2">
                <span
                  className={`text-[12px] font-medium truncate ${
                    isActive ? "text-white" : "text-zinc-300"
                  }`}
                >
                  {shortName}
                </span>
                <span className="text-[9px] text-zinc-600 font-mono mt-0.5 truncate">
                  {m.name.replace("-PERP", "")}
                </span>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className="text-[11px] font-mono tabular-nums text-zinc-200">
                  ${price.toFixed(2)}
                </span>
                <span
                  className={`text-[10px] font-mono tabular-nums ${
                    positive ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {positive ? "+" : ""}
                  {change.toFixed(2)}%
                </span>
              </div>
            </button>
          );
        })}
        {sorted.length === 0 && (
          <div className="px-3 py-8 text-center text-[11px] text-zinc-600">
            No markets match
          </div>
        )}
      </div>
    </div>
  );
};

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

      {/* ── Desktop Layout — 3 columns: markets · chart · order ─────────── */}
      <div className="hidden md:flex flex-1 overflow-hidden min-h-0">

        {/* Left: Markets list (context) */}
        <MarketsListColumn />

        {/* Center: Chart + Positions Drawer (analysis) */}
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
