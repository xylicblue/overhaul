import { useState, useEffect } from "react";
import { useMarkPrice, useTWAP, useFundingRate } from "./hooks/useVAMM";
import { useOraclePrice } from "./hooks/useOracle";
import {
  SEPOLIA_CONTRACTS,
  MARKET_IDS,
  DEFAULT_MARKET_ID,
} from "./contracts/addresses";
import { get24hStats } from "./services/eventIndexer";

// GPU Compute Futures markets deployed on Sepolia testnet
// Traders speculate on H100 GPU hourly rental prices ($/hour)
const DEPLOYED_MARKETS = [
  {
    name: "H100-PERP",
    displayName: "H100 GPU",
    fullName: "H100 GPU Hourly Rate Perpetual",
    type: "Perpetual",
    baseAsset: "GPU-HOURS", // What you're trading: GPU compute hours
    quoteAsset: "USDC", // What you pay with: Stablecoin
    vammAddress: SEPOLIA_CONTRACTS.vammProxy, // vAMM with $3.79/hour oracle
    marketId: MARKET_IDS["H100-PERP"],
    status: "Active",
    isDefault: true,
    description:
      "Trade the price of H100 GPU hourly rental rates (all providers). Index price: $3.79/hour from real-time market oracles.",
  },
  {
    name: "H100-HyperScalers-PERP",
    displayName: "H100 HyperScalers",
    fullName: "H100 HyperScalers GPU Hourly Rate Perpetual",
    type: "Perpetual",
    baseAsset: "GPU-HOURS",
    quoteAsset: "USDC",
    vammAddress: SEPOLIA_CONTRACTS.vammProxyHyperscalers, // vAMM with $4.20/hour oracle
    marketId: MARKET_IDS["H100-HyperScalers-PERP"],
    status: "Active",
    isDefault: false,
    description:
      "Trade H100 GPU hourly rental rates from HyperScalers (AWS, GCP, Azure). Index price: $4.20/hour.",
  },
  {
    name: "H100-non-HyperScalers-PERP",
    displayName: "H100 non-HyperScalers",
    fullName: "H100 non-HyperScalers GPU Hourly Rate Perpetual",
    type: "Perpetual",
    baseAsset: "GPU-HOURS",
    quoteAsset: "USDC",
    vammAddress: SEPOLIA_CONTRACTS.vammProxyNonHyperscalers, // vAMM with $2.95/hour oracle
    marketId: MARKET_IDS["H100-non-HyperScalers-PERP"],
    status: "Active",
    isDefault: false,
    description:
      "Trade H100 GPU hourly rental rates from non-HyperScalers (Lambda, CoreWeave, etc.). Index price: $2.95/hour.",
  },
  {
    name: "ETH-PERP-V2",
    displayName: "H100 GPU (Alias)",
    fullName: "H100 GPU Hourly Rate Perpetual",
    type: "Perpetual",
    baseAsset: "GPU-HOURS",
    quoteAsset: "USDC",
    vammAddress: SEPOLIA_CONTRACTS.vammProxy,
    marketId: MARKET_IDS["ETH-PERP-V2"], // Alias for H100-PERP
    status: "Active",
    isDefault: false,
    description:
      "Alias for H100-PERP market.",
  },
  {
    name: "ETH-PERP",
    displayName: "Test Market [DEPRECATED]",
    fullName: "Test Market (Deprecated)",
    type: "Perpetual",
    baseAsset: "ETH",
    quoteAsset: "USDC",
    vammAddress: SEPOLIA_CONTRACTS.vammProxyOld, // Old vAMM
    marketId: MARKET_IDS["ETH-PERP"],
    status: "Deprecated",
    isDefault: false,
    description: "Deprecated test market",
  },
];

/**
 * Hook to get real-time market data from deployed vAMM contracts
 */
