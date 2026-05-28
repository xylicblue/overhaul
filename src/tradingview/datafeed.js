/**
 * TradingView Datafeed Implementation
 * Connects to Supabase vamm_price_history for historical and real-time data
 */

import { supabase } from "../creatclient";

// Configuration for the datafeed
const configurationData = {
  supported_resolutions: ["1", "5", "15", "30", "60", "240", "D", "W", "M"],
  exchanges: [
    {
      value: "ByteStrike",
      name: "ByteStrike",
      desc: "ByteStrike GPU Perpetuals",
    },
  ],
  symbols_types: [
    {
      name: "GPU Perpetual",
      value: "gpu",
    },
  ],
};

// Map of symbol names to their display info
const symbolsInfo = {
  "H100-PERP": {
    name: "H100-PERP",
    description: "NVIDIA H100 GPU Index Perpetual",
    type: "gpu",
    session: "24x7",
    timezone: "Etc/UTC",
    ticker: "H100-PERP",
    minmov: 1,
    pricescale: 100,
    has_intraday: true,
    has_weekly_and_monthly: true,
    supported_resolutions: configurationData.supported_resolutions,
    volume_precision: 2,
    data_status: "streaming",
  },
  "B200-PERP": {
    name: "B200-PERP",
    description: "NVIDIA B200 GPU Index Perpetual",
    type: "gpu",
    session: "24x7",
    timezone: "Etc/UTC",
    ticker: "B200-PERP",
    minmov: 1,
    pricescale: 100,
    has_intraday: true,
    has_weekly_and_monthly: true,
    supported_resolutions: configurationData.supported_resolutions,
    volume_precision: 2,
    data_status: "streaming",
  },
  "H200-PERP": {
    name: "H200-PERP",
    description: "NVIDIA H200 GPU Index Perpetual",
    type: "gpu",
    session: "24x7",
    timezone: "Etc/UTC",
    ticker: "H200-PERP",
    minmov: 1,
    pricescale: 100,
    has_intraday: true,
    has_weekly_and_monthly: true,
    supported_resolutions: configurationData.supported_resolutions,
    volume_precision: 2,
    data_status: "streaming",
  },
  "A100-PERP": {
    name: "A100-PERP",
    description: "NVIDIA A100 GPU Index Perpetual",
    type: "gpu",
    session: "24x7",
    timezone: "Etc/UTC",
    ticker: "A100-PERP",
    minmov: 1,
    pricescale: 100,
    has_intraday: true,
    has_weekly_and_monthly: true,
    supported_resolutions: configurationData.supported_resolutions,
    volume_precision: 2,
    data_status: "streaming",
  },
};

// Store active subscriptions
const subscriptions = new Map();

// Simple cache for historical data to avoid repeated queries
const dataCache = new Map();
const CACHE_TTL = 60000; // 1 minute cache TTL

// Maximum bars to fetch per request (optimization - keep low for fast initial load)
const MAX_BARS_PER_REQUEST = 500;

/**
 * Convert resolution string to interval in seconds
 */
function resolutionToSeconds(resolution) {
  const map = {
    "1": 60,
    "5": 5 * 60,
    "15": 15 * 60,
    "30": 30 * 60,
    "60": 60 * 60,
    "240": 4 * 60 * 60,
    D: 24 * 60 * 60,
    W: 7 * 24 * 60 * 60,
    M: 30 * 24 * 60 * 60,
  };
  return map[resolution] || 60 * 60;
}

/**
 * Convert raw price data to OHLCV bars
 */
function convertToBars(data, resolutionSeconds) {
  if (!data || data.length === 0) return [];

  const bars = [];
  let currentBar = null;
  const intervalMs = resolutionSeconds * 1000;

  for (const point of data) {
    const timestamp = new Date(point.timestamp).getTime();
    const price = parseFloat(point.price);
    const barTime = Math.floor(timestamp / intervalMs) * intervalMs;

    if (!currentBar || currentBar.time !== barTime) {
      if (currentBar) {
        bars.push(currentBar);
      }
      currentBar = {
        time: barTime,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: 1,
      };
    } else {
      currentBar.high = Math.max(currentBar.high, price);
      currentBar.low = Math.min(currentBar.low, price);
      currentBar.close = price;
      currentBar.volume += 1;
    }
  }

  if (currentBar) {
    bars.push(currentBar);
  }

  return bars;
}

/**
 * TradingView Datafeed Implementation
 */
