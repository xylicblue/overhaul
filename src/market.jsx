import React, { useState, useMemo, useEffect, useRef } from "react";
import { useMarketsData } from "./marketData";
import { useMarket } from "./marketcontext";
import { Search } from "lucide-react";

const formatPrice = (price) =>
  price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatPercent = (percent) =>
  `${percent > 0 ? "+" : ""}${percent.toFixed(2)}%`;

export const Markets = () => {
  const { markets, isLoading, error } = useMarketsData();
  const [filter, setFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const { selectMarket, selectedMarket } = useMarket();
  const previousPricesRef = useRef({});
  const [priceChanges, setPriceChanges] = useState({});

  useEffect(() => {
    const changes = {};
    markets.forEach((market) => {
      const currentPrice = market.markPrice || market.oraclePrice;
      const previousPrice = previousPricesRef.current[market.name];

      if (previousPrice !== undefined && previousPrice !== currentPrice) {
        changes[market.name] = currentPrice > previousPrice ? "up" : "down";
        setTimeout(() => {
          setPriceChanges((prev) => {
            const updated = { ...prev };
            delete updated[market.name];
            return updated;
          });
        }, 1000);
      }
      previousPricesRef.current[market.name] = currentPrice;
    });

    if (Object.keys(changes).length > 0) {
      setPriceChanges((prev) => ({ ...prev, ...changes }));
    }
  }, [markets]);

  const filteredAndSearchedMarkets = useMemo(() => {
    return markets
      .filter((market) => {
        if (filter === "All") return true;
        return market.type === filter;
      })
      .filter((market) =>
        market.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [markets, filter, searchTerm]);

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-xs">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
        Loading...
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center h-full text-red-400 text-xs">
        Error loading markets
      </div>
    );

  return (
    <div className="flex flex-col h-full bg-slate-900/20">
      {/* Header */}
      <div className="p-2 border-b border-slate-800">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xs font-semibold text-white">Markets</h2>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full">
            {filteredAndSearchedMarkets.length}
          </span>
        </div>

        {/* Search Input */}
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-slate-500 w-3 h-3" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full bg-slate-950 border border-slate-800 rounded pl-7 pr-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors placeholder-slate-600"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-0.5 bg-slate-950 p-0.5 rounded">
          {["All", "Perpetual", "Future"].map((type) => (
            <button
              key={type}
              className={`flex-1 py-1 text-[10px] font-medium rounded transition-all ${
                filter === type
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-300"
              }`}
              onClick={() => setFilter(type)}
            >
              {type === "Perpetual" ? "Perps" : type === "Future" ? "Futures" : type}
            </button>
          ))}
        </div>
      </div>

      {/* Markets List - Compact Table */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-950/50 sticky top-0 z-10 text-[10px] text-slate-500 uppercase font-medium">
            <tr>
              <th className="px-3 py-2">Market</th>
              <th className="px-3 py-2 text-right">Price</th>
              <th className="px-3 py-2 text-right">24h</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/30">
            {filteredAndSearchedMarkets.map((market) => {
              const isSelected = selectedMarket?.name === market.name;
              const priceChange = priceChanges[market.name];
              const isPositive = market.change24h > 0;

              return (
                <tr
                  key={market.name}
                  className={`cursor-pointer transition-colors hover:bg-slate-800/30 ${
                    isSelected ? "bg-blue-500/5 border-l-2 border-l-blue-500" : "border-l-2 border-l-transparent"
                  }`}
                  onClick={() => selectMarket(market.name)}
                >
                  <td className="px-3 py-2">
                    <div className="flex flex-col">
                      <span className={`text-xs font-medium ${isSelected ? "text-blue-400" : "text-white"}`}>
                        {market.displayName || market.name}
                      </span>
                      <span className="text-[9px] text-slate-500">{market.type}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className={`font-mono text-xs font-medium transition-colors ${
                      priceChange === 'up' ? 'text-emerald-400' : priceChange === 'down' ? 'text-red-400' : 'text-slate-200'
                    }`}>
                      ${formatPrice(market.markPrice || market.oraclePrice)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className={`text-[10px] font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatPercent(market.change24h)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
