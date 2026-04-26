import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "./creatclient";
import { MARKET_IDS } from "./contracts/addresses";
import PageTransition from "./components/PageTransition";
import { HiMagnifyingGlass } from "react-icons/hi2";
import Sparkline from "./components/Sparkline";

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────
const MARKETS_CONFIG = [
  {
    id: "H100-PERP",
    name: "H100",
    fullName: "NVIDIA H100 GPU Index",
    category: "gpu",
    table: "price_data",
    priceField: "price",
    timeField: "timestamp",
    description: "Composite index tracking H100 SXM5 hourly rental rates across major cloud and neocloud providers.",
  },
  {
    id: "B200-PERP",
    name: "B200",
    fullName: "NVIDIA B200 GPU Index",
    category: "gpu",
    table: "b200_index_prices",
    priceField: "index_price",
    description: "Blackwell-generation index aggregating B200 spot prices from hyperscalers and specialty GPU clouds.",
  },
  {
    id: "H200-PERP",
    name: "H200",
    fullName: "NVIDIA H200 GPU Index",
    category: "gpu",
    table: "h200_index_prices",
    priceField: "index_price",
    description: "Next-gen Hopper index covering H200 SXM5 instances with HBM3e memory across top-tier providers.",
  },
  {
    id: "T4-PERP",
    name: "T4",
    fullName: "NVIDIA T4 GPU Index",
    category: "gpu",
    table: "t4_index_prices",
    priceField: "index_price",
    description: "Cost-effective inference index tracking T4 Tensor Core GPU spot rates across major clouds.",
  },
  {
    id: "ORACLE-B200-PERP",
    name: "Oracle B200",
    fullName: "Oracle Cloud B200",
    category: "hyperscaler",
    table: "b200_provider_prices",
    priceField: "effective_price",
    providerFilter: "Oracle",
    description: "Oracle Cloud Infrastructure B200 bare-metal instance pricing in real‑time.",
  },
  {
    id: "AWS-B200-PERP",
    name: "AWS B200",
    fullName: "Amazon Web Services B200",
    category: "hyperscaler",
    table: "b200_provider_prices",
    priceField: "effective_price",
    providerFilter: "AWS",
    description: "Amazon EC2 B200-powered instance on-demand pricing aggregated across US regions.",
  },
  {
    id: "GCP-B200-PERP",
    name: "GCP B200",
    fullName: "Google Cloud B200",
    category: "hyperscaler",
    table: "b200_provider_prices",
    priceField: "effective_price",
    providerFilter: "Google Cloud",
    description: "Google Cloud A3 Ultra B200 GPU instance pricing across multi-region deployments.",
  },
  {
    id: "COREWEAVE-B200-PERP",
    name: "CoreWeave B200",
    fullName: "CoreWeave B200",
    category: "hyperscaler",
    table: "b200_provider_prices",
    priceField: "effective_price",
    providerFilter: "CoreWeave",
    description: "CoreWeave's purpose-built B200 GPU cloud pricing — the leading neocloud for AI workloads.",
  },
  {
    id: "ORACLE-H200-PERP",
    name: "Oracle H200",
    fullName: "Oracle Cloud H200",
    category: "hyperscaler",
    table: "h200_provider_prices",
    priceField: "effective_price",
    providerFilter: "Oracle",
    description: "Oracle Cloud Infrastructure H200 bare-metal compute pricing in real‑time.",
  },
  {
    id: "AWS-H200-PERP",
    name: "AWS H200",
    fullName: "Amazon Web Services H200",
    category: "hyperscaler",
    table: "h200_provider_prices",
    priceField: "effective_price",
    providerFilter: "AWS",
    description: "Amazon EC2 H200 on-demand instance pricing across US and EU regions.",
  },
  {
    id: "GCP-H200-PERP",
    name: "GCP H200",
    fullName: "Google Cloud H200",
    category: "hyperscaler",
    table: "h200_provider_prices",
    priceField: "effective_price",
    providerFilter: "Google Cloud",
    description: "Google Cloud A3 Mega H200 GPU instance pricing, aggregated across global regions.",
  },
  {
    id: "COREWEAVE-H200-PERP",
    name: "CoreWeave H200",
    fullName: "CoreWeave H200",
    category: "hyperscaler",
    table: "h200_provider_prices",
    priceField: "effective_price",
    providerFilter: "CoreWeave",
    description: "CoreWeave H200 high-memory GPU cloud pricing for large-scale LLM training and inference.",
  },
  {
    id: "AZURE-H200-PERP",
    name: "Azure H200",
    fullName: "Azure H200",
    category: "hyperscaler",
    table: "h200_provider_prices",
    priceField: "effective_price",
    providerFilter: "Azure",
    description: "Microsoft Azure ND H200 v5 instance pricing for enterprise-scale AI workloads.",
  },
  {
    id: "AWS-H100-PERP",
    name: "AWS H100",
    fullName: "Amazon Web Services H100",
    category: "hyperscaler",
    table: "h100_hyperscaler_prices",
    priceField: "effective_price",
    providerFilter: "Amazon Web Services",
    description: "Amazon EC2 p5 H100 instance on-demand pricing aggregated across US and EU AWS regions.",
  },
  {
    id: "AZURE-H100-PERP",
    name: "Azure H100",
    fullName: "Microsoft Azure H100",
    category: "hyperscaler",
    table: "h100_hyperscaler_prices",
    priceField: "effective_price",
    providerFilter: "Microsoft Azure",
    description: "Microsoft Azure ND H100 v5 instance pricing for enterprise AI and HPC workloads.",
  },
  {
    id: "GCP-H100-PERP",
    name: "GCP H100",
    fullName: "Google Cloud H100",
    category: "hyperscaler",
    table: "h100_hyperscaler_prices",
    priceField: "effective_price",
    providerFilter: "Google Cloud",
    description: "Google Cloud A3 H100 GPU instance pricing across multi-region US and European deployments.",
  },
];

