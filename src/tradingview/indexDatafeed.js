/**
 * TradingView Index Price Datafeed Implementation
 * Connects to multiple Supabase tables for index price data
 */

import { supabase } from "../creatclient";

// Configuration for the datafeed
const configurationData = {
  supported_resolutions: ["1", "5", "15", "30", "60", "240", "D", "W", "M"],
  exchanges: [
    {
      value: "ByteStrike",
      name: "ByteStrike",
      desc: "ByteStrike GPU Index",
    },
  ],
  symbols_types: [
    {
      name: "GPU Index",
      value: "index",
    },
  ],
};

// Market configuration for index prices - maps to correct tables and fields
const marketConfig = {
  // Main GPU indices
  "H100-PERP": {
    displayName: "H100 GPU Index",
    tableName: "price_data",
    priceField: "price",
  },
  "B200-PERP": {
    displayName: "B200 GPU Index",
    tableName: "b200_index_prices",
    priceField: "index_price",
  },
  "H200-PERP": {
    displayName: "H200 GPU Index",
    tableName: "h200_index_prices",
    priceField: "index_price",
  },
  "A100-PERP": {
    displayName: "A100 GPU Index",
    tableName: "a100_index_prices",
    priceField: "index_price",
    timestampField: "recorded_at",
  },
  "T4-PERP": {
    displayName: "T4 GPU Index",
    tableName: "t4_index_prices",
    priceField: "index_price",
  },
  "H100-non-HyperScalers-PERP": {
    displayName: "Neocloud Index",
    tableName: "h100_non_hyperscalers_perp_prices",
    priceField: "price",
  },
  
  // Provider-specific B200 markets
  "ORACLE-B200-PERP": {
    displayName: "Oracle B200 Index",
    tableName: "b200_provider_prices",
    priceField: "effective_price",
    providerFilter: "Oracle",
  },
  "AWS-B200-PERP": {
    displayName: "AWS B200 Index",
    tableName: "b200_provider_prices",
    priceField: "effective_price",
    providerFilter: "AWS",
  },
  "COREWEAVE-B200-PERP": {
    displayName: "CoreWeave B200 Index",
    tableName: "b200_provider_prices",
    priceField: "effective_price",
    providerFilter: "CoreWeave",
  },
  "GCP-B200-PERP": {
    displayName: "GCP B200 Index",
    tableName: "b200_provider_prices",
    priceField: "effective_price",
    providerFilter: "Google Cloud",
  },
  
  // Provider-specific H200 markets
  "ORACLE-H200-PERP": {
    displayName: "Oracle H200 Index",
    tableName: "h200_provider_prices",
    priceField: "effective_price",
    providerFilter: "Oracle",
  },
  "AWS-H200-PERP": {
    displayName: "AWS H200 Index",
    tableName: "h200_provider_prices",
    priceField: "effective_price",
    providerFilter: "AWS",
  },
  "COREWEAVE-H200-PERP": {
    displayName: "CoreWeave H200 Index",
    tableName: "h200_provider_prices",
    priceField: "effective_price",
    providerFilter: "CoreWeave",
  },
  "GCP-H200-PERP": {
    displayName: "GCP H200 Index",
    tableName: "h200_provider_prices",
    priceField: "effective_price",
    providerFilter: "Google Cloud",
  },
  "AZURE-H200-PERP": {
    displayName: "Azure H200 Index",
    tableName: "h200_provider_prices",
    priceField: "effective_price",
    providerFilter: "Azure",
  },
  
  // Provider-specific H100 markets
  "AWS-H100-PERP": {
    displayName: "AWS H100 Index",
    tableName: "h100_hyperscaler_prices",
    priceField: "effective_price",
    providerFilter: "Amazon Web Services",
  },
  "AZURE-H100-PERP": {
    displayName: "Azure H100 Index",
    tableName: "h100_hyperscaler_prices",
    priceField: "effective_price",
    providerFilter: "Microsoft Azure",
  },
  "GCP-H100-PERP": {
    displayName: "GCP H100 Index",
    tableName: "h100_hyperscaler_prices",
    priceField: "effective_price",
    providerFilter: "Google Cloud",
  },
};

