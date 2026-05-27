import { useEffect, useMemo, useState } from "react";
import { formatUnits } from "ethers";
import { useReadContracts } from "wagmi";
import { useMarkPrice, useFundingRate } from "./hooks/useVAMM";
import { useOraclePrice } from "./hooks/useOracle";
import { useMarketOpenInterest, useMarketsOpenInterest } from "./hooks/useOpenInterest";
import { useRegistryMarket, useRegistryMarkets } from "./hooks/useRegistryMarkets";
import { DEFAULT_MARKET_KEY, getActiveMarkets, getMarketByName } from "./contracts/addresses";
import { getMarketStat24h } from "./services/api";
import VAMMABI from "./contracts/abis/vAMM.json";

const SEPOLIA_CHAIN_ID = 11155111;
const ORACLE_ABI = [
  {
    inputs: [],
    name: "getPrice",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "cuOracle",
    outputs: [{ internalType: "contract CuOracle", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "assetId",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
];
const CU_ORACLE_ABI = [
  {
    inputs: [{ internalType: "bytes32", name: "_assetId", type: "bytes32" }],
    name: "getLatestPrice",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "price", type: "uint256" },
          { internalType: "uint256", name: "lastUpdatedAt", type: "uint256" },
        ],
        internalType: "struct CuOracle.PriceData",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const DEPLOYED_MARKETS = getActiveMarkets().map((market) => ({
  name: market.name,
  displayName: market.displayName,
  fullName: market.fullName,
  type: market.type,
  baseAsset: market.baseAsset,
  quoteAsset: market.quoteAsset,
  vammAddress: market.vamm,
  oracleAddress: market.oracle,
  marketId: market.id,
  status: market.status,
  isDefault: market.name === DEFAULT_MARKET_KEY,
  description: market.description,
}));
const NO_OPEN_INTEREST_MARKETS = [];

function formatPrice(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatUsd(value) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function emptyMarket(market, markPrice = 0, oraclePrice = 0, stats = null, directOpenInterestUsd = null) {
  const change24hValue = stats?.change_24h_percent != null
    ? Number(stats.change_24h_percent)
    : 0;
  const openInterestUsd = directOpenInterestUsd ?? stats?.open_interest_usd;
  return {
    name: market.name,
    displayName: market.displayName,
    fullName: market.fullName,
    type: market.type,
    baseAsset: market.baseAsset,
    quoteAsset: market.quoteAsset,
    status: market.status,
    vammAddress: market.vammAddress,
    marketId: market.marketId,
    markPrice,
    markPriceRaw: markPrice,
    oraclePriceRaw: oraclePrice || null,
    price: formatPrice(markPrice),
    indexPrice: oraclePrice > 0 ? formatPrice(oraclePrice) : "N/A",
    change24h: `${change24hValue.toFixed(2)}%`,
    change24hValue,
    volume24h: stats?.volume_24h_usd
      ? `$${Number(stats.volume_24h_usd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : "$0.00",
    openInterest: formatUsd(openInterestUsd),
  };
}

export const useMarketsData = ({ includeOpenInterest = true } = {}) => {
  const [statsByMarket, setStatsByMarket] = useState({});
  const {
    markets: registryMarkets,
    isLoading: isRegistryLoading,
    error: registryError,
  } = useRegistryMarkets(DEPLOYED_MARKETS);
  const { openInterestByMarket } = useMarketsOpenInterest(
    includeOpenInterest ? registryMarkets : NO_OPEN_INTEREST_MARKETS
  );

  const contracts = useMemo(
    () => registryMarkets.flatMap((market) => ([
      {
        address: market.vammAddress,
        abi: VAMMABI.abi,
        functionName: "getMarkPrice",
        chainId: SEPOLIA_CHAIN_ID,
      },
      {
        address: market.oracleAddress,
        abi: ORACLE_ABI,
        functionName: "getPrice",
        chainId: SEPOLIA_CHAIN_ID,
      },
      {
        address: market.oracleAddress,
        abi: ORACLE_ABI,
        functionName: "cuOracle",
        chainId: SEPOLIA_CHAIN_ID,
      },
      {
        address: market.oracleAddress,
        abi: ORACLE_ABI,
        functionName: "assetId",
        chainId: SEPOLIA_CHAIN_ID,
      },
    ])),
    [registryMarkets]
  );

  const { data, isLoading, error } = useReadContracts({
    contracts,
    query: {
      refetchInterval: 5000,
    },
  });

  const latestOracleContracts = useMemo(() => {
    if (!data) return [];
    return registryMarkets.map((market, index) => {
      const cuOracleResult = data[index * 4 + 2];
      const assetIdResult = data[index * 4 + 3];
      if (cuOracleResult?.status !== "success" || assetIdResult?.status !== "success") {
        return null;
      }
      return {
        address: cuOracleResult.result,
        abi: CU_ORACLE_ABI,
        functionName: "getLatestPrice",
        args: [assetIdResult.result],
        chainId: SEPOLIA_CHAIN_ID,
      };
    }).filter(Boolean);
  }, [data, registryMarkets]);

  const { data: latestOracleData } = useReadContracts({
    contracts: latestOracleContracts,
    query: {
      enabled: latestOracleContracts.length > 0,
      refetchInterval: 5000,
    },
  });

  const latestOracleByMarket = useMemo(() => {
    if (!data || !latestOracleData) return {};
    const entries = [];
    let latestIndex = 0;
    registryMarkets.forEach((market, index) => {
      const cuOracleResult = data[index * 4 + 2];
      const assetIdResult = data[index * 4 + 3];
      if (cuOracleResult?.status === "success" && assetIdResult?.status === "success") {
        const latestResult = latestOracleData[latestIndex++];
        if (latestResult?.status === "success") {
          const rawPrice = latestResult.result?.price ?? latestResult.result?.[0];
          entries.push([market.name, rawPrice]);
        }
      }
    });
    return Object.fromEntries(entries);
  }, [data, latestOracleData, registryMarkets]);

  useEffect(() => {
    let cancelled = false;
    async function fetchStats() {
      const entries = await Promise.all(
        DEPLOYED_MARKETS.map(async (market) => {
          try {
            return [market.marketId, await getMarketStat24h(market.marketId)];
          } catch {
            return [market.marketId, null];
          }
        })
      );
      if (!cancelled) setStatsByMarket(Object.fromEntries(entries));
    }

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const markets = registryMarkets.map((market, index) => {
    const markResult = data?.[index * 4];
    const oracleResult = data?.[index * 4 + 1];
    const rawMarkPrice = markResult?.status === "success" ? markResult.result : null;
    const rawOraclePrice = oracleResult?.status === "success"
      ? oracleResult.result
      : latestOracleByMarket[market.name];
    const markPrice = rawMarkPrice ? Number(formatUnits(rawMarkPrice, 18)) : 0;
    const oraclePrice = rawOraclePrice ? Number(formatUnits(rawOraclePrice, 18)) : 0;
    return emptyMarket(
      market,
      markPrice,
      oraclePrice,
      statsByMarket[market.marketId],
      openInterestByMarket[market.name] ?? openInterestByMarket[market.marketId]
    );
  });

  return {
    markets,
    isLoading: isLoading || isRegistryLoading,
    error: error || registryError,
  };
};

export const getMarketDetails = (marketName) => {
  const market = DEPLOYED_MARKETS.find((m) => m.name === marketName) || getMarketByName(marketName);
  if (!market) return null;

  return {
    name: market.name,
    displayName: market.displayName,
    type: market.type,
    baseAsset: market.baseAsset,
    quoteAsset: market.quoteAsset,
    status: market.status,
    vammAddress: market.vammAddress || market.vamm,
    oracleAddress: market.oracleAddress || market.oracle,
    marketId: market.marketId || market.id,
    isDefault: market.name === DEFAULT_MARKET_KEY,
  };
};

export const useMarketRealTimeData = (marketName) => {
  const [data, setData] = useState(null);
  const [stats24h, setStats24h] = useState(null);
  const market = DEPLOYED_MARKETS.find((m) => m.name === marketName) || getMarketByName(marketName);
  const {
    market: registryMarket,
    isLoading: registryLoading,
    error: registryError,
  } = useRegistryMarket(market);
  const liveMarket = registryMarket || market;

  const vammAddress = liveMarket?.vammAddress || liveMarket?.vamm;
  const oracleAddress = liveMarket?.oracleAddress || liveMarket?.oracle;
  const marketId = liveMarket?.marketId || liveMarket?.id;
  const { openInterestUsd: directOpenInterestUsd } = useMarketOpenInterest(liveMarket);

  const { price: markPrice, isLoading: priceLoading } = useMarkPrice(vammAddress, 5000);
  const { cumulativeFunding, lastFundingTime, kFundingX18, frMaxBpsPerHour } = useFundingRate(vammAddress);
  const { price: oraclePrice, isLoading: oracleLoading } = useOraclePrice(oracleAddress, 10000);

  useEffect(() => {
    if (!marketId) return undefined;
    let cancelled = false;
    const fetch24hStats = async () => {
      try {
        const stats = await getMarketStat24h(marketId);
        if (!cancelled) setStats24h(stats);
      } catch (error) {
        console.error("Error fetching 24h stats:", error);
      }
    };

    fetch24hStats();
    const interval = setInterval(fetch24hStats, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [marketId]);

  useEffect(() => {
    if (!liveMarket || priceLoading || !markPrice) return;

    const markPriceNum = parseFloat(markPrice);
    const twapNum = markPriceNum;
    const parsedOraclePrice = oraclePrice ? parseFloat(oraclePrice) : 0;
    const oraclePriceNum = parsedOraclePrice > 0 ? parsedOraclePrice : 0;

    // Premium = (markPrice - indexPrice) / indexPrice
    const premiumDecimal = oraclePriceNum > 0 ? (markPriceNum - oraclePriceNum) / oraclePriceNum : 0;
    const premium = premiumDecimal * 100;

    // Funding / 8h, derived from contract parameters and clamped like vAMM funding.
    const kFunding = parseFloat(kFundingX18 || '0');
    const eightHours = 8;
    const rawFundingRateDecimal = kFunding * premiumDecimal * (eightHours / 24);
    const maxFundingRateDecimal = frMaxBpsPerHour > 0
      ? (frMaxBpsPerHour * eightHours) / 10000
      : Number.POSITIVE_INFINITY;
    const fundingRateDecimal = Math.max(
      -maxFundingRateDecimal,
      Math.min(maxFundingRateDecimal, rawFundingRateDecimal)
    );
    const fundingRatePct = fundingRateDecimal * 100;
    const fundingRateAnnualized = fundingRatePct * 3 * 365;

    const change24hValue = stats24h?.change_24h_percent != null
      ? parseFloat(stats24h.change_24h_percent)
      : (twapNum > 0 ? ((markPriceNum - twapNum) / twapNum) * 100 : 0);

    const openInterestUsd = directOpenInterestUsd ?? stats24h?.open_interest_usd;

    setData({
      name: liveMarket.name,
      displayName: liveMarket.displayName,
      type: liveMarket.type,
      baseAsset: liveMarket.baseAsset,
      quoteAsset: liveMarket.quoteAsset,
      status: liveMarket.status,
      marketId,
      markPriceRaw: markPriceNum,
      twapRaw: twapNum,
      oraclePriceRaw: oraclePriceNum || null,
      fundingRateRaw: fundingRateDecimal,
      price: formatPrice(markPriceNum),
      indexPrice: oraclePriceNum > 0 ? oraclePriceNum.toFixed(2) : "N/A",
      vammPrice: formatPrice(twapNum),
      fundingRate: fundingRatePct >= 0 ? `+${fundingRatePct.toFixed(4)}%` : `${fundingRatePct.toFixed(4)}%`,
      fundingRateAnnualized: `${fundingRateAnnualized.toFixed(2)}% APR`,
      change24h: `${stats24h?.change_24h_percent == null ? "~" : ""}${change24hValue.toFixed(2)}%`,
      change24hValue,
      volume24h: stats24h?.volume_24h_usd
        ? `$${parseFloat(stats24h.volume_24h_usd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : "$0.00",
      high24h: stats24h?.high_24h ? `$${parseFloat(stats24h.high_24h).toFixed(2)}` : "N/A",
      low24h: stats24h?.low_24h ? `$${parseFloat(stats24h.low_24h).toFixed(2)}` : "N/A",
      trades24h: stats24h?.trades_24h || 0,
      openInterest: formatUsd(openInterestUsd),
      lastFundingTime,
      cumulativeFunding,
      frMaxBpsPerHour,
      premium: `${premium.toFixed(6)}%`,
      premiumRaw: premium,
      isPriceLoaded: !priceLoading,
      isTwapLoaded: !priceLoading,
      isOracleLoaded: !oracleLoading,
      is24hStatsLoaded: stats24h !== null,
    });
  }, [
    liveMarket,
    marketId,
    markPrice,
    oraclePrice,
    cumulativeFunding,
    lastFundingTime,
    kFundingX18,
    frMaxBpsPerHour,
    priceLoading,
    oracleLoading,
    stats24h,
    directOpenInterestUsd,
  ]);

  if (!market) {
    return { data: null, isLoading: false, error: "Market not found" };
  }

  return {
    data,
    isLoading: registryLoading || priceLoading || !data,
    error: registryError || null,
  };
};
