import React, { useState, useEffect, useRef } from "react";
import ChartToggle from "./components/ChartToggle";
import { TradingPanel } from "./tradingpanel";
import PositionPanel from "./components/PositionPanel";
import TickerBar from "./components/TickerBar";
import { useMarket } from "./marketcontext";
import {
  LayoutDashboard, CandlestickChart, ArrowLeftRight,
  ChevronUp, ChevronDown, Activity,
  GripVertical, GripHorizontal,
} from "lucide-react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAllPositions } from "./hooks/useClearingHouse";
import { motion } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
// ConnectStrip
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
export const TradingDashboard = ({ onHelpClick }) => {
  const { selectedMarket } = useMarket();
  const [activeMobileTab, setActiveMobileTab] = useState("chart");
  const [activeBottomTab, setActiveBottomTab] = useState("positions");
  const [shouldBounce, setShouldBounce]       = useState(false);
  const { isConnected }    = useAccount();
  const { positions: allPositions } = useAllPositions();

  // ── Resizable panel state (desktop only) ──────────────────────────────────
  const [orderPanelWidth, setOrderPanelWidth] = useState(340);
  const [positionsHeight, setPositionsHeight] = useState(300);
  const [isResizingPos,   setIsResizingPos]   = useState(false);
  const [isResizingOrder, setIsResizingOrder] = useState(false);

  const isResizingOrderRef = useRef(false);
  const isResizingPosRef   = useRef(false);
  const startXRef          = useRef(0);
  const startWidthRef      = useRef(0);
  const startYRef          = useRef(0);
  const startHeightRef     = useRef(0);

  const positionCount = allPositions?.length || 0;

  useEffect(() => {
    if (positionCount > 0) {
      const t = setTimeout(() => setShouldBounce(true), 600);
      return () => clearTimeout(t);
    }
  }, [positionCount > 0]);

  // ── Global drag listeners ──────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e) => {
      if (isResizingOrderRef.current) {
        // drag left → increase order panel width
        const delta = startXRef.current - e.clientX;
        setOrderPanelWidth(Math.max(240, Math.min(560, startWidthRef.current + delta)));
      }
      if (isResizingPosRef.current) {
        // drag up → increase positions height
        const delta = startYRef.current - e.clientY;
        setPositionsHeight(Math.max(100, Math.min(520, startHeightRef.current + delta)));
      }
    };
    const onUp = () => {
      if (isResizingPosRef.current)   setIsResizingPos(false);
      if (isResizingOrderRef.current) setIsResizingOrder(false);
      isResizingOrderRef.current = false;
      isResizingPosRef.current   = false;
      document.body.style.cursor     = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    };
  }, []);

  const startOrderResize = (e) => {
    e.preventDefault();
    isResizingOrderRef.current = true;
    setIsResizingOrder(true);
    startXRef.current          = e.clientX;
    startWidthRef.current      = orderPanelWidth;
    document.body.style.cursor     = "col-resize";
    document.body.style.userSelect = "none";
  };

  const startPositionsResize = (e) => {
    e.preventDefault();
    isResizingPosRef.current = true;
    setIsResizingPos(true);
    startYRef.current       = e.clientY;
    startHeightRef.current  = positionsHeight;
    document.body.style.cursor     = "row-resize";
    document.body.style.userSelect = "none";
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-56px)] bg-[#06060a] text-zinc-200 overflow-hidden">
      {/* Drag overlay — covers TradingView iframe so it can't steal mousemove events */}
      {(isResizingOrder || isResizingPos) && (
        <div
          className="fixed inset-0 z-[9999]"
          style={{ cursor: isResizingOrder ? "col-resize" : "row-resize" }}
        />
      )}

      {/* Ticker Bar */}
      <div className="shrink-0">
        <TickerBar />
      </div>

      {/* ── Desktop Layout ──────────────────────────────────────────────── */}
      <div className="hidden md:flex flex-1 overflow-hidden min-h-0">

        {/* Left: Chart + Positions */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Chart */}
          <div className="flex-1 min-h-0 relative overflow-hidden">
            <ChartToggle selectedMarket={selectedMarket} />
          </div>

          {/* ── Bottom tab bar — Hyperliquid/Lighter style ───────────────── */}
          {(() => {
            const TABS = [
              { key: "positions",     label: "Positions",     count: positionCount },
              { key: "open-orders",   label: "Open Orders",   count: 0 },
              { key: "order-history", label: "Order History" },
              { key: "trade-history", label: "Trade History" },
              { key: "funding",       label: "Funding" },
              { key: "balances",      label: "Balances" },
            ];
            return (
              <div className="shrink-0 h-10 border-t border-zinc-800/80 bg-[#06060a] flex items-stretch overflow-x-auto">
                <div className="flex items-stretch min-w-max">
                  {TABS.map(tab => {
                    const active = activeBottomTab === tab.key;
                    return (
                      <motion.button
                        key={tab.key}
                        animate={tab.key === "positions" && shouldBounce ? { y: [0, -4, 1, -1, 0] } : {}}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                        onAnimationComplete={() => tab.key === "positions" && setShouldBounce(false)}
                        onClick={() => setActiveBottomTab(tab.key)}
                        className={`relative flex items-center gap-1.5 px-3.5 text-[11px] font-medium transition-colors duration-150 border-b-2 whitespace-nowrap ${
                          active
                            ? "text-white border-blue-400"
                            : "text-zinc-500 border-transparent hover:text-zinc-300 hover:border-zinc-700"
                        }`}
                      >
                        {tab.label}
                        {tab.count > 0 && (
                          <span className="bg-blue-500/15 text-blue-400 text-[9px] font-bold tabular-nums px-1.5 py-px rounded-full">
                            {tab.count}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
                <div className="ml-auto flex items-center gap-3 px-3 shrink-0 border-b-2 border-transparent">
                  <button
                    onClick={onHelpClick}
                    className="flex items-center gap-1 text-zinc-600 hover:text-zinc-400 text-[10px] font-medium transition-colors"
                  >
                    <span className="inline-flex items-center justify-center w-3 h-3 rounded border border-white/[0.1] font-mono text-[8px]">?</span>
                    Help
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Positions panel — always visible, height adjustable by dragging */}
          <div
            className="shrink-0 bg-[#06060a] overflow-hidden flex flex-col border-t border-zinc-800/60"
            style={{ height: positionsHeight }}
          >
            {/* ↕ Drag handle to resize height */}
            <div
              onMouseDown={startPositionsResize}
              className="shrink-0 h-[6px] w-full cursor-row-resize bg-zinc-900/60 hover:bg-blue-500/20 transition-colors duration-150 select-none"
              title="Drag to resize"
            />
            <div className="flex-1 overflow-hidden">
              {activeBottomTab === "positions" && <PositionPanel selectedMarket={selectedMarket} />}
              {activeBottomTab === "open-orders" && (
                <div className="flex items-center justify-center h-full text-zinc-700 text-[11px]">No open orders</div>
              )}
              {activeBottomTab === "order-history" && (
                <div className="flex items-center justify-center h-full text-zinc-700 text-[11px]">No order history</div>
              )}
              {activeBottomTab === "trade-history" && (
                <div className="flex items-center justify-center h-full gap-2 text-zinc-700 text-[11px]">
                  Full trade history is on the
                  <a href="/portfolio" className="text-blue-400 hover:text-blue-300 underline">Portfolio page</a>
                </div>
              )}
              {activeBottomTab === "funding" && (
                <div className="flex items-center justify-center h-full text-zinc-700 text-[11px]">No funding history</div>
              )}
              {activeBottomTab === "balances" && (
                <div className="flex items-center justify-center h-full text-zinc-700 text-[11px]">
                  Collateral balances — see{" "}
                  <a href="/portfolio" className="text-blue-400 hover:text-blue-300 underline ml-1">Portfolio</a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ↔ Drag handle between chart area and order panel */}
        <div
          onMouseDown={startOrderResize}
          className="w-[18px] shrink-0 cursor-col-resize flex items-center justify-center bg-zinc-900/60 hover:bg-blue-500/10 border-x border-zinc-800/60 hover:border-blue-500/25 transition-colors duration-150 select-none group relative z-10"
          title="Drag to resize"
        >
          <GripVertical
            size={14}
            strokeWidth={1.75}
            className="text-zinc-600 group-hover:text-blue-400 transition-colors duration-150"
          />
        </div>

        {/* Right: Order Form */}
        <div
          className="shrink-0 flex flex-col bg-[#06060a]"
          style={{ width: orderPanelWidth }}
        >
          {/* Header */}
          <div className="h-9 px-3 flex items-center justify-between border-b border-zinc-800/80 shrink-0">
            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-[0.16em]">Order</span>
            <div className="group/tip relative flex items-center gap-1.5 cursor-default select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-yellow-400/80">Testnet · Sepolia</span>
              <div className="absolute top-full right-0 mt-1.5 opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible transition-all duration-200 z-[9999]">
                <div className="bg-zinc-900/95 backdrop-blur-xl border border-white/[0.06] rounded-md p-3 w-60">
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    You're trading test tokens on{" "}
                    <span className="text-yellow-400/90 font-medium">Sepolia</span>.
                    No real funds are at risk.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {!isConnected && <ConnectStrip />}

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
              <PositionPanel />
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