const BADGE_META = {
  "H100-PERP": { label: "HOT",  color: "text-yellow-400  bg-yellow-500/10  border-yellow-500/30"  },
  "B200-PERP": { label: "NEW",  color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  "T4-PERP":   { label: "BETA", color: "text-zinc-400    bg-zinc-500/10    border-zinc-500/30"    },
};

const PROVIDER_COLORS = {
  "AWS":       "text-orange-400 bg-orange-500/10 border-orange-500/25",
  "GCP":       "text-blue-400   bg-blue-500/10   border-blue-500/25",
  "AZURE":     "text-sky-400    bg-sky-500/10    border-sky-500/25",
  "COREWEAVE": "text-purple-400 bg-purple-500/10 border-purple-500/25",
  "ORACLE":    "text-red-400    bg-red-500/10    border-red-500/25",
};

function getProviderColor(name) {
  for (const [prefix, color] of Object.entries(PROVIDER_COLORS)) {
    if (name.toUpperCase().startsWith(prefix)) return color;
  }
  return "text-zinc-400 bg-zinc-500/10 border-zinc-500/25";
}

function getProviderLabel(name) {
  const upper = name.toUpperCase();
  if (upper.startsWith("COREWEAVE")) return "CW";
  if (upper.startsWith("ORACLE"))    return "OCI";
  if (upper.startsWith("AZURE"))     return "Azure";
  if (upper.startsWith("AWS"))       return "AWS";
  if (upper.startsWith("GCP"))       return "GCP";
  return name.split(" ")[0];
}

function fmtUsd(val) {
  if (!val || val === 0) return "—";
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000)     return `$${(val / 1_000).toFixed(1)}K`;
  return `$${val.toFixed(0)}`;
}

const TABS = [
  { key: "gpu",         label: "GPU Indices"  },
  { key: "hyperscaler", label: "Hyperscaler"  },
  { key: "all",         label: "All Markets"  },
];