export const Datafeed = {
  onReady: (callback) => {
    console.log("[Datafeed] onReady called");
    setTimeout(() => callback(configurationData), 0);
  },

  searchSymbols: (userInput, exchange, symbolType, onResultReadyCallback) => {
    console.log("[Datafeed] searchSymbols:", userInput);
    const symbols = Object.keys(symbolsInfo)
      .filter((symbol) => symbol.toLowerCase().includes(userInput.toLowerCase()))
      .map((symbol) => ({
        symbol: symbol,
        full_name: symbol,
        description: symbolsInfo[symbol].description,
        exchange: "ByteStrike",
        ticker: symbol,
        type: "gpu",
      }));
    onResultReadyCallback(symbols);
  },

  resolveSymbol: (symbolName, onSymbolResolvedCallback, onResolveErrorCallback) => {
    console.log("[Datafeed] resolveSymbol:", symbolName);

    // Try to find the symbol
    let symbolInfo = symbolsInfo[symbolName];

    // Handle case where symbol might have exchange prefix
    if (!symbolInfo) {
      const cleanSymbol = symbolName.split(":").pop();
      symbolInfo = symbolsInfo[cleanSymbol];
    }

    if (!symbolInfo) {
      console.error("[Datafeed] Symbol not found:", symbolName);
      onResolveErrorCallback("Symbol not found");
      return;
    }

    setTimeout(() => {
      onSymbolResolvedCallback({
        ...symbolInfo,
        exchange: "ByteStrike",
        listed_exchange: "ByteStrike",
      });
    }, 0);
  },

  getBars: async (
    symbolInfo,
    resolution,
    periodParams,
    onHistoryCallback,
    onErrorCallback
  ) => {
    const { from, to, firstDataRequest } = periodParams;
    
    // For first request, limit time range to recent data for faster loading
    // TradingView often requests years of data initially
    let actualFrom = from;
    if (firstDataRequest) {
      // Limit initial load to last 30 days max for speed
      const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
      actualFrom = Math.max(from, thirtyDaysAgo);
    }
    
    console.log("[Datafeed] getBars:", symbolInfo.name, resolution, new Date(actualFrom * 1000), new Date(to * 1000));

    // Create cache key
    const cacheKey = `${symbolInfo.name}_${resolution}_${actualFrom}_${to}`;
    const cachedEntry = dataCache.get(cacheKey);
    
    // Return cached data if valid
    if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL) {
      console.log("[Datafeed] Returning cached bars:", cachedEntry.bars.length);
      onHistoryCallback(cachedEntry.bars, { noData: cachedEntry.bars.length === 0 });
      return;
    }

    try {
      // Query Supabase for historical data
      let marketNames = [symbolInfo.name];
      
      // Allow fallback for H100-PERP to H100-GPU-PERP
      if (symbolInfo.name === "H100-PERP") {
        marketNames.push("H100-GPU-PERP");
      }

      let data = null;
      
      for (const marketName of marketNames) {
        // Only select necessary fields (not twap) for faster query
        const { data: queryData, error } = await supabase
          .from("vamm_price_history")
          .select("price, timestamp")
          .eq("market", marketName)
          .gte("timestamp", new Date(actualFrom * 1000).toISOString())
          .lte("timestamp", new Date(to * 1000).toISOString())
          .order("timestamp", { ascending: true })
          .limit(MAX_BARS_PER_REQUEST);

        if (!error && queryData && queryData.length > 0) {
          data = queryData;
          break;
        }
      }

      if (!data || data.length === 0) {
        console.log("[Datafeed] No data for interval");
        onHistoryCallback([], { noData: true });
        return;
      }

      const resolutionSeconds = resolutionToSeconds(resolution);
      const bars = convertToBars(data, resolutionSeconds);

      // Cache the result
      dataCache.set(cacheKey, { bars, timestamp: Date.now() });
      
      // Clean old cache entries (keep cache size manageable)
      if (dataCache.size > 50) {
        const oldestKey = dataCache.keys().next().value;
        dataCache.delete(oldestKey);
      }

      console.log("[Datafeed] Returning", bars.length, "bars");
      onHistoryCallback(bars, { noData: bars.length === 0 });
    } catch (error) {
      console.error("[Datafeed] getBars error:", error);
      onErrorCallback(error.message);
    }
  },

  subscribeBars: (
    symbolInfo,
    resolution,
    onRealtimeCallback,
    subscriberUID,
    onResetCacheNeededCallback
  ) => {
    console.log("[Datafeed] subscribeBars:", symbolInfo.name, subscriberUID);

    const resolutionSeconds = resolutionToSeconds(resolution);
    let lastBar = null;

    
    const channel = supabase
      .channel(`tv_${subscriberUID}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "vamm_price_history",
          filter: `market=eq.${symbolInfo.name}`,
        },
        (payload) => {
          const price = parseFloat(payload.new.price);
          const timestamp = new Date(payload.new.timestamp).getTime();
          const barTime = Math.floor(timestamp / (resolutionSeconds * 1000)) * (resolutionSeconds * 1000);

          if (!lastBar || lastBar.time < barTime) {
            
            lastBar = {
              time: barTime,
              open: price,
              high: price,
              low: price,
              close: price,
              volume: 1,
            };
          } else {
            
            lastBar.high = Math.max(lastBar.high, price);
            lastBar.low = Math.min(lastBar.low, price);
            lastBar.close = price;
            lastBar.volume += 1;
          }

          onRealtimeCallback(lastBar);
        }
      )
      .subscribe();

    
    if (symbolInfo.name === "H100-PERP") {
      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "vamm_price_history",
          filter: `market=eq.H100-GPU-PERP`,
        },
        (payload) => {
          const price = parseFloat(payload.new.price);
          const timestamp = new Date(payload.new.timestamp).getTime();
          const barTime = Math.floor(timestamp / (resolutionSeconds * 1000)) * (resolutionSeconds * 1000);

          if (!lastBar || lastBar.time < barTime) {
            lastBar = {
              time: barTime,
              open: price,
              high: price,
              low: price,
              close: price,
              volume: 1,
            };
          } else {
            lastBar.high = Math.max(lastBar.high, price);
            lastBar.low = Math.min(lastBar.low, price);
            lastBar.close = price;
            lastBar.volume += 1;
          }

          onRealtimeCallback(lastBar);
        }
      );
    }

    subscriptions.set(subscriberUID, channel);
  },

  unsubscribeBars: (subscriberUID) => {
    console.log("[Datafeed] unsubscribeBars:", subscriberUID);
    const channel = subscriptions.get(subscriberUID);
    if (channel) {
      channel.unsubscribe();
      subscriptions.delete(subscriberUID);
    }
  },
};

export default Datafeed;
