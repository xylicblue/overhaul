import { useEffect, useMemo, useState } from "react";
import { formatUnits } from "ethers";
import { useReadContracts } from "wagmi";
import { useMarkPrice, useTWAP, useFundingRate } from "./hooks/useVAMM";
import { useOraclePrice } from "./hooks/useOracle";
import { DEFAULT_MARKET_KEY, getActiveMarkets, getMarketByName } from "./contracts/addresses";
import { getMarketStat24h } from "./services/api";
import VAMMABI from "./contracts/abis/vAMM.json";
import { supabase } from "./creatclient";
import { SPARKLINE_CONFIG } from "./config/marketsConfig";

const SEPOLIA_CHAIN_ID = 11155111;
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

function formatPrice(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function emptyMarket(market, markPrice = 0, stats = null) {
  const change24hValue = stats?.change_24h_percent != null
    ? Number(stats.change_24h_percent)
    : 0;
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
    price: formatPrice(markPrice),
    change24h: `${change24hValue.toFixed(2)}%`,
    change24hValue,
    volume24h: stats?.volume_24h_usd
      ? `$${Number(stats.volume_24h_usd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : "$0.00",
  };
}

export const useMarketsData = () => {
  const [statsByMarket, setStatsByMarket] = useState({});

  const contracts = useMemo(
    () => DEPLOYED_MARKETS.map((market) => ({
      address: market.vammAddress,
      abi: VAMMABI.abi,
      functionName: "getMarkPrice",
      chainId: SEPOLIA_CHAIN_ID,
    })),
    []
  );

  const { data, isLoading, error } = useReadContracts({
    contracts,
    query: {
      refetchInterval: 5000,
    },
  });

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

  const markets = DEPLOYED_MARKETS.map((market, index) => {
    const result = data?.[index];
    const rawPrice = result?.status === "success" ? result.result : null;
    const markPrice = rawPrice ? Number(formatUnits(rawPrice, 18)) : 0;
    return emptyMarket(market, markPrice, statsByMarket[market.marketId]);
  });

  return {
    markets,
    isLoading,
    error,
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
  const [dbIndexPrice, setDbIndexPrice] = useState(null);
  const market = DEPLOYED_MARKETS.find((m) => m.name === marketName) || getMarketByName(marketName);

  const vammAddress = market?.vammAddress || market?.vamm;
  const oracleAddress = market?.oracleAddress || market?.oracle;
  const marketId = market?.marketId || market?.id;

  const { price: markPrice, isLoading: priceLoading } = useMarkPrice(vammAddress, 5000);
  const { twap, isLoading: twapLoading } = useTWAP(vammAddress, 900);
  const { cumulativeFunding, lastFundingTime, kFundingX18 } = useFundingRate(vammAddress);
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

  // Fallback: fetch latest index price from Supabase price tables when on-chain oracle returns 0
  useEffect(() => {
    const cfg = SPARKLINE_CONFIG[marketName];
    if (!cfg) return;
    let cancelled = false;
    const fetchDbPrice = async () => {
      try {
        const timeField = cfg.timeField || "created_at";
        let q = supabase
          .from(cfg.table)
          .select(cfg.priceField)
          .order(timeField, { ascending: false })
          .limit(1);
        if (cfg.providerFilter) q = q.eq("provider_name", cfg.providerFilter);
        const { data: rows } = await q;
        if (!cancelled && rows?.[0]) {
          const val = parseFloat(rows[0][cfg.priceField]);
          if (val > 0) setDbIndexPrice(val);
        }
      } catch (_) {}
    };
    fetchDbPrice();
    const id = setInterval(fetchDbPrice, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, [marketName]);

  useEffect(() => {
    if (!market || priceLoading || !markPrice) return;

    const markPriceNum = parseFloat(markPrice);
    const twapNum = twap ? parseFloat(twap) : markPriceNum;
    const parsedOraclePrice = oraclePrice ? parseFloat(oraclePrice) : 0;

    // Index price: prefer live contract oracle, fall back to Supabase price table
    const oraclePriceNum = parsedOraclePrice > 0 ? parsedOraclePrice : (dbIndexPrice || markPriceNum);

    // Premium = (markPrice - indexPrice) / indexPrice
    const premiumDecimal = oraclePriceNum > 0 ? (markPriceNum - oraclePriceNum) / oraclePriceNum : 0;
    const premium = premiumDecimal * 100;

    // Funding rate = kFunding × premium
    const kFunding = parseFloat(kFundingX18 || '0');
    const fundingRateDecimal = kFunding * premiumDecimal;
    const fundingRatePct = fundingRateDecimal * 100;
    const fundingRateAnnualized = fundingRatePct * 3 * 365;

    const change24hValue = stats24h?.change_24h_percent != null
      ? parseFloat(stats24h.change_24h_percent)
      : (twapNum > 0 ? ((markPriceNum - twapNum) / twapNum) * 100 : 0);

    setData({
      name: market.name,
      displayName: market.displayName,
      type: market.type,
      baseAsset: market.baseAsset,
      quoteAsset: market.quoteAsset,
      status: market.status,
      marketId,
      markPriceRaw: markPriceNum,
      twapRaw: twapNum,
      oraclePriceRaw: oraclePriceNum,
      fundingRateRaw: fundingRateDecimal,
      price: formatPrice(markPriceNum),
      indexPrice: oraclePriceNum.toFixed(2),
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
      openInterest: "N/A",
      lastFundingTime,
      premium: `${premium.toFixed(6)}%`,
      premiumRaw: premium,
      isPriceLoaded: !priceLoading,
      isTwapLoaded: !twapLoading,
      isOracleLoaded: !oracleLoading,
      is24hStatsLoaded: stats24h !== null,
    });
  }, [
    market,
    marketId,
    markPrice,
    twap,
    oraclePrice,
    cumulativeFunding,
    lastFundingTime,
    kFundingX18,
    priceLoading,
    twapLoading,
    oracleLoading,
    stats24h,
    dbIndexPrice,
  ]);

  if (!market) {
    return { data: null, isLoading: false, error: "Market not found" };
  }

  return {
    data,
    isLoading: priceLoading || !data,
    error: null,
  };
};
