 /**
 * TradingView Datafeed Implementation
 * Connects to Supabase vamm_price_history for historical and real-time data
 */

import { supabase } from "../creatclient";
import { MARKETS } from "../contracts/addresses";

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

function buildSymbolInfo(symbol, description) {
  return {
    name: symbol,
    description,
    type: "gpu",
    session: "24x7",
    timezone: "Etc/UTC",
    ticker: symbol,
    minmov: 1,
    pricescale: 100,
    has_intraday: true,
    has_weekly_and_monthly: true,
    supported_resolutions: configurationData.supported_resolutions,
    volume_precision: 2,
    data_status: "streaming",
  };
}

// Map of symbol names to their display info, derived from deployed market config.
const symbolsInfo = Object.fromEntries(
  Object.values(MARKETS)
    .filter((market) => market.active)
    .map((market) => [
      market.name,
      buildSymbolInfo(market.name, market.fullName || `${market.displayName} Perpetual`),
    ])
);

// Store active subscriptions
const subscriptions = new Map();

// Simple cache for historical data to avoid repeated queries
const dataCache = new Map();
const CACHE_TTL = 60000; // 1 minute cache TTL

// Max points to pull per request. Supabase hard-caps un-limited responses at
// 1000 rows, so we fetch the most-recent 1000 (descending + limit) rather than
// an un-limited ascending query — otherwise high-volume markets return only the
// OLDEST 1000 rows and the chart looks flat/stale.
const MAX_BARS_PER_REQUEST = 1000;

function getMarketNamesForHistory(symbolName) {
  const names = new Set([symbolName]);
  const market = MARKETS[symbolName];
  if (market?.aliasFor) names.add(market.aliasFor);
  if (symbolName === "H100-PERP") names.add("H100-GPU-PERP");
  return Array.from(names);
}

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
    
    console.log("[Datafeed] getBars:", symbolInfo.name, resolution, new Date(from * 1000), new Date(to * 1000), firstDataRequest ? "(first)" : "");

    // Create cache key
    const cacheKey = `${symbolInfo.name}_${resolution}_${from}_${to}`;
    const cachedEntry = dataCache.get(cacheKey);
    
    // Return cached data if valid
    if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL) {
      console.log("[Datafeed] Returning cached bars:", cachedEntry.bars.length);
      onHistoryCallback(cachedEntry.bars, { noData: cachedEntry.bars.length === 0 });
      return;
    }

    try {
      // Build market names to query
      const marketNames = getMarketNamesForHistory(symbolInfo.name);
      const resolutionSeconds = resolutionToSeconds(resolution);

      // Preferred path: server-side OHLC candles (get_vamm_candles RPC). Postgres
      // aggregates to the requested resolution over the full window, so there is
      // no 1000-row cap. If the function isn't present (migration not run) or it
      // errors, we fall through to the raw-price path below — nothing breaks.
      try {
        const { data: candles, error: rpcErr } = await supabase.rpc("get_vamm_candles", {
          p_markets: marketNames,
          p_bucket_seconds: resolutionSeconds,
          p_from: firstDataRequest ? null : new Date(from * 1000).toISOString(),
          p_to: firstDataRequest ? null : new Date(to * 1000).toISOString(),
          p_max_bars: 1500,
        });
        if (!rpcErr && Array.isArray(candles) && candles.length > 0) {
          const bars = candles
            .map((c) => ({
              time: new Date(c.bucket_time).getTime(),
              open: Number(c.open),
              high: Number(c.high),
              low: Number(c.low),
              close: Number(c.close),
              volume: Number(c.volume),
            }))
            .sort((a, b) => a.time - b.time);
          dataCache.set(cacheKey, { bars, timestamp: Date.now() });
          if (dataCache.size > 50) dataCache.delete(dataCache.keys().next().value);
          console.log("[Datafeed] Returning", bars.length, "candle bars (rpc)");
          onHistoryCallback(bars, { noData: bars.length === 0 });
          return;
        }
      } catch (rpcError) {
        console.warn("[Datafeed] candle RPC unavailable, using raw fallback:", rpcError?.message);
      }

      // Fallback: fetch the MOST RECENT raw points (descending + explicit limit),
      // then reverse to ascending for bar conversion. An ascending/no-limit query
      // hits Supabase's 1000-row cap and returns the OLDEST rows on high-volume
      // markets (T4/A100 have 15k–20k rows), making the chart flat/stale.
      let query = supabase
        .from("vamm_price_history")
        .select("price, timestamp")
        .in("market", marketNames)
        .order("timestamp", { ascending: false })
        .limit(MAX_BARS_PER_REQUEST);

      if (!firstDataRequest) {
        query = query
          .gte("timestamp", new Date(from * 1000).toISOString())
          .lte("timestamp", new Date(to * 1000).toISOString());
      }

      const { data: rows, error } = await query;
      const data = (rows || []).slice().reverse(); // oldest → newest for convertToBars

      if (error) {
        console.error("[Datafeed] Query error:", error);
        onErrorCallback(error.message);
        return;
      }

      if (!data || data.length === 0) {
        console.log("[Datafeed] No data for interval");
        onHistoryCallback([], { noData: true });
        return;
      }

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

    
    const channel = supabase.channel(`tv_${subscriberUID}`);

    for (const marketName of getMarketNamesForHistory(symbolInfo.name)) {
      channel.on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "vamm_price_history",
            filter: `market=eq.${marketName}`,
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

    channel.subscribe();

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
