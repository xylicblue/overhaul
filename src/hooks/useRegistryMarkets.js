import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import { SEPOLIA_CONTRACTS } from "../contracts/addresses";
import MarketRegistryABI from "../contracts/abis/MarketRegistry.json";

const SEPOLIA_CHAIN_ID = 11155111;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function marketIdOf(market) {
  return market?.marketId || market?.id;
}

function valueAt(result, key, index) {
  return result?.[key] ?? result?.[index];
}

function mergeRegistryMarket(market, registryMarket) {
  const vamm = valueAt(registryMarket, "vamm", 0);
  const oracle = valueAt(registryMarket, "oracle", 3);
  const paused = valueAt(registryMarket, "paused", 2);

  if (!vamm || !oracle || vamm === ZERO_ADDRESS || oracle === ZERO_ADDRESS) {
    return market;
  }

  return {
    ...market,
    vamm,
    oracle,
    vammAddress: vamm,
    oracleAddress: oracle,
    paused: Boolean(paused),
  };
}

export function useRegistryMarkets(markets = []) {
  const contracts = useMemo(
    () =>
      markets
        .filter((market) => marketIdOf(market))
        .map((market) => ({
          address: SEPOLIA_CONTRACTS.marketRegistry,
          abi: MarketRegistryABI.abi,
          functionName: "getMarket",
          args: [marketIdOf(market)],
          chainId: SEPOLIA_CHAIN_ID,
        })),
    [markets]
  );

  const { data, isLoading, error } = useReadContracts({
    contracts,
    query: {
      enabled: contracts.length > 0,
      refetchInterval: 30000,
    },
  });

  const resolvedMarkets = useMemo(() => {
    let resultIndex = 0;
    return markets.map((market) => {
      if (!marketIdOf(market)) return market;
      const result = data?.[resultIndex++];
      if (result?.status !== "success") return market;
      return mergeRegistryMarket(market, result.result);
    });
  }, [markets, data]);

  return {
    markets: resolvedMarkets,
    isLoading,
    error,
  };
}

export function useRegistryMarket(market) {
  const inputMarkets = useMemo(() => (market ? [market] : []), [market]);
  const { markets, isLoading, error } = useRegistryMarkets(inputMarkets);

  return {
    market: markets[0] || market,
    isLoading,
    error,
  };
}
