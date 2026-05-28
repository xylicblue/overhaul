import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "./creatclient";
import { MARKET_IDS } from "./contracts/addresses";
import PageTransition from "./components/PageTransition";
import { HiArrowTrendingUp, HiArrowTrendingDown, HiMagnifyingGlass } from "react-icons/hi2";

// Market categories
const MARKET_CATEGORIES = {
  all: "All Markets",
  gpu: "GPU Global Weighted Index",
  hyperscaler: "Hyperscaler only Index",
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

// Market Row Component
const MarketRow = ({ market, price, change24h, volume24h, onClick }) => {
  const isPositive = change24h >= 0;

  return (
    <tr
      onClick={onClick}
      className="hover:bg-zinc-800/50 cursor-pointer transition-colors border-b border-zinc-800/50 last:border-b-0"
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div>
            <div className="font-bold text-white">{market.name}</div>
            <div className="text-xs text-zinc-500">{market.fullName}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-right">
        <span className="font-mono font-bold text-white">
          ${price?.toFixed(2) || "—"}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <div
          className={`inline-flex items-center gap-1 font-mono font-bold ${
            isPositive ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {isPositive ? (
            <HiArrowTrendingUp className="w-4 h-4" />
          ) : (
            <HiArrowTrendingDown className="w-4 h-4" />
          )}
          {isPositive ? "+" : ""}
          {change24h?.toFixed(2) || "0.00"}%
        </div>
      </td>
      <td className="px-6 py-4 text-right">
        <span className="font-mono text-zinc-400">
          ${volume24h?.toLocaleString() || "—"}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <Link
          to={`/trade?market=${market.id}`}
          onClick={(e) => e.stopPropagation()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-all"
        >
          Trade
        </Link>
      </td>
    </tr>
  );
};

// Stats Card Component
const StatsCard = ({ label, value, subValue }) => (
  <div className="bg-[#0A0A0A]/50 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm">
    <div className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">
      {label}
    </div>
    <div className="text-2xl font-bold text-white font-mono">{value}</div>
    {subValue && <div className="text-xs text-zinc-500 mt-1">{subValue}</div>}
  </div>
);

// Main Markets Page
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
    <PageTransition className="min-h-screen bg-[#050505] pt-16 pb-12 px-4 md:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Markets
          </h1>
          <p className="text-zinc-400 mt-2">
            Trade GPU compute futures on perpetual markets
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatsCard
            label="Total Markets"
            value={stats.totalMarkets}
            subValue="Active perpetual contracts"
          />
          <StatsCard
            label="24h Change"
            value={`${stats.avgChange >= 0 ? "+" : ""}${stats.avgChange.toFixed(2)}%`}
            subValue="Average market movement"
          />
          <StatsCard
            label="24h Volume"
            value={`$${stats.totalVolume.toLocaleString()}`}
            subValue="Total trading volume"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search markets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors text-sm"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2">
            {Object.entries(MARKET_CATEGORIES).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeCategory === key
                    ? "bg-white/10 text-white border border-zinc-600"
                    : "bg-zinc-800/50 text-zinc-400 border border-transparent hover:text-white hover:bg-zinc-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Markets Table */}
        <div className="bg-[#0A0A0A]/50 border border-zinc-800 rounded-xl overflow-hidden backdrop-blur-sm">
          {loading ? (
            <div className="p-12 text-center text-zinc-500">
              <div className="animate-pulse">Loading markets...</div>
            </div>
          ) : filteredMarkets.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-zinc-500 text-lg">No markets found</div>
              <p className="text-zinc-600 text-sm mt-1">
                Try adjusting your search or filter
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/50">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Market
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      24h Change
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      24h Volume
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMarkets.map((market, index) => (
                    <MarketRow
                      key={market.id}
                      market={market}
                      price={marketPrices[market.id]?.price}
                      change24h={marketPrices[market.id]?.change24h}
                      volume24h={marketPrices[market.id]?.volume24h}
                      onClick={() =>
                        (window.location.href = `/trade?market=${market.id}`)
                      }
                      style={{
                        animation: `fadeSlideIn 0.3s ease-out ${index * 0.05}s both`,
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Section */}
        {/* <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#0A0A0A]/50 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-2">GPU Index Markets</h3>
            <p className="text-zinc-400 text-sm">
              Trade aggregated GPU compute pricing across multiple cloud providers.
              Our index prices are weighted by provider market share and revenue.
            </p>
          </div>
          <div className="bg-[#0A0A0A]/50 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-2">Hyperscaler Markets</h3>
            <p className="text-zinc-400 text-sm">
              Trade individual cloud provider pricing for NVIDIA GPUs.
              Perfect for hedging exposure to specific cloud platforms.
            </p>
          </div>
        </div> */}
      </div>
    </PageTransition>
  );
};

export default MarketsPage;
