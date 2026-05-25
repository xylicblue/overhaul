import { useEffect, useMemo, useState } from "react";
import { formatUnits } from "ethers";
import { useReadContracts } from "wagmi";
import { getActiveMarkets } from "../contracts/addresses";

const SEPOLIA_CHAIN_ID = 11155111;
const REFRESH_INTERVAL_MS = 30000;
const CACHE_VERSION = 1;
const CACHE_PREFIX = `bytestrike:open-interest:${SEPOLIA_CHAIN_ID}:v${CACHE_VERSION}`;
const CACHE_STALE_MS = 2 * 60 * 1000;

const VAMM_OI_ABI = [
  {
    inputs: [],
    name: "totalLongOI",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalShortOI",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getMarkPrice",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

let sessionOpenInterestCache = {};

function isBrowser() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function getVammAddress(market) {
  return market?.vammAddress || market?.vamm;
}

function getMarketId(market) {
  return market?.marketId || market?.id;
}

function marketCacheKeys(market) {
  return [
    market?.name,
    getMarketId(market),
    market?.displayName,
    getVammAddress(market)?.toLowerCase(),
  ].filter(Boolean);
}

function storageKey(key) {
  return `${CACHE_PREFIX}:${key}`;
}

function isFreshEntry(entry, now = Date.now()) {
  return (
    entry?.chainId === SEPOLIA_CHAIN_ID &&
    entry?.version === CACHE_VERSION &&
    Number.isFinite(entry?.value) &&
    Number.isFinite(entry?.timestamp) &&
    now - entry.timestamp <= CACHE_STALE_MS
  );
}

function readStoredEntry(key, now = Date.now()) {
  if (!isBrowser()) return null;

  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(storageKey(key)));
    return isFreshEntry(parsed, now) ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredEntry(key, entry) {
  if (!isBrowser()) return;

  try {
    window.sessionStorage.setItem(storageKey(key), JSON.stringify(entry));
  } catch {
    // Session storage is opportunistic; in-memory cache remains the fallback.
  }
}

function hydrateOpenInterest(markets) {
  const now = Date.now();
  const hydrated = {};

  markets.forEach((market) => {
    const keys = marketCacheKeys(market);
    const memoryEntry = keys.map((key) => sessionOpenInterestCache[key]).find((entry) => isFreshEntry(entry, now));
    const storedEntry = memoryEntry || keys.map((key) => readStoredEntry(key, now)).find(Boolean);
    if (!storedEntry) return;

    keys.forEach((key) => {
      hydrated[key] = storedEntry;
      sessionOpenInterestCache[key] = storedEntry;
    });
  });

  return hydrated;
}

function valuesFromEntries(entries, now = Date.now()) {
  return Object.fromEntries(
    Object.entries(entries)
      .filter(([, entry]) => isFreshEntry(entry, now))
      .map(([key, entry]) => [key, entry.value])
  );
}

function computeOpenInterestUsd(longOI, shortOI, markPrice) {
  if (longOI == null || shortOI == null || markPrice == null) return null;
  const openInterestX18 = ((BigInt(longOI) + BigInt(shortOI)) * BigInt(markPrice)) / 10n ** 18n;
  return Number(formatUnits(openInterestX18, 18));
}

export function useMarketsOpenInterest(markets = getActiveMarkets()) {
  const activeMarkets = useMemo(
    () => markets.filter((market) => getVammAddress(market)),
    [markets]
  );
  const [cachedEntries, setCachedEntries] = useState(() => hydrateOpenInterest(activeMarkets));
  const [freshnessTick, setFreshnessTick] = useState(0);

  useEffect(() => {
    const hydrated = hydrateOpenInterest(activeMarkets);
    if (Object.keys(hydrated).length === 0) return;
    setCachedEntries((prev) => ({
      ...prev,
      ...hydrated,
    }));
  }, [activeMarkets]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFreshnessTick((tick) => tick + 1);
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const contracts = useMemo(
    () => activeMarkets.flatMap((market) => {
      const address = getVammAddress(market);
      return [
        {
          address,
          abi: VAMM_OI_ABI,
          functionName: "totalLongOI",
          chainId: SEPOLIA_CHAIN_ID,
        },
        {
          address,
          abi: VAMM_OI_ABI,
          functionName: "totalShortOI",
          chainId: SEPOLIA_CHAIN_ID,
        },
        {
          address,
          abi: VAMM_OI_ABI,
          functionName: "getMarkPrice",
          chainId: SEPOLIA_CHAIN_ID,
        },
      ];
    }),
    [activeMarkets]
  );

  const { data, isLoading, error } = useReadContracts({
    contracts,
    query: {
      enabled: contracts.length > 0,
      refetchInterval: REFRESH_INTERVAL_MS,
    },
  });

  useEffect(() => {
    if (!data || data.length === 0) return;

    const nextEntries = {};
    const timestamp = Date.now();
    activeMarkets.forEach((market, index) => {
      const longResult = data[index * 3];
      const shortResult = data[index * 3 + 1];
      const markResult = data[index * 3 + 2];
      if (
        longResult?.status !== "success" ||
        shortResult?.status !== "success" ||
        markResult?.status !== "success"
      ) {
        return;
      }

      const openInterestUsd = computeOpenInterestUsd(
        longResult.result,
        shortResult.result,
        markResult.result
      );
      if (openInterestUsd == null || !Number.isFinite(openInterestUsd)) return;

      const entry = {
        value: openInterestUsd,
        timestamp,
        chainId: SEPOLIA_CHAIN_ID,
        version: CACHE_VERSION,
      };

      marketCacheKeys(market).forEach((key) => {
        nextEntries[key] = entry;
        writeStoredEntry(key, entry);
      });
    });

    if (Object.keys(nextEntries).length === 0) return;

    sessionOpenInterestCache = {
      ...sessionOpenInterestCache,
      ...nextEntries,
    };
    setCachedEntries((prev) => ({
      ...prev,
      ...nextEntries,
    }));
  }, [activeMarkets, data]);

  const openInterestByMarket = useMemo(
    () => valuesFromEntries(cachedEntries),
    [cachedEntries, freshnessTick]
  );

  return {
    openInterestByMarket,
    isLoading,
    error,
  };
}

export function useMarketOpenInterest(market) {
  const markets = useMemo(() => (market ? [market] : []), [market]);
  const { openInterestByMarket, isLoading, error } = useMarketsOpenInterest(markets);
  const keys = useMemo(() => (market ? marketCacheKeys(market) : []), [market]);
  const openInterestUsd = keys.map((key) => openInterestByMarket[key]).find((value) => value != null);

  return {
    openInterestUsd,
    openInterestByMarket,
    isLoading,
    error,
  };
}
