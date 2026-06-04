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
import { supabase } from "./creatclient";
import { useAuthModalStore } from "./stores/useAuthModalStore";

// ─────────────────────────────────────────────────────────────────────────────
// OrderPanelGate — handles all three states of the right-side order panel
// ─────────────────────────────────────────────────────────────────────────────
const OrderPanelGate = ({ session, sessionLoading, isConnected, selectedMarket }) => {
  const { openLogin } = useAuthModalStore();

  // Not signed in → blurred panel preview + sign-in overlay
  if (!sessionLoading && !session) {
    return (
      <div className="flex-1 relative flex flex-col overflow-hidden min-h-0">
        {/* Blurred trading panel shown underneath */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ filter: "blur(7px)", opacity: 0.22, transform: "scale(1.04)" }}
          aria-hidden="true"
        >
          <TradingPanel selectedMarket={selectedMarket} />
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center bg-surface-1/65 backdrop-blur-[2px]">
          <div className="w-10 h-10 rounded-full bg-surface-3 border border-line flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="text-ink-faint">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-white mb-1">Sign in to trade</p>
            <p className="text-[11px] text-zinc-500 leading-relaxed max-w-[190px]">
              You need to be signed in to access the trading panel.
            </p>
          </div>
          <button
            onClick={openLogin}
            className="px-4 py-2 rounded-md bg-white text-zinc-900 hover:bg-zinc-200 text-[12px] font-semibold transition-colors duration-150"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // Signed in but wallet not connected → connect strip + dimmed panel
  if (!isConnected) {
    return (
      <>
        <div className="px-3 py-2 border-b border-line bg-surface-2/40 flex items-center justify-between gap-2 shrink-0">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-medium text-ink-faint uppercase tracking-[0.14em]">Read only</span>
            <span className="text-[11px] text-ink-muted leading-tight">Connect wallet to trade</span>
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
        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 opacity-50 pointer-events-none select-none">
          <TradingPanel selectedMarket={selectedMarket} />
        </div>
      </>
    );
  }

  // Fully authenticated and wallet connected
  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
      <TradingPanel selectedMarket={selectedMarket} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TradingDashboard
// ─────────────────────────────────────────────────────────────────────────────
export const TradingDashboard = ({ onHelpClick }) => {
  const { selectedMarket } = useMarket();
  const [activeMobileTab, setActiveMobileTab] = useState("chart");
  const [drawerOpen, setDrawerOpen]           = useState(false);
  const [shouldBounce, setShouldBounce]       = useState(false);
  const { isConnected }    = useAccount();
  const { positions: allPositions } = useAllPositions();
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSessionLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // ── Resizable panel state (desktop only) ──────────────────────────────────
  const [orderPanelWidth, setOrderPanelWidth] = useState(340);
  const [positionsHeight, setPositionsHeight] = useState(420);
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
    <div className="flex flex-col h-[calc(100dvh-56px)] bg-surface-0 text-ink-muted overflow-hidden">
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

          {/* Positions tab bar */}
          <div className="shrink-0 h-10 border-t border-line bg-surface-1 flex items-center px-3 gap-3">
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
                {drawerOpen
                  ? <ChevronDown size={11} strokeWidth={1.75} />
                  : <ChevronUp   size={11} strokeWidth={1.75} />}
              </button>
            </motion.div>
            {positionCount === 0 && (
              <span className="text-[10px] text-zinc-700">No open positions</span>
            )}
            <button
              onClick={onHelpClick}
              className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded border border-white/[0.06] text-zinc-500 hover:text-zinc-300 hover:border-white/[0.1] text-[10px] font-medium transition-colors duration-150"
            >
              <span className="inline-flex items-center justify-center w-3 h-3 rounded border border-white/[0.1] font-mono text-[8px]">?</span>
              Help
            </button>
          </div>

          {/* Positions Drawer — resizable */}
          <div
            className="shrink-0 bg-surface-1 overflow-hidden flex flex-col"
            style={{
              height: drawerOpen ? positionsHeight : 0,
              transition: isResizingPos ? "none" : "height 0.25s cubic-bezier(0.4,0,0.2,1)",
              borderTop: drawerOpen ? "1px solid rgba(255,255,255,0.06)" : "none",
            }}
          >
            {/* ↕ Drag handle — drag up to expand, down to shrink */}
            <div
              onMouseDown={startPositionsResize}
              className="shrink-0 h-[18px] w-full cursor-row-resize flex items-center justify-center bg-surface-2 hover:bg-blue-500/10 border-b border-line hover:border-blue-500/25 transition-colors duration-150 select-none group"
              title="Drag to resize"
            >
              <GripHorizontal
                size={14}
                strokeWidth={1.75}
                className="text-zinc-600 group-hover:text-blue-400 transition-colors duration-150"
              />
            </div>
            <div className="flex-1 overflow-hidden">
              <PositionPanel />
            </div>
          </div>
        </div>

        {/* ↔ Drag handle between chart area and order panel */}
        <div
          onMouseDown={startOrderResize}
          className="w-[18px] shrink-0 cursor-col-resize flex items-center justify-center bg-surface-2 hover:bg-blue-500/10 border-x border-line hover:border-blue-500/25 transition-colors duration-150 select-none group relative z-10"
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
          className="shrink-0 flex flex-col bg-surface-1 border-l border-line shadow-[-10px_0_28px_-16px_rgba(0,0,0,0.8)]"
          style={{ width: orderPanelWidth }}
        >
          {/* Header */}
          <div className="h-10 px-3 flex items-center justify-between border-b border-line shrink-0">
            <span className="text-[10px] font-medium text-ink-faint uppercase tracking-[0.16em]">Order</span>
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

          <OrderPanelGate
            session={session}
            sessionLoading={sessionLoading}
            isConnected={isConnected}
            selectedMarket={selectedMarket}
          />
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
            <div className="absolute inset-0 flex flex-col bg-surface-1">
              <OrderPanelGate
                session={session}
                sessionLoading={sessionLoading}
                isConnected={isConnected}
                selectedMarket={selectedMarket}
              />
            </div>
          )}
          {activeMobileTab === "positions" && (
            <div className="absolute inset-0 overflow-y-auto custom-scrollbar bg-surface-1">
              <PositionPanel />
            </div>
          )}
        </div>

        {/* Mobile Bottom Nav */}
        <div className="shrink-0 h-16 bg-surface-1 border-t border-line flex items-center justify-around px-2">
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
