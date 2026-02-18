import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "./creatclient";
import { MARKET_IDS } from "./contracts/addresses";
import PageTransition from "./components/PageTransition";
import { HiArrowTrendingUp, HiArrowTrendingDown, HiMagnifyingGlass } from "react-icons/hi2";

// Market categories
const MARKET_CATEGORIES = {
  all: "All Markets",
  gpu: "GPU Indices",
  hyperscaler: "Hyperscaler",
};

// Market configuration with metadata
const MARKETS_CONFIG = [
  {
    id: "H100-PERP",
    name: "H100",
    fullName: "NVIDIA H100 GPU Index",
    category: "gpu",
    table: "price_data",
    priceField: "price",
    timeField: "timestamp",
    description: "Weighted average H100 GPU hourly rental rate",
  },
  {
    id: "B200-PERP",
    name: "B200",
    fullName: "NVIDIA B200 GPU Index",
    category: "gpu",
    table: "b200_index_prices",
    priceField: "index_price",
    description: "Weighted average B200 GPU hourly rental rate",
  },
  {
    id: "H200-PERP",
    name: "H200",
    fullName: "NVIDIA H200 GPU Index",
    category: "gpu",
    table: "h200_index_prices",
    priceField: "index_price",
    description: "Weighted average H200 GPU hourly rental rate",
  },
  {
    id: "ORACLE-B200-PERP",
    name: "Oracle B200",
    fullName: "Oracle Cloud B200",
    category: "hyperscaler",
    table: "b200_provider_prices",
    priceField: "effective_price",
    providerFilter: "Oracle",
    description: "Oracle Cloud B200 instance pricing",
  },
  {
    id: "AWS-B200-PERP",
    name: "AWS B200",
    fullName: "Amazon Web Services B200",
    category: "hyperscaler",
    table: "b200_provider_prices",
    priceField: "effective_price",
    providerFilter: "AWS",
    description: "AWS B200 instance pricing",
  },
  {
    id: "GCP-B200-PERP",
    name: "GCP B200",
    fullName: "Google Cloud B200",
    category: "hyperscaler",
    table: "b200_provider_prices",
    priceField: "effective_price",
    providerFilter: "Google Cloud",
    description: "Google Cloud B200 instance pricing",
  },
  {
    id: "COREWEAVE-B200-PERP",
    name: "CoreWeave B200",
    fullName: "CoreWeave B200",
    category: "hyperscaler",
    table: "b200_provider_prices",
    priceField: "effective_price",
    providerFilter: "CoreWeave",
    description: "CoreWeave B200 instance pricing",
  },
  {
    id: "ORACLE-H200-PERP",
    name: "Oracle H200",
    fullName: "Oracle Cloud H200",
    category: "hyperscaler",
    table: "h200_provider_prices",
    priceField: "effective_price",
    providerFilter: "Oracle",
    description: "Oracle Cloud H200 instance pricing",
  },
  {
    id: "AWS-H200-PERP",
    name: "AWS H200",
    fullName: "Amazon Web Services H200",
    category: "hyperscaler",
    table: "h200_provider_prices",
    priceField: "effective_price",
    providerFilter: "AWS",
    description: "AWS H200 instance pricing",
  },
  {
    id: "GCP-H200-PERP",
    name: "GCP H200",
    fullName: "Google Cloud H200",
    category: "hyperscaler",
    table: "h200_provider_prices",
    priceField: "effective_price",
    providerFilter: "Google Cloud",
    description: "Google Cloud H200 instance pricing",
  },
  {
    id: "COREWEAVE-H200-PERP",
    name: "CoreWeave H200",
    fullName: "CoreWeave H200",
    category: "hyperscaler",
    table: "h200_provider_prices",
    priceField: "effective_price",
    providerFilter: "CoreWeave",
    description: "CoreWeave H200 instance pricing",
  },
  {
    id: "AZURE-H200-PERP",
    name: "Azure H200",
    fullName: "Azure H200",
    category: "hyperscaler",
    table: "h200_provider_prices",
    priceField: "effective_price",
    providerFilter: "Azure",
    description: "Azure H200 instance pricing",
  },
  // T4 GPU Index
  {
    id: "T4-PERP",
    name: "T4",
    fullName: "NVIDIA T4 GPU Index",
    category: "gpu",
    table: "t4_index_prices",
    priceField: "index_price",
    description: "Weighted average T4 GPU hourly rental rate",
  },
  // H100 Hyperscaler-specific markets
  {
    id: "AWS-H100-PERP",
    name: "AWS H100",
    fullName: "Amazon Web Services H100",
    category: "hyperscaler",
    table: "h100_hyperscaler_prices",
    priceField: "effective_price",
    providerFilter: "Amazon Web Services",
    description: "AWS H100 instance pricing",
  },
  {
    id: "AZURE-H100-PERP",
    name: "Azure H100",
    fullName: "Microsoft Azure H100",
    category: "hyperscaler",
    table: "h100_hyperscaler_prices",
    priceField: "effective_price",
    providerFilter: "Microsoft Azure",
    description: "Azure H100 instance pricing",
  },
  {
    id: "GCP-H100-PERP",
    name: "GCP H100",
    fullName: "Google Cloud H100",
    category: "hyperscaler",
    table: "h100_hyperscaler_prices",
    priceField: "effective_price",
    providerFilter: "Google Cloud",
    description: "Google Cloud H100 instance pricing",
  },
];