export const useMarketsData = () => {
  const [data, setData] = useState({
    markets: [],
    isLoading: true,
    error: null,
  });

  // Fetch mark prices from all active vAMMs (updates every 5s)
  const {
    price: markPriceH100,
    isLoading: priceLoadingH100,
    error: errorH100,
  } = useMarkPrice(SEPOLIA_CONTRACTS.vammProxy, 5000);

  const {
    price: markPriceHyperscalers,
    isLoading: priceLoadingHyperscalers,
    error: errorHyperscalers,
  } = useMarkPrice(SEPOLIA_CONTRACTS.vammProxyHyperscalers, 5000);

  const {
    price: markPriceNonHyperscalers,
    isLoading: priceLoadingNonHyperscalers,
    error: errorNonHyperscalers,
  } = useMarkPrice(SEPOLIA_CONTRACTS.vammProxyNonHyperscalers, 5000);

  // Fetch mark price from old vAMM (deprecated)
  const {
    price: markPriceOld,
    isLoading: priceLoadingOld,
    error: errorOld,
  } = useMarkPrice(SEPOLIA_CONTRACTS.vammProxyOld, 5000);

  useEffect(() => {
    // Log for debugging
    console.log("useMarketsData:", {
      h100: { markPriceH100, priceLoadingH100, errorH100 },
      hyperscalers: { markPriceHyperscalers, priceLoadingHyperscalers, errorHyperscalers },
      nonHyperscalers: { markPriceNonHyperscalers, priceLoadingNonHyperscalers, errorNonHyperscalers },
      old: { markPriceOld, priceLoadingOld, errorOld },
    });

    if (!priceLoadingH100 && !priceLoadingHyperscalers && !priceLoadingNonHyperscalers && !priceLoadingOld) {
      const markets = [];

      // Add H100-PERP market (all providers)
      if (markPriceH100 && !errorH100) {
        markets.push({
          name: "H100-PERP",
          displayName: "H100 GPU",
          fullName: "H100 GPU Hourly Rate",
          type: "Perpetual",
          markPrice: parseFloat(markPriceH100),
          change24h: 0, // TODO: Calculate from historical data or events
          vammAddress: SEPOLIA_CONTRACTS.vammProxy,
          marketId: MARKET_IDS["H100-PERP"],
          status: "Active",
        });
      }

      // Add H100-HyperScalers-PERP market
      if (markPriceHyperscalers && !errorHyperscalers) {
        markets.push({
          name: "H100-HyperScalers-PERP",
          displayName: "H100 HyperScalers",
          fullName: "H100 HyperScalers GPU Hourly Rate",
          type: "Perpetual",
          markPrice: parseFloat(markPriceHyperscalers),
          change24h: 0,
          vammAddress: SEPOLIA_CONTRACTS.vammProxyHyperscalers,
          marketId: MARKET_IDS["H100-HyperScalers-PERP"],
          status: "Active",
        });
      }

      // Add H100-non-HyperScalers-PERP market
      if (markPriceNonHyperscalers && !errorNonHyperscalers) {
        markets.push({
          name: "H100-non-HyperScalers-PERP",
          displayName: "H100 non-HyperScalers",
          fullName: "H100 non-HyperScalers GPU Hourly Rate",
          type: "Perpetual",
          markPrice: parseFloat(markPriceNonHyperscalers),
          change24h: 0,
          vammAddress: SEPOLIA_CONTRACTS.vammProxyNonHyperscalers,
          marketId: MARKET_IDS["H100-non-HyperScalers-PERP"],
          status: "Active",
        });
      }

      // Add deprecated market
      if (markPriceOld && !errorOld) {
        markets.push({
          name: "ETH-PERP",
          displayName: "Test Market [OLD]",
          fullName: "Test Market (Deprecated)",
          type: "Perpetual",
          markPrice: parseFloat(markPriceOld),
          change24h: 0,
          vammAddress: SEPOLIA_CONTRACTS.vammProxyOld,
          marketId: MARKET_IDS["ETH-PERP"],
          status: "Deprecated",
        });
      }

      if (markets.length > 0) {
        setData({ markets, isLoading: false, error: null });
      } else {
        const error = errorH100 || errorHyperscalers || errorNonHyperscalers || errorOld || "No markets available";
        setData({ markets: [], isLoading: false, error });
      }
    }
  }, [
    markPriceH100,
    markPriceHyperscalers,
    markPriceNonHyperscalers,
    markPriceOld,
    priceLoadingH100,
    priceLoadingHyperscalers,
    priceLoadingNonHyperscalers,
    priceLoadingOld,
    errorH100,
    errorHyperscalers,
    errorNonHyperscalers,
    errorOld,
  ]);

  return data;
};

/**
 * Get detailed market data for a specific market
 * Fetches real-time data from vAMM contract
 */
export const getMarketDetails = (marketName) => {
  const market = DEPLOYED_MARKETS.find((m) => m.name === marketName);

  if (!market) {
    return null;
  }

  return {
    name: market.name,
    displayName: market.displayName,
    type: market.type,
    baseAsset: market.baseAsset,
    quoteAsset: market.quoteAsset,
    status: market.status,
    vammAddress: market.vammAddress,
    marketId: market.marketId,
    isDefault: market.isDefault,
    // Note: These will be fetched by components using hooks
    // We return a structure but components should use useMarketRealTimeData
  };
};

/**
 * Hook to get real-time market details with all live data
 * Use this in components that need live prices, funding rates, etc.
 */