// Map of symbol names to their display info
function getSymbolInfo(symbolName) {
  const config = marketConfig[symbolName] || {
    displayName: symbolName,
    tableName: "price_data",
    priceField: "price",
  };

  return {
    name: symbolName,
    description: config.displayName,
    type: "index",
    session: "24x7",
    timezone: "Etc/UTC",
    ticker: symbolName,
    minmov: 1,
    pricescale: 100,
    has_intraday: true,
    has_weekly_and_monthly: true,
    supported_resolutions: configurationData.supported_resolutions,
    volume_precision: 2,
    data_status: "streaming",
    _config: config, // Store config for later use
  };
}

// Store active subscriptions
const subscriptions = new Map();

// Preload cache - stores all raw data for each symbol (full dataset)
const preloadCache = new Map();
const PRELOAD_TTL = 300000; // 5 minutes - longer TTL since this is full data

// Simple cache for processed bars (by resolution)
const barsCache = new Map();
const BARS_CACHE_TTL = 60000; // 1 minute for processed bars

// Maximum bars to return per request
const MAX_BARS_PER_REQUEST = 500;

/**
 * Preload all data for a symbol (runs once, cached for 5 minutes)
 */
async function preloadSymbolData(symbolName, config) {
  const cached = preloadCache.get(symbolName);
  if (cached && Date.now() - cached.timestamp < PRELOAD_TTL) {
    return cached.data;
  }

  console.log("[IndexDatafeed] Preloading data for:", symbolName);
  const timestampField = config.timestampField || "timestamp";
  
  // Fetch ALL available data (no time filter - let database return everything)
  let query = supabase
    .from(config.tableName)
    .select(`${config.priceField}, ${timestampField}`)
    .order(timestampField, { ascending: true });
  
  if (config.providerFilter) {
    query = query.eq("provider_name", config.providerFilter);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error("[IndexDatafeed] Preload error:", error);
    return null;
  }
  
  // Store in preload cache
  preloadCache.set(symbolName, { data, timestamp: Date.now() });
  console.log("[IndexDatafeed] Preloaded", data?.length || 0, "records for", symbolName);
  
  return data;
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
function convertToBars(data, resolutionSeconds, priceField = "price", timestampField = "timestamp") {
  if (!data || data.length === 0) return [];

  const bars = [];
  let currentBar = null;
  const intervalMs = resolutionSeconds * 1000;

  for (const point of data) {
    const timestamp = new Date(point[timestampField] || point.timestamp).getTime();
    const price = parseFloat(point[priceField] || point.price);
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
 * TradingView Index Price Datafeed Implementation
 */
export const IndexDatafeed = {
  onReady: (callback) => {
    console.log("[IndexDatafeed] onReady called");
    setTimeout(() => callback(configurationData), 0);
  },

  searchSymbols: (userInput, exchange, symbolType, onResultReadyCallback) => {
    console.log("[IndexDatafeed] searchSymbols:", userInput);
    const symbols = Object.keys(marketConfig)
      .filter((symbol) => symbol.toLowerCase().includes(userInput.toLowerCase()))
      .map((symbol) => ({
        symbol: symbol,
        full_name: symbol,
        description: marketConfig[symbol].displayName,
        exchange: "ByteStrike",
        ticker: symbol,
        type: "index",
      }));
    onResultReadyCallback(symbols);
  },

  resolveSymbol: (symbolName, onSymbolResolvedCallback, onResolveErrorCallback) => {
    console.log("[IndexDatafeed] resolveSymbol:", symbolName);

    // Handle case where symbol might have exchange prefix
    const cleanSymbol = symbolName.includes(":") ? symbolName.split(":").pop() : symbolName;
    
    const symbolInfo = getSymbolInfo(cleanSymbol);

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
    
    // Always lookup config from marketConfig using symbol name to ensure correct table
    const symbolName = symbolInfo.name || symbolInfo.ticker;
    const config = marketConfig[symbolName] || {
      tableName: "price_data",
      priceField: "price",
    };
    
    const timestampField = config.timestampField || "timestamp";
    console.log("[IndexDatafeed] getBars:", symbolName, resolution, firstDataRequest ? "(first request)" : "");

    // Check bars cache first (processed bars by resolution)
    const barsCacheKey = `${symbolName}_${resolution}`;
    const cachedBars = barsCache.get(barsCacheKey);
    
    if (cachedBars && Date.now() - cachedBars.timestamp < BARS_CACHE_TTL) {
      // For first request, return all bars up to 'to' time to fill chart from left
      // For subsequent requests, filter by requested range
      let filteredBars;
      if (firstDataRequest) {
        filteredBars = cachedBars.bars.filter(bar => bar.time <= to * 1000).slice(-MAX_BARS_PER_REQUEST);
      } else {
        filteredBars = cachedBars.bars.filter(bar => 
          bar.time >= from * 1000 && bar.time <= to * 1000
        ).slice(-MAX_BARS_PER_REQUEST);
      }
      
      console.log("[IndexDatafeed] Returning", filteredBars.length, "cached bars");
      onHistoryCallback(filteredBars, { noData: filteredBars.length === 0 });
      return;
    }

    try {
      // Use preloaded data (fetches once, cached for 5 minutes)
      const rawData = await preloadSymbolData(symbolName, config);
      
      if (!rawData || rawData.length === 0) {
        console.log("[IndexDatafeed] No preloaded data for", symbolName);
        onHistoryCallback([], { noData: true });
        return;
      }

      // Convert all data to bars for this resolution
      const resolutionSeconds = resolutionToSeconds(resolution);
      const allBars = convertToBars(rawData, resolutionSeconds, config.priceField, timestampField);
      
      // Cache all bars for this resolution
      barsCache.set(barsCacheKey, { bars: allBars, timestamp: Date.now() });
      
      // For first request, return all bars up to 'to' time to fill chart from left
      let filteredBars;
      if (firstDataRequest) {
        filteredBars = allBars.filter(bar => bar.time <= to * 1000).slice(-MAX_BARS_PER_REQUEST);
      } else {
        filteredBars = allBars.filter(bar => 
          bar.time >= from * 1000 && bar.time <= to * 1000
        ).slice(-MAX_BARS_PER_REQUEST);
      }

      console.log("[IndexDatafeed] Returning", filteredBars.length, "bars (from", allBars.length, "total)");
      onHistoryCallback(filteredBars, { noData: filteredBars.length === 0 });
    } catch (error) {
      console.error("[IndexDatafeed] getBars error:", error);
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
    // Always lookup config from marketConfig using symbol name to ensure correct table
    const symbolName = symbolInfo.name || symbolInfo.ticker;
    const config = marketConfig[symbolName] || {
      tableName: "price_data",
      priceField: "price",
    };
    
    // Use configurable timestamp field (default to "timestamp")
    const timestampField = config.timestampField || "timestamp";
    
    console.log("[IndexDatafeed] subscribeBars:", symbolName, "table:", config.tableName, subscriberUID);

    const resolutionSeconds = resolutionToSeconds(resolution);
    let lastBar = null;

    // Subscribe to Supabase realtime
    const channel = supabase
      .channel(`tv_index_${subscriberUID}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: config.tableName,
        },
        (payload) => {
          const price = parseFloat(payload.new[config.priceField] || payload.new.price);
          const timestamp = new Date(payload.new[timestampField] || payload.new.timestamp).getTime();
          const barTime = Math.floor(timestamp / (resolutionSeconds * 1000)) * (resolutionSeconds * 1000);

          if (!lastBar || lastBar.time < barTime) {
            // New bar
            lastBar = {
              time: barTime,
              open: price,
              high: price,
              low: price,
              close: price,
              volume: 1,
            };
          } else {
            // Update existing bar
            lastBar.high = Math.max(lastBar.high, price);
            lastBar.low = Math.min(lastBar.low, price);
            lastBar.close = price;
            lastBar.volume += 1;
          }

          onRealtimeCallback(lastBar);
        }
      )
      .subscribe();

    subscriptions.set(subscriberUID, channel);
  },

  unsubscribeBars: (subscriberUID) => {
    console.log("[IndexDatafeed] unsubscribeBars:", subscriberUID);
    const channel = subscriptions.get(subscriberUID);
    if (channel) {
      channel.unsubscribe();
      subscriptions.delete(subscriberUID);
    }
  },
};

export default IndexDatafeed;