// ─────────────────────────────────────────────────────────────────────────────
// GPU Index Card — large, prominent, 2-column layout
// ─────────────────────────────────────────────────────────────────────────────
const GpuIndexCard = ({ market, price, change24h, volume24h, openInterest, index }) => {
  const isPositive = (change24h || 0) >= 0;
  const badge = BADGE_META[market.id];

  return (
    <div
      className="group relative rounded-2xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.035] hover:border-white/[0.13] transition-all duration-300 overflow-hidden cursor-pointer flex flex-col"
      style={{ animation: `fadeSlideIn 0.4s ease-out ${index * 0.07}s both` }}
      onClick={() => (window.location.href = `/trade?market=${market.id}`)}
    >
      {/* Top blue accent */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

      <div className="p-5 md:p-6 flex flex-col gap-5 flex-1">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl font-semibold text-white tracking-tight">{market.name}</span>
              {badge && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${badge.color}`}>
                  {badge.label}
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500">{market.fullName}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[9px] font-mono text-zinc-600 border border-zinc-800 px-1.5 py-0.5 rounded">PERP</span>
            <span className="text-[9px] font-semibold text-blue-400/60 bg-blue-500/[0.07] px-1.5 py-0.5 rounded border border-blue-500/15">INDEX</span>
          </div>
        </div>

        {/* ── Full-width sparkline ── */}
        <div className="w-full">
          <Sparkline marketId={market.id} width={300} height={56} block />
        </div>

        {/* ── Price + 24h ── */}
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[28px] leading-none font-mono font-semibold text-white tracking-tight">
              {price != null ? `$${price.toFixed(2)}` : <span className="text-zinc-600">—</span>}
            </div>
            <div className="text-[10px] text-zinc-600 mt-1 uppercase tracking-widest">per GPU · hr</div>
          </div>
          <div className={`text-right ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
            <div className="text-sm font-mono font-semibold">
              {isPositive ? "+" : ""}{(change24h || 0).toFixed(2)}%
            </div>
            <div className="text-[10px] text-zinc-600 mt-1 uppercase tracking-widest">24h change</div>
          </div>
        </div>

        {/* ── Stats + Trade ── */}
        <div className="flex items-center gap-4 pt-4 border-t border-white/[0.05] mt-auto">
          <div>
            <div className="text-xs font-mono text-zinc-300">{fmtUsd(volume24h)}</div>
            <div className="text-[9px] text-zinc-600 uppercase tracking-wide mt-0.5">24h Vol</div>
          </div>
          <div className="w-px h-7 bg-white/[0.06]" />
          <div>
            <div className="text-xs font-mono text-zinc-300">{fmtUsd(openInterest)}</div>
            <div className="text-[9px] text-zinc-600 uppercase tracking-wide mt-0.5">Open Interest</div>
          </div>
          <Link
            to={`/trade?market=${market.id}`}
            onClick={(e) => e.stopPropagation()}
            className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/25 hover:border-blue-500/45 transition-all duration-200"
          >
            Trade
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>

      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Hyperscaler Table Row
// ─────────────────────────────────────────────────────────────────────────────
const HyperscalerRow = ({ market, price, change24h, volume24h, openInterest, index }) => {
  const isPositive = (change24h || 0) >= 0;
  const providerColor = getProviderColor(market.name);
  const providerLabel = getProviderLabel(market.name);

  return (
    <tr
      className="group border-b border-white/[0.04] last:border-0 hover:bg-white/[0.025] transition-colors duration-150 cursor-pointer"
      style={{ animation: `fadeSlideIn 0.3s ease-out ${index * 0.03}s both` }}
      onClick={() => (window.location.href = `/trade?market=${market.id}`)}
    >
      {/* Market */}
      <td className="py-3.5 pl-5 pr-3 md:pl-6">
        <div className="flex items-center gap-3">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${providerColor}`}>
            {providerLabel}
          </span>
          <div className="min-w-0">
            <div className="text-sm font-medium text-white leading-tight">{market.name}</div>
            <div className="text-[10px] text-zinc-600 mt-0.5 truncate">{market.fullName}</div>
          </div>
        </div>
      </td>

      {/* Sparkline */}
      <td className="py-3.5 px-3 md:px-4">
        <Sparkline marketId={market.id} width={80} height={26} />
      </td>

      {/* Price */}
      <td className="py-3.5 px-3 md:px-4">
        <div className="text-sm font-mono font-medium text-white">
          {price != null ? `$${price.toFixed(2)}` : <span className="text-zinc-600">—</span>}
        </div>
        <div className="text-[9px] text-zinc-600 mt-0.5">/hr</div>
      </td>

      {/* 24h */}
      <td className="py-3.5 px-3 md:px-4">
        <span className={`text-xs font-mono font-semibold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
          {isPositive ? "+" : ""}{(change24h || 0).toFixed(2)}%
        </span>
      </td>

      {/* Volume — hidden on small screens */}
      <td className="py-3.5 px-3 md:px-4 hidden md:table-cell">
        <span className="text-xs font-mono text-zinc-500">{fmtUsd(volume24h)}</span>
      </td>

      {/* OI — hidden on medium screens */}
      <td className="py-3.5 px-3 md:px-4 hidden lg:table-cell">
        <span className="text-xs font-mono text-zinc-500">{fmtUsd(openInterest)}</span>
      </td>

      {/* Action */}
      <td className="py-3.5 pl-3 pr-5 md:pr-6 text-right">
        <Link
          to={`/trade?market=${market.id}`}
          onClick={(e) => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-all"
        >
          Trade →
        </Link>
      </td>
    </tr>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton components
// ─────────────────────────────────────────────────────────────────────────────
const GpuCardSkeleton = () => (
  <div className="rounded-2xl border border-white/[0.05] bg-white/[0.015] p-5 md:p-6 animate-pulse flex flex-col gap-5">
    <div className="flex items-start justify-between">
      <div>
        <div className="w-16 h-7 bg-zinc-800 rounded mb-2" />
        <div className="w-32 h-3 bg-zinc-800/60 rounded" />
      </div>
      <div className="w-10 h-4 bg-zinc-800/50 rounded" />
    </div>
    <div className="w-full h-14 bg-zinc-800/40 rounded-lg" />
    <div className="flex items-end justify-between">
      <div className="w-24 h-8 bg-zinc-800 rounded" />
      <div className="w-14 h-6 bg-zinc-800/60 rounded" />
    </div>
    <div className="flex items-center gap-4 pt-4 border-t border-white/[0.04]">
      <div className="w-12 h-8 bg-zinc-800/50 rounded" />
      <div className="w-px h-7 bg-white/[0.04]" />
      <div className="w-12 h-8 bg-zinc-800/50 rounded" />
      <div className="ml-auto w-20 h-8 bg-zinc-800/50 rounded-lg" />
    </div>
  </div>
);

const TableRowSkeleton = ({ i }) => (
  <tr className="border-b border-white/[0.04] animate-pulse" style={{ animationDelay: `${i * 0.05}s` }}>
    <td className="py-3.5 pl-5 pr-3 md:pl-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-4 bg-zinc-800/70 rounded" />
        <div>
          <div className="w-24 h-3 bg-zinc-800 rounded mb-1.5" />
          <div className="w-32 h-2 bg-zinc-800/50 rounded" />
        </div>
      </div>
    </td>
    <td className="py-3.5 px-3 md:px-4"><div className="w-20 h-7 bg-zinc-800/40 rounded" /></td>
    <td className="py-3.5 px-3 md:px-4"><div className="w-14 h-4 bg-zinc-800 rounded" /></td>
    <td className="py-3.5 px-3 md:px-4"><div className="w-10 h-4 bg-zinc-800/70 rounded" /></td>
    <td className="py-3.5 px-3 md:px-4 hidden md:table-cell"><div className="w-10 h-4 bg-zinc-800/50 rounded" /></td>
    <td className="py-3.5 px-3 md:px-4 hidden lg:table-cell"><div className="w-10 h-4 bg-zinc-800/50 rounded" /></td>
    <td className="py-3.5 pl-3 pr-5 md:pr-6" />
  </tr>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
const MarketsPage = () => {
  const [marketPrices, setMarketPrices] = useState({});
  const [loading, setLoading]           = useState(true);
  const [searchQuery, setSearchQuery]   = useState("");
  const [activeTab, setActiveTab]       = useState("gpu");

  useEffect(() => {
    const fetchPrices = async () => {
      setLoading(true);

      const [priceResults, tradeHistoryResult, indexerStatsResult] = await Promise.all([
        Promise.all(
          MARKETS_CONFIG.map(async (market) => {
            try {
              const timeField = market.timeField || "created_at";
              let query = supabase
                .from(market.table)
                .select(`${market.priceField}, ${timeField}`)
                .order(timeField, { ascending: false })
                .limit(2);

              if (market.providerFilter) query = query.eq("provider_name", market.providerFilter);

              const { data, error } = await query;
              if (!error && data && data.length > 0) {
                const currentPrice  = parseFloat(data[0][market.priceField]);
                const previousPrice = data.length > 1 ? parseFloat(data[1][market.priceField]) : currentPrice;
                const change24h     = previousPrice > 0 ? ((currentPrice - previousPrice) / previousPrice) * 100 : 0;
                return { id: market.id, price: currentPrice, change24h, volume24h: 0 };
              }
            } catch (err) {
              console.error(`Error fetching ${market.id}:`, err);
            }
            return null;
          })
        ),

        (async () => {
          try {
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { data: trades, error } = await supabase
              .from("trade_history")
              .select("market, size, price")
              .gt("created_at", yesterday);

            if (!error && trades) {
              const volumes = {};
              trades.forEach(trade => {
                const vol = Math.abs(parseFloat(trade.size || 0) * parseFloat(trade.price || 0));
                const marketId = trade.market;
                volumes[marketId] = (volumes[marketId] || 0) + vol;
                const config = MARKETS_CONFIG.find(m => m.name === marketId || m.id === marketId);
                if (config && config.id !== marketId) volumes[config.id] = (volumes[config.id] || 0) + vol;
              });
              return volumes;
            }
          } catch (err) {
            console.error("Error fetching trade history volume:", err);
          }
          return {};
        })(),

        (async () => {
          try {
            const { data: statsData, error } = await supabase.from("market_stats_24h").select("*");
            if (!error && statsData) {
              const stats = {};
              statsData.forEach(stat => {
                stats[stat.market_id] = {
                  volume:       parseFloat(stat.volume_24h_usd     || 0),
                  change:       parseFloat(stat.change_24h_percent || 0),
                  openInterest: parseFloat(stat.open_interest_usd  || 0),
                };
              });
              return stats;
            }
          } catch (err) {
            console.error("Error fetching indexer stats:", err);
          }
          return {};
        })(),
      ]);

      const prices = {};
      priceResults.forEach(result => {
        if (result) prices[result.id] = { price: result.price, change24h: result.change24h, volume24h: 0 };
      });

      const tradeVols   = tradeHistoryResult || {};
      const indexerStats = indexerStatsResult || {};

      Object.keys(prices).forEach(key => {
        let vol = tradeVols[key] || tradeVols[MARKETS_CONFIG.find(m => m.id === key)?.name] || 0;
        const marketHash = MARKET_IDS[key];
        if (marketHash && indexerStats[marketHash]) {
          vol = indexerStats[marketHash].volume;
          if (indexerStats[marketHash].change != null) prices[key].change24h = indexerStats[marketHash].change;
        }
        prices[key].volume24h    = vol;
        prices[key].openInterest = indexerStats[marketHash]?.openInterest ?? 0;
      });

      setMarketPrices(prices);
      setLoading(false);
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  // ── Derived data ──────────────────────────────────────────────────────────
  const gpuMarkets         = MARKETS_CONFIG.filter(m => m.category === "gpu");
  const hyperscalerMarkets = MARKETS_CONFIG.filter(m => m.category === "hyperscaler");

  const filteredGpu = useMemo(() =>
    gpuMarkets.filter(m =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.fullName.toLowerCase().includes(searchQuery.toLowerCase())
    ), [searchQuery]);

  const filteredHyperscaler = useMemo(() =>
    hyperscalerMarkets.filter(m =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.fullName.toLowerCase().includes(searchQuery.toLowerCase())
    ), [searchQuery]);

  const filteredAll = useMemo(() =>
    MARKETS_CONFIG.filter(m =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.fullName.toLowerCase().includes(searchQuery.toLowerCase())
    ), [searchQuery]);

  const tabCounts = {
    gpu:         filteredGpu.length,
    hyperscaler: filteredHyperscaler.length,
    all:         filteredAll.length,
  };

  const stats = useMemo(() => {
    const arr = Object.values(marketPrices);
    return {
      totalMarkets: MARKETS_CONFIG.length,
      avgChange:    arr.length > 0 ? arr.reduce((s, p) => s + (p.change24h || 0), 0) / arr.length : 0,
      totalVolume:  arr.reduce((s, p) => s + (p.volume24h || 0), 0),
    };
  }, [marketPrices]);

  const isPositiveAvg = stats.avgChange >= 0;

  // Which markets to show in which layout
  const showGpu         = activeTab === "gpu" || activeTab === "all";
  const showHyperscaler = activeTab === "hyperscaler" || activeTab === "all";
  const currentGpu         = activeTab === "all" ? filteredGpu         : filteredGpu;
  const currentHyperscaler = activeTab === "all" ? filteredHyperscaler : filteredHyperscaler;

  return (
    <PageTransition className="min-h-screen bg-[#0a0a0f] pt-16 pb-20">
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">

        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="pt-8 pb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.18em]">Live Data</span>
          </div>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-4xl md:text-5xl font-semibold text-white tracking-tight mb-2">Markets</h1>
              <p className="text-zinc-500 text-sm md:text-base max-w-lg leading-relaxed">
                GPU compute perpetual futures — real-time pricing from global cloud providers.
              </p>
            </div>
            {/* Stats strip */}
            <div className="flex items-center gap-5 text-right shrink-0">
              <div>
                <div className="text-xl font-semibold text-white font-mono">{stats.totalMarkets}</div>
                <div className="text-[10px] text-zinc-600 uppercase tracking-wide mt-0.5">Markets</div>
              </div>
              <div className="w-px h-10 bg-white/[0.06]" />
              <div>
                <div className={`text-xl font-semibold font-mono ${isPositiveAvg ? "text-emerald-400" : "text-red-400"}`}>
                  {isPositiveAvg ? "+" : ""}{stats.avgChange.toFixed(2)}%
                </div>
                <div className="text-[10px] text-zinc-600 uppercase tracking-wide mt-0.5">Avg 24h</div>
              </div>
              <div className="w-px h-10 bg-white/[0.06]" />
              <div>
                <div className="text-xl font-semibold text-white font-mono">{fmtUsd(stats.totalVolume)}</div>
                <div className="text-[10px] text-zinc-600 uppercase tracking-wide mt-0.5">24h Volume</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Controls row: search + tabs ─────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-0">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <HiMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input
              type="text"
              placeholder="Search markets…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/[0.03] border border-white/[0.07] rounded-xl text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/15 transition-all"
            />
          </div>

          {/* Tabs — underline style */}
          <div className="flex items-center border-b border-white/[0.07] sm:border-b-0 sm:ml-2 gap-0">
            {TABS.map(tab => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative px-4 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                    isActive ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {tab.label}
                  {tabCounts[tab.key] > 0 && (
                    <span className={`ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive ? "bg-blue-500/20 text-blue-400" : "bg-zinc-800 text-zinc-500"
                    }`}>
                      {tabCounts[tab.key]}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-px bg-blue-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Thin divider under controls ─────────────────────────────────── */}
        <div className="h-px bg-white/[0.06] mb-8" />

        {/* ── Empty state ─────────────────────────────────────────────────── */}
        {!loading && filteredAll.length === 0 && (
          <div className="py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
              <HiMagnifyingGlass className="w-6 h-6 text-zinc-600" />
            </div>
            <p className="text-zinc-400 font-medium">No markets match "{searchQuery}"</p>
            <button onClick={() => setSearchQuery("")} className="text-xs text-blue-400 hover:text-blue-300 mt-2 transition-colors">
              Clear search
            </button>
          </div>
        )}

        {/* ── GPU Indices section ─────────────────────────────────────────── */}
        {showGpu && (filteredGpu.length > 0 || loading) && (
          <div className="mb-12">
            {activeTab === "all" && (
              <div className="flex items-center gap-3 mb-5">
                <span className="text-[10px] font-bold text-blue-400/70 uppercase tracking-[0.18em]">GPU Indices</span>
                <div className="flex-1 h-px bg-white/[0.05]" />
                <span className="text-[10px] text-zinc-600">{filteredGpu.length} markets</span>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <GpuCardSkeleton key={i} />)
                : filteredGpu.map((market, i) => (
                    <GpuIndexCard
                      key={market.id}
                      market={market}
                      price={marketPrices[market.id]?.price}
                      change24h={marketPrices[market.id]?.change24h}
                      volume24h={marketPrices[market.id]?.volume24h}
                      openInterest={marketPrices[market.id]?.openInterest}
                      index={i}
                    />
                  ))
              }
            </div>
          </div>
        )}

        {/* ── Hyperscaler section ─────────────────────────────────────────── */}
        {showHyperscaler && (filteredHyperscaler.length > 0 || loading) && (
          <div>
            {activeTab === "all" && (
              <div className="flex items-center gap-3 mb-5">
                <span className="text-[10px] font-bold text-purple-400/70 uppercase tracking-[0.18em]">Hyperscaler</span>
                <div className="flex-1 h-px bg-white/[0.05]" />
                <span className="text-[10px] text-zinc-600">{filteredHyperscaler.length} markets</span>
              </div>
            )}
            <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
              <table className="w-full">
                <colgroup>
                  <col className="w-auto" />
                  <col className="w-[110px]" />
                  <col className="w-[110px]" />
                  <col className="w-[90px]" />
                  <col className="w-[110px] hidden md:table-column" />
                  <col className="w-[130px] hidden lg:table-column" />
                  <col className="w-[80px]" />
                </colgroup>
                <thead className="bg-zinc-900/40 border-b border-white/[0.06]">
                  <tr className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    <th className="py-3 pl-5 pr-3 md:pl-6 text-left">Market</th>
                    <th className="py-3 px-3 md:px-4 text-left">Trend</th>
                    <th className="py-3 px-3 md:px-4 text-left">Price</th>
                    <th className="py-3 px-3 md:px-4 text-left">24h</th>
                    <th className="py-3 px-3 md:px-4 text-left hidden md:table-cell">Volume</th>
                    <th className="py-3 px-3 md:px-4 text-left hidden lg:table-cell">Open Interest</th>
                    <th className="py-3 pl-3 pr-5 md:pr-6" />
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} i={i} />)
                    : filteredHyperscaler.map((market, i) => (
                        <HyperscalerRow
                          key={market.id}
                          market={market}
                          price={marketPrices[market.id]?.price}
                          change24h={marketPrices[market.id]?.change24h}
                          volume24h={marketPrices[market.id]?.volume24h}
                          openInterest={marketPrices[market.id]?.openInterest}
                          index={i}
                        />
                      ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>
    </PageTransition>
  );
};

export default MarketsPage;