export const useMarketRealTimeData = (marketName) => {
  const [data, setData] = useState(null);
  const [stats24h, setStats24h] = useState(null);

  // Find the market config
  const market = DEPLOYED_MARKETS.find((m) => m.name === marketName);

  if (!market) {
    return { data: null, isLoading: false, error: "Market not found" };
  }

  const vammAddress = market.vammAddress;

  // Fetch real-time data from vAMM
  const { price: markPrice, isLoading: priceLoading } = useMarkPrice(
    vammAddress,
    5000
  );
  const { twap, isLoading: twapLoading } = useTWAP(vammAddress, 900); // 15 min TWAP
  const { cumulativeFunding, lastFundingTime } = useFundingRate(vammAddress);

  // Also fetch Oracle price to calculate funding rate premium
  const { price: oraclePrice, isLoading: oracleLoading } = useOraclePrice(
    SEPOLIA_CONTRACTS.oracle,
    10000
  );

  // Fetch 24h stats from Supabase
  useEffect(() => {
    const fetch24hStats = async () => {
      try {
        const stats = await get24hStats(market.marketId);
        setStats24h(stats);
      } catch (error) {
        console.error('Error fetching 24h stats:', error);
      }
    };

    fetch24hStats();

    // Refresh stats every 30 seconds
    const interval = setInterval(fetch24hStats, 30000);
    return () => clearInterval(interval);
  }, [market.marketId]);

  useEffect(() => {
    // Debug logging
    console.log("useMarketRealTimeData for", marketName, {
      markPrice,
      twap,
      oraclePrice,
      stats24h,
      priceLoading,
      twapLoading,
      oracleLoading,
    });

    // Update data as soon as we have at least mark price
    // Other values will use fallbacks until they load
    if (!priceLoading && markPrice) {
      const markPriceNum = parseFloat(markPrice);

      // Use fallbacks for values that might still be loading
      const twapNum = twap ? parseFloat(twap) : markPriceNum;
      const oraclePriceNum = oraclePrice
        ? parseFloat(oraclePrice)
        : markPriceNum;

      // Calculate funding rate as: (Mark Price - Index Price) / Index Price
      // This is the "premium" that determines funding payments
      const premium = ((markPriceNum - oraclePriceNum) / oraclePriceNum) * 100;

      // Annualized funding rate (assuming 8 hour funding periods, 3x per day)
      const fundingRateAnnualized = premium * 3 * 365;

      // Current premium (for next funding payment)
      const fundingRatePercent = premium.toFixed(4);
      const fundingRateDisplay =
        premium >= 0 ? `+${fundingRatePercent}%` : `${fundingRatePercent}%`;

      // Format prices for display
      const markPriceFormatted = markPriceNum.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      const twapFormatted = twapNum.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      // Use REAL 24h data from Supabase if available, otherwise show placeholder
      let change24hDisplay, change24hValue, volume24hDisplay;

      if (stats24h && stats24h.change_24h_percent !== null) {
        // Real data from indexed events
        change24hValue = parseFloat(stats24h.change_24h_percent);
        change24hDisplay = change24hValue.toFixed(2) + "%";
        volume24hDisplay = "$" + parseFloat(stats24h.volume_24h_usd).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      } else {
        // Placeholder until indexer is deployed
        change24hValue = ((markPriceNum - twapNum) / twapNum) * 100;
        change24hDisplay = "~" + change24hValue.toFixed(2) + "%";
        volume24hDisplay = "$100.00"; // Placeholder value
      }

      setData({
        name: market.name,
        displayName: market.displayName,
        type: market.type,
        baseAsset: market.baseAsset,
        quoteAsset: market.quoteAsset,
        status: market.status,
        marketId: market.marketId,
        // Raw values
        markPriceRaw: markPriceNum,
        twapRaw: twapNum,
        oraclePriceRaw: oraclePriceNum,
        fundingRateRaw: premium / 100, // As decimal
        // Formatted for display
        price: markPriceFormatted,
        indexPrice: oraclePriceNum.toFixed(2), // Oracle/Index price
        vammPrice: twapFormatted,
        fundingRate: fundingRateDisplay,
        fundingRateAnnualized: fundingRateAnnualized.toFixed(2) + "% APR",
        change24h: change24hDisplay,
        change24hValue: change24hValue,
        volume24h: volume24hDisplay,
        // Additional 24h stats from Supabase
        high24h: stats24h?.high_24h ? "$" + parseFloat(stats24h.high_24h).toFixed(2) : "N/A",
        low24h: stats24h?.low_24h ? "$" + parseFloat(stats24h.low_24h).toFixed(2) : "N/A",
        trades24h: stats24h?.trades_24h || 0,
        openInterest: "~" + (Math.random() * 100).toFixed(2) + " ETH", // Still mock - needs separate tracking
        lastFundingTime: lastFundingTime,
        // Helper info
        premium: premium.toFixed(6) + "%",
        premiumRaw: premium,
        // Loading states for individual values
        isPriceLoaded: !priceLoading,
        isTwapLoaded: !twapLoading,
        isOracleLoaded: !oracleLoading,
        is24hStatsLoaded: stats24h !== null,
      });
    }
  }, [
    markPrice,
    twap,
    oraclePrice,
    cumulativeFunding,
    lastFundingTime,
    priceLoading,
    twapLoading,
    oracleLoading,
    stats24h,
    market,
    marketName,
  ]);

  return {
    data,
    // Only show loading if we don't have data yet (mark price hasn't loaded)
    // Once we have data, show it even if TWAP/Oracle are still loading
    isLoading: priceLoading || !data,
    error: null,
  };
};
