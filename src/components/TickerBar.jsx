import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import ReactDOM from "react-dom";
import { useMarket } from "../marketcontext";
import { useMarketRealTimeData, useMarketsData } from "../marketData";
import { useReadContract } from "wagmi";
import { SEPOLIA_CONTRACTS, MARKET_IDS } from "../contracts/addresses";
import MarketRegistryABI from "../contracts/abis/MarketRegistry.json";
import { supabase } from "../creatclient";
import {
  ChevronDown,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  X,
  Star,
  Check,
  Zap,
  Cpu,
  Cloud,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Derive a short provider label and colour from a market name */
function getProviderMeta(name) {
  if (name.startsWith("AWS"))        return { label: "AWS",        color: "text-orange-400 bg-orange-500/10 border-orange-500/20" };
  if (name.startsWith("GCP"))        return { label: "GCP",        color: "text-blue-400   bg-blue-500/10   border-blue-500/20"   };
  if (name.startsWith("AZURE"))      return { label: "Azure",      color: "text-sky-400    bg-sky-500/10    border-sky-500/20"     };
  if (name.startsWith("COREWEAVE"))  return { label: "CW",         color: "text-purple-400 bg-purple-500/10 border-purple-500/20" };
  if (name.startsWith("ORACLE"))     return { label: "Oracle",     color: "text-red-400    bg-red-500/10    border-red-500/20"     };
  return null; // GPU index — no provider badge
}

/** Derive a "NEW" or "HOT" badge for a market */
function getMarketBadge(name) {
  if (name.startsWith("B200"))       return { label: "NEW",  color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };
  if (name === "H100-PERP")          return { label: "HOT",  color: "text-yellow-400  bg-yellow-500/10  border-yellow-500/30"  };
  if (name.startsWith("T4"))         return { label: "BETA", color: "text-zinc-400    bg-zinc-500/10    border-zinc-500/30"    };
  return null;
}

/** Classify a market into a tab category */
function getCategory(name) {
  const hyperscalers = ["AWS", "GCP", "AZURE", "COREWEAVE", "ORACLE"];
  if (hyperscalers.some(p => name.startsWith(p))) return "Hyperscaler";
  return "GPU Index";
}

// ─────────────────────────────────────────────────────────────────────────────
// useFavorites — Supabase-backed favorites with optimistic updates
// ─────────────────────────────────────────────────────────────────────────────
function useFavorites() {
  const [favorites, setFavorites] = useState(new Set());
  const [userId, setUserId]       = useState(null);
  const [loading, setLoading]     = useState(true);

  // Get session once on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch favorites whenever userId changes
  useEffect(() => {
    if (!userId) { setFavorites(new Set()); setLoading(false); return; }
    setLoading(true);
    supabase
      .from("market_favorites")
      .select("market_name")
      .eq("user_id", userId)
      .then(({ data, error }) => {
        if (!error && data) setFavorites(new Set(data.map(r => r.market_name)));
        setLoading(false);
      });
  }, [userId]);

  const toggleFavorite = useCallback(async (marketName) => {
    if (!userId) return; // Not logged in — silently ignore

    const isFav = favorites.has(marketName);

    // Optimistic update
    setFavorites(prev => {
      const next = new Set(prev);
      isFav ? next.delete(marketName) : next.add(marketName);
      return next;
    });

    if (isFav) {
      await supabase
        .from("market_favorites")
        .delete()
        .eq("user_id", userId)
        .eq("market_name", marketName);
    } else {
      await supabase
        .from("market_favorites")
        .upsert({ user_id: userId, market_name: marketName }, { onConflict: "user_id,market_name" });
    }
  }, [userId, favorites]);

  return { favorites, toggleFavorite, loading, isLoggedIn: !!userId };
}

// ─────────────────────────────────────────────────────────────────────────────
// Info Tooltip (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
const InfoTooltip = ({ title, description }) => {
  const [pos, setPos]         = useState({ top: 0, left: 0 });
  const [hovered, setHovered] = useState(false);
  const ref                   = useRef(null);

  const handleMouseEnter = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, left: Math.max(10, r.left - 100) });
      setHovered(true);
    }
  };

  return (
    <>
      <div
        className="inline-flex text-zinc-400 hover:text-white cursor-help transition-colors ml-1.5"
        ref={ref}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setHovered(false)}
      >
        <Info size={14} />
      </div>
      {hovered && ReactDOM.createPortal(
        <div
          className="fixed z-[100] w-56 p-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg shadow-xl text-xs text-zinc-300 pointer-events-none"
          style={{ top: `${pos.top}px`, left: `${pos.left}px` }}
        >
          <div className="font-semibold text-white mb-1">{title}</div>
          <div className="leading-relaxed">{description}</div>
        </div>,
        document.body
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton row
// ─────────────────────────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <div className="grid grid-cols-12 px-6 py-3.5 border-b border-zinc-800/50 animate-pulse">
    <div className="col-span-5 flex items-center gap-3">
      <div className="w-3.5 h-3.5 rounded bg-zinc-800" />
      <div className="space-y-1.5">
        <div className="h-3 w-24 rounded bg-zinc-800" />
        <div className="h-2 w-16 rounded bg-zinc-800/60" />
      </div>
    </div>
    <div className="col-span-3 flex justify-end items-center">
      <div className="h-3 w-16 rounded bg-zinc-800" />
    </div>
    <div className="col-span-2 flex justify-end items-center">
      <div className="h-3 w-12 rounded bg-zinc-800" />
    </div>
    <div className="col-span-2 flex justify-end items-center">
      <div className="h-3 w-10 rounded bg-zinc-800/60" />
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MarketSelectorModal
// ─────────────────────────────────────────────────────────────────────────────
const TABS = ["★ Favorites", "All", "GPU Index", "Hyperscaler"];

const MarketSelectorModal = ({ isOpen, onClose, onSelect, currentMarket, position, buttonRef }) => {
  const { markets }                                     = useMarketsData();
  const { favorites, toggleFavorite, loading: favLoading, isLoggedIn } = useFavorites();
  const [searchTerm, setSearchTerm]                     = useState("");
  const [activeTab, setActiveTab]                       = useState("All");
  const modalRef                                        = useRef(null);
  const inputRef                                        = useRef(null);
  const listRef                                         = useRef(null);

  // ── Filtered list (must be defined before effects that reference it) ──────
  const filteredMarkets = useMemo(() => {
    return markets.filter(m => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        m.name.toLowerCase().includes(q) ||
        (m.displayName && m.displayName.toLowerCase().includes(q));

      let matchesTab = true;
      if (activeTab === "★ Favorites")  matchesTab = favorites.has(m.name);
      else if (activeTab === "GPU Index")    matchesTab = getCategory(m.name) === "GPU Index";
      else if (activeTab === "Hyperscaler") matchesTab = getCategory(m.name) === "Hyperscaler";

      return matchesSearch && matchesTab;
    });
  }, [markets, searchTerm, activeTab, favorites]);

  // ── Keyboard navigation state ─────────────────────────────────────────────
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => { setSelectedIndex(0); }, [searchTerm, activeTab]);

  // ── Auto-focus search on open ─────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen]);

  // ── Keyboard handler ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (!isOpen) return;
      if (e.key === "Escape")     { onClose(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex(p => Math.min(p + 1, filteredMarkets.length - 1)); }
      else if (e.key === "ArrowUp")   { e.preventDefault(); setSelectedIndex(p => Math.max(p - 1, 0)); }
      else if (e.key === "Enter")     { e.preventDefault(); if (filteredMarkets[selectedIndex]) { onSelect(filteredMarkets[selectedIndex].name); onClose(); } }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose, filteredMarkets, selectedIndex, onSelect]);

  // ── Scroll selected item into view ────────────────────────────────────────
  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.children[selectedIndex];
      el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  // ── Click outside to close ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (buttonRef?.current?.contains(e.target)) return;
      if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
    };
    if (isOpen) {
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [isOpen, onClose, buttonRef]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed z-[9999]" style={{ top: position.top, left: position.left }}>
      <div
        ref={modalRef}
        className="relative w-[820px] bg-[#08080c] border border-zinc-800/80 rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[560px] animate-in fade-in zoom-in-95 duration-150 origin-top-left"
      >
        {/* Top accent line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="px-5 pt-5 pb-0 bg-[#08080c]">
          {/* Search row */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search markets…"
                className="w-full bg-zinc-900/60 border border-zinc-700/40 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 placeholder-zinc-600 transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 -mx-1">
            {TABS.map(tab => {
              const isActive = activeTab === tab;
              const isFavTab = tab === "★ Favorites";
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? isFavTab
                        ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/25"
                        : "bg-blue-500/15 text-blue-400 border border-blue-500/25"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 border border-transparent"
                  }`}
                >
                  {tab}
                  {isFavTab && favorites.size > 0 && (
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? "bg-yellow-500/20 text-yellow-400" : "bg-zinc-700 text-zinc-400"}`}>
                      {favorites.size}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Table header ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-12 px-6 py-2.5 mt-3 bg-zinc-900/40 border-y border-zinc-800/60 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
          <div className="col-span-5">Market</div>
          <div className="col-span-3 text-right">Index Price</div>
          <div className="col-span-2 text-right">24h</div>
          <div className="col-span-2 text-right">Volume</div>
        </div>

        {/* ── Market list ────────────────────────────────────────────────── */}
        <div ref={listRef} className="overflow-y-auto flex-1 custom-scrollbar">
          {/* Skeleton while favorites load */}
          {favLoading && [0,1,2,3].map(i => <SkeletonRow key={i} />)}

          {/* Empty state */}
          {!favLoading && filteredMarkets.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              {activeTab === "★ Favorites" ? (
                <>
                  <Star className="w-10 h-10 text-zinc-700 mb-3" />
                  <p className="text-zinc-400 font-semibold text-sm">No favorites yet</p>
                  <p className="text-zinc-600 text-xs mt-1">
                    {isLoggedIn ? "Click the ★ next to any market to save it here." : "Log in to save favorites."}
                  </p>
                </>
              ) : (
                <>
                  <Search className="w-10 h-10 text-zinc-700 mb-3" />
                  <p className="text-zinc-400 font-semibold text-sm">No markets found</p>
                  <p className="text-zinc-600 text-xs mt-1">Try a different search term.</p>
                </>
              )}
            </div>
          )}

          {/* Rows */}
          {!favLoading && filteredMarkets.map((market, index) => {
            const price      = market.markPrice || market.oraclePrice || 0;
            const change24h  = market.change24h || 0;
            const isPositive = change24h >= 0;
            const isActive   = market.name === currentMarket;
            const isSelected = index === selectedIndex;
            const isFav      = favorites.has(market.name);
            const provider   = getProviderMeta(market.name);
            const badge      = getMarketBadge(market.name);
            const category   = getCategory(market.name);

            return (
              <button
                key={market.name}
                onClick={() => { onSelect(market.name); onClose(); }}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full grid grid-cols-12 px-6 py-3.5 items-center border-b border-zinc-800/40 transition-all duration-100 text-left group relative ${
                  isActive   ? "bg-blue-500/[0.07]" :
                  isSelected ? "bg-white/[0.03]"    : "hover:bg-white/[0.025]"
                }`}
              >
                {/* Active left-border accent */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 rounded-r" />
                )}

                {/* ── Market name col ─────────────────────────────────── */}
                <div className="col-span-5 flex items-center gap-2.5 min-w-0">
                  {/* Star button */}
                  <button
                    onClick={e => { e.stopPropagation(); toggleFavorite(market.name); }}
                    className={`shrink-0 transition-all duration-200 ${
                      isFav
                        ? "text-yellow-400 scale-110"
                        : "text-zinc-700 hover:text-zinc-400 group-hover:text-zinc-500"
                    } ${!isLoggedIn ? "opacity-30 cursor-not-allowed" : ""}`}
                    title={isLoggedIn ? (isFav ? "Remove from favorites" : "Add to favorites") : "Log in to save favorites"}
                    disabled={!isLoggedIn}
                  >
                    <Star className="w-3.5 h-3.5" fill={isFav ? "currentColor" : "none"} />
                  </button>

                  {/* Category icon */}
                  <div className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center ${
                    category === "GPU Index" ? "bg-blue-500/10" : "bg-zinc-800/80"
                  }`}>
                    {category === "GPU Index"
                      ? <Cpu className="w-3 h-3 text-blue-400" />
                      : <Cloud className="w-3 h-3 text-zinc-400" />
                    }
                  </div>

                  {/* Name + sub-label */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-sm font-semibold truncate transition-colors ${
                        isActive ? "text-blue-300" : "text-white group-hover:text-zinc-100"
                      }`}>
                        {market.displayName || market.name.split("-")[0]}
                      </span>

                      {/* Provider badge */}
                      {provider && (
                        <span className={`inline-flex px-1.5 py-0.5 rounded border text-[9px] font-bold tracking-wide ${provider.color}`}>
                          {provider.label}
                        </span>
                      )}

                      {/* NEW / HOT / BETA badge */}
                      {badge && (
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[9px] font-bold tracking-wide ${badge.color}`}>
                          {badge.label === "HOT" && <Zap className="w-2 h-2" />}
                          {badge.label}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-600 font-mono mt-0.5 truncate">
                      {market.name} · PERP · 20×
                    </div>
                  </div>
                </div>

                {/* ── Price col ───────────────────────────────────────── */}
                <div className={`col-span-3 text-right font-mono text-sm font-medium ${
                  isActive ? "text-blue-300" : "text-zinc-200"
                }`}>
                  ${price.toFixed(2)}
                </div>

                {/* ── 24h change col ──────────────────────────────────── */}
                <div className={`col-span-2 text-right font-mono text-xs font-semibold ${
                  isPositive ? "text-emerald-400" : "text-red-400"
                }`}>
                  {isPositive ? "+" : ""}{change24h.toFixed(2)}%
                </div>

                {/* ── Volume col ──────────────────────────────────────── */}
                <div className="col-span-2 text-right font-mono text-xs text-zinc-600">
                  —
                </div>

                {/* Active checkmark */}
                {isActive && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <Check className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="px-5 py-2.5 bg-[#08080c] border-t border-zinc-800/60 flex items-center justify-between">
          <div className="flex items-center gap-4 text-[10px] text-zinc-600">
            <span className="flex items-center gap-1">
              <kbd className="bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded text-zinc-400 font-mono">↑</kbd>
              <kbd className="bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded text-zinc-400 font-mono">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded text-zinc-400 font-mono">↵</kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded text-zinc-400 font-mono">Esc</kbd>
              Close
            </span>
          </div>
          <div className="text-[10px] text-zinc-700">
            {filteredMarkets.length} market{filteredMarkets.length !== 1 ? "s" : ""}
            {!isLoggedIn && (
              <span className="ml-2 text-zinc-600">· <span className="text-yellow-600">Log in</span> to save favorites</span>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TickerBar
// ─────────────────────────────────────────────────────────────────────────────
const TickerBar = () => {
  const { selectedMarket, selectMarket } = useMarket();
  const { markets }                      = useMarketsData();

  const marketName =
    typeof selectedMarket === "string"
      ? selectedMarket
      : selectedMarket?.name || "H100-PERP";

  const { data: marketData } = useMarketRealTimeData(marketName);

  const [isModalOpen, setIsModalOpen]         = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef                               = useRef(null);

  const marketId = MARKET_IDS[marketName] || MARKET_IDS["H100-PERP"];
  const { data: marketConfig } = useReadContract({
    address: SEPOLIA_CONTRACTS.marketRegistry,
    abi: MarketRegistryABI.abi,
    functionName: "getMarket",
    args: [marketId],
    chainId: 11155111,
  });

  const marketFee        = marketConfig?.feeBps ? `${(marketConfig.feeBps / 100).toFixed(2)}%` : "0.10%";
  const changeIsPositive = marketData?.change24hValue >= 0;

  // ── Stat column helper ──────────────────────────────────────────────────
  const Stat = ({ value, label, valueClass = "text-zinc-200", tooltip }) => (
    <div className="flex flex-col justify-center px-4 shrink-0 h-full">
      <div className={`text-xs font-mono font-semibold whitespace-nowrap ${valueClass}`}>{value}</div>
      <div className="flex items-center text-[10px] text-zinc-600 whitespace-nowrap mt-0.5 uppercase tracking-wide gap-0.5">
        {label}
        {tooltip && <div onClick={e => e.stopPropagation()}>{tooltip}</div>}
      </div>
    </div>
  );

  return (
    <div className="h-11 bg-[#050505] border-b border-zinc-800/80 flex items-stretch px-0 shrink-0 overflow-x-auto no-scrollbar">
      {/* ── Market name (static) + Switch button ───────────────────────── */}
      <div className="relative shrink-0 flex items-center gap-2 px-4 border-r border-zinc-800/50">
        {/* Market name — not clickable, just display */}
        <span className="text-sm font-bold text-white tracking-tight">
          {marketData?.displayName || marketName.replace("-PERP", "")}
        </span>
        <span className="text-[9px] font-bold text-zinc-600 border border-zinc-700/60 px-1 py-0.5 rounded font-mono">PERP</span>

        {/* Dedicated Switch button */}
        <button
          ref={buttonRef}
          onClick={() => {
            if (!isModalOpen && buttonRef.current) {
              const rect = buttonRef.current.getBoundingClientRect();
              setDropdownPosition({ top: rect.bottom + 6, left: rect.left });
            }
            setIsModalOpen(prev => !prev);
          }}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 hover:border-blue-500/50 text-blue-400 hover:text-blue-300 text-[10px] font-bold uppercase tracking-wide transition-all"
        >
          Switch
          <ChevronDown size={10} className={`transition-transform duration-150 ${isModalOpen ? "rotate-180" : ""}`} />
        </button>

        <MarketSelectorModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSelect={selectMarket}
          currentMarket={marketName}
          position={dropdownPosition}
          buttonRef={buttonRef}
        />
      </div>

      {/* ── Mark price (primary, large) ──────────────────────────────────── */}
      <div className="flex flex-col justify-center px-4 shrink-0">
        <div className={`text-sm font-mono font-bold whitespace-nowrap ${changeIsPositive ? "text-emerald-400" : "text-red-400"}`}>
          ${marketData?.price || "0.00"}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className={`flex items-center gap-0.5 font-mono font-semibold text-[10px] ${changeIsPositive ? "text-emerald-500" : "text-red-500"}`}>
            {changeIsPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {marketData?.change24h || "0.00%"}
          </span>
          <span className="text-zinc-700 text-[10px]">·</span>
          <span className="text-zinc-600 text-[10px] uppercase tracking-wide">Mark</span>
          <div onClick={e => e.stopPropagation()}>
            <InfoTooltip title="Mark Price ($/hour)" description="The current trading price for GPU compute hours from the vAMM." />
          </div>
        </div>
      </div>

      {/* ── Secondary stats ──────────────────────────────────────────────── */}
      <div className="flex items-stretch overflow-x-auto no-scrollbar">
        <Stat
          value={`$${marketData?.indexPrice || "0.00"}`}
          label="Index Price"
          tooltip={<InfoTooltip title="Index Price (Oracle)" description="Reference price from external oracles tracking real GPU rental rates. Used to calculate funding rates." />}
        />
        <Stat
          value={marketData?.fundingRate || "0.0000%"}
          valueClass={(() => { const r = parseFloat(marketData?.fundingRate); if (!r || r === 0) return "text-zinc-400"; return r > 0 ? "text-emerald-400" : "text-red-400"; })()}
          label="Funding / 8h"
          tooltip={<InfoTooltip title="Funding Rate" description="Periodic payment between longs and shorts every 8 hours. Keeps the perpetual price anchored to real GPU rental rates." />}
        />
        <Stat
          value={marketFee}
          valueClass="text-zinc-300"
          label="Taker Fee"
          tooltip={<InfoTooltip title="Trading Fee" description="Fee charged on each trade as a percentage of notional value." />}
        />
        <Stat
          value={marketData?.volume24h || "$0.00"}
          label="24h Volume"
          tooltip={<InfoTooltip title="24h Volume" description="Total trading volume in USD over the last 24 hours." />}
        />
      </div>
    </div>
  );
};

export default TickerBar;