/* ═══════════════════════════════════════════════
   Market Card Component — individual market tile
   ═══════════════════════════════════════════════ */
const MarketCard = ({ market, price, change24h, volume24h, onClick, index }) => {
  const isPositive = change24h >= 0;
  const isGpu = market.category === "gpu";

  return (
    <div
      onClick={onClick}
      className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-300 cursor-pointer overflow-hidden"
      style={{ animation: `fadeSlideIn 0.4s ease-out ${index * 0.04}s both` }}
    >
      {/* Top gradient accent */}
      <div className={`absolute top-0 left-0 right-0 h-[1px] ${isGpu
        ? "bg-gradient-to-r from-transparent via-blue-500/40 to-transparent"
        : "bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"
      }`} />

      <div className="p-5 md:p-6">
        {/* Header row: name + category badge */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Icon circle */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
              isGpu
                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
            }`}>
              {market.name.split(" ")[0].substring(0, 3)}
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm leading-tight">{market.name}</h3>
              <p className="text-[11px] text-zinc-500 mt-0.5 leading-tight">{market.fullName}</p>
            </div>
          </div>
          <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full ${
            isGpu
              ? "text-blue-400/70 bg-blue-500/[0.06]"
              : "text-purple-400/70 bg-purple-500/[0.06]"
          }`}>
            {isGpu ? "Index" : "Provider"}
          </span>
        </div>

        {/* Price */}
        <div className="mb-3">
          <span className="text-2xl font-bold text-white font-mono tracking-tight">
            ${price?.toFixed(2) || "—"}
          </span>
          <span className="text-[11px] text-zinc-600 ml-1.5">/hr</span>
        </div>

        {/* Change + Volume row */}
        <div className="flex items-center justify-between">
          <div
            className={`inline-flex items-center gap-1 text-xs font-semibold font-mono px-2 py-1 rounded-lg ${
              isPositive
                ? "text-emerald-400 bg-emerald-500/[0.08]"
                : "text-red-400 bg-red-500/[0.08]"
            }`}
          >
            {isPositive ? (
              <HiArrowTrendingUp className="w-3.5 h-3.5" />
            ) : (
              <HiArrowTrendingDown className="w-3.5 h-3.5" />
            )}
            {isPositive ? "+" : ""}
            {change24h?.toFixed(2) || "0.00"}%
          </div>
          <div className="text-[11px] text-zinc-500 font-mono">
            Vol ${volume24h?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || "0"}
          </div>
        </div>

        {/* Trade button — appears on hover */}
        <div className="mt-4 pt-4 border-t border-white/[0.04] opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Link
            to={`/trade?market=${market.id}`}
            onClick={(e) => e.stopPropagation()}
            className={`w-full block text-center py-2 rounded-lg text-xs font-semibold transition-all ${
              isGpu
                ? "bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 border border-blue-500/20"
                : "bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 border border-purple-500/20"
            }`}
          >
            Trade {market.name} →
          </Link>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════
   Stats Card Component — top summary cards
   ═══════════════════════════════════════════════ */
const StatsCard = ({ label, value, subValue, icon, accent = "blue" }) => {
  const accentMap = {
    blue: { border: "border-blue-500/20", icon: "text-blue-400 bg-blue-500/10", glow: "bg-blue-500/[0.04]" },
    emerald: { border: "border-emerald-500/20", icon: "text-emerald-400 bg-emerald-500/10", glow: "bg-emerald-500/[0.04]" },
    purple: { border: "border-purple-500/20", icon: "text-purple-400 bg-purple-500/10", glow: "bg-purple-500/[0.04]" },
  };
  const a = accentMap[accent];

  return (
    <div className={`relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 overflow-hidden`}>
      {/* Subtle glow in corner */}
      <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full ${a.glow} blur-xl pointer-events-none`} />
      
      <div className="relative">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${a.icon}`}>
            {icon}
          </div>
          <span className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">{label}</span>
        </div>
        <div className="text-2xl font-bold text-white font-mono tracking-tight">{value}</div>
        {subValue && <div className="text-[11px] text-zinc-500 mt-1">{subValue}</div>}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════
   Main Markets Page
   ═══════════════════════════════════════════════ */
const MarketsPage = () => {
  const [marketPrices, setMarketPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  // Fetch current prices for all markets
  useEffect(() => {
    const fetchPrices = async () => {
      setLoading(true);

      // Fire ALL queries in parallel using Promise.all
      const [priceResults, tradeHistoryResult, indexerStatsResult] = await Promise.all([
        // 1. All market price queries in parallel
        Promise.all(
          MARKETS_CONFIG.map(async (market) => {
            try {
              const timeField = market.timeField || "created_at";
              let query = supabase
                .from(market.table)
                .select(`${market.priceField}, ${timeField}`)
                .order(timeField, { ascending: false })
                .limit(2);

              if (market.providerFilter) {
                query = query.eq("provider_name", market.providerFilter);
              }

              const { data, error } = await query;

              if (!error && data && data.length > 0) {
                const currentPrice = parseFloat(data[0][market.priceField]);
                const previousPrice =
                  data.length > 1
                    ? parseFloat(data[1][market.priceField])
                    : currentPrice;

                const change24h =
                  previousPrice > 0
                    ? ((currentPrice - previousPrice) / previousPrice) * 100
                    : 0;

                return {
                  id: market.id,
                  price: currentPrice,
                  change24h: change24h,
                  volume24h: 0,
                };
              }
            } catch (err) {
              console.error(`Error fetching ${market.id}:`, err);
            }
            return null;
          })
        ),

        // 2. Trade history volume query (runs in parallel with everything else)
        (async () => {
          try {
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { data: trades, error: volumeError } = await supabase
              .from("trade_history")
              .select("market, size, price")
              .gt("created_at", yesterday);

            if (!volumeError && trades) {
              const volumes = {};
              trades.forEach(trade => {
                const vol = Math.abs(parseFloat(trade.size || 0) * parseFloat(trade.price || 0));
                const marketId = trade.market;
                volumes[marketId] = (volumes[marketId] || 0) + vol;

                const config = MARKETS_CONFIG.find(m => m.name === marketId || m.id === marketId);
                if (config && config.id !== marketId) {
                  volumes[config.id] = (volumes[config.id] || 0) + vol;
                }
              });
              return volumes;
            }
          } catch (err) {
            console.error("Error fetching trade history volume:", err);
          }
          return {};
        })(),

        // 3. Indexer stats query (runs in parallel with everything else)
        (async () => {
          try {
            const { data: statsData, error: statsError } = await supabase
              .from("market_stats_24h")
              .select("*");

            if (!statsError && statsData) {
              const stats = {};
              statsData.forEach(stat => {
                stats[stat.market_id] = {
                  volume: parseFloat(stat.volume_24h_usd || 0),
                  change: parseFloat(stat.change_24h_percent || 0)
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

      // Assemble prices from parallel results
      const prices = {};
      priceResults.forEach(result => {
        if (result) {
          prices[result.id] = {
            price: result.price,
            change24h: result.change24h,
            volume24h: 0,
          };
        }
      });

      const tradeHistoryVolumes = tradeHistoryResult || {};
      const indexerStats = indexerStatsResult || {};

      // Merge volume and stats into prices
      Object.keys(prices).forEach(key => {
        let vol = 0;

        // Use trade_history calculation
        if (tradeHistoryVolumes[key]) {
          vol = tradeHistoryVolumes[key];
        } else if (tradeHistoryVolumes[MARKETS_CONFIG.find(m => m.id === key)?.name]) {
          vol = tradeHistoryVolumes[MARKETS_CONFIG.find(m => m.id === key)?.name];
        }

        // Override with official Indexer stats if available (matches Ticker)
        const marketHash = MARKET_IDS[key];
        if (marketHash && indexerStats[marketHash]) {
          vol = indexerStats[marketHash].volume;
          if (indexerStats[marketHash].change !== undefined && indexerStats[marketHash].change !== null) {
            prices[key].change24h = indexerStats[marketHash].change;
          }
        }

        prices[key].volume24h = vol;
      });

      setMarketPrices(prices);
      setLoading(false);
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Filter markets
  const filteredMarkets = useMemo(() => {
    return MARKETS_CONFIG.filter((market) => {
      const matchesSearch =
        market.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        market.fullName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        activeCategory === "all" || market.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  // Calculate stats
  const stats = useMemo(() => {
    const pricesArray = Object.values(marketPrices);
    return {
      totalMarkets: MARKETS_CONFIG.length,
      avgChange:
        pricesArray.length > 0
          ? pricesArray.reduce((sum, p) => sum + (p.change24h || 0), 0) /
            pricesArray.length
          : 0,
      totalVolume: pricesArray.reduce((sum, p) => sum + (p.volume24h || 0), 0),
    };
  }, [marketPrices]);

  return (
    <PageTransition className="min-h-screen bg-[#0a0a0f] pt-16 pb-16 px-4 md:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto">

        {/* ─── Page Header ─── */}
        <div className="mb-10 pt-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] text-zinc-500 font-medium uppercase tracking-widest">Live Data</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold text-white tracking-tight">
            Markets
          </h1>
          <p className="text-zinc-400 mt-3 text-base md:text-lg max-w-xl leading-relaxed">
            Trade GPU compute futures on live perpetual markets. Real-time pricing aggregated from major cloud providers.
          </p>
        </div>

        {/* ─── Stats Row ─── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <StatsCard
            label="Active Markets"
            value={stats.totalMarkets}
            subValue="Perpetual contracts"
            accent="blue"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
              </svg>
            }
          />
          <StatsCard
            label="Avg. 24h Change"
            value={`${stats.avgChange >= 0 ? "+" : ""}${stats.avgChange.toFixed(2)}%`}
            subValue="Across all markets"
            accent="emerald"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22" />
              </svg>
            }
          />
          <StatsCard
            label="24h Volume"
            value={`$${stats.totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            subValue="Total trading volume"
            accent="purple"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        {/* ─── Search & Filters ─── */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 items-start md:items-center">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <HiMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search markets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
            />
          </div>

          {/* Category Pills */}
          <div className="flex items-center p-1 bg-white/[0.03] rounded-full border border-white/[0.06]">
            {Object.entries(MARKET_CATEGORIES).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`relative px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                  activeCategory === key
                    ? "text-white bg-white/[0.08] border border-white/[0.06]"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Market count */}
          <span className="text-[11px] text-zinc-600 font-mono ml-auto hidden md:block">
            {filteredMarkets.length} market{filteredMarkets.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* ─── Markets Grid ─── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/[0.04] bg-white/[0.01] p-6 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-zinc-800" />
                  <div>
                    <div className="w-16 h-3 bg-zinc-800 rounded mb-1.5" />
                    <div className="w-24 h-2 bg-zinc-800/60 rounded" />
                  </div>
                </div>
                <div className="w-20 h-6 bg-zinc-800 rounded mb-3" />
                <div className="w-16 h-4 bg-zinc-800/60 rounded" />
              </div>
            ))}
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
              <HiMagnifyingGlass className="w-7 h-7 text-zinc-600" />
            </div>
            <p className="text-zinc-400 text-lg font-medium">No markets found</p>
            <p className="text-zinc-600 text-sm mt-1">Try adjusting your search or filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMarkets.map((market, index) => (
              <MarketCard
                key={market.id}
                market={market}
                price={marketPrices[market.id]?.price}
                change24h={marketPrices[market.id]?.change24h}
                volume24h={marketPrices[market.id]?.volume24h}
                onClick={() => (window.location.href = `/trade?market=${market.id}`)}
                index={index}
              />
            ))}
          </div>
        )}
      </div>

      {/* Keyframes for card entrance animation */}
      <style>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </PageTransition>
  );
};

export default MarketsPage;
