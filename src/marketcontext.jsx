// Thin adapter — state now lives in useMarketStore (Zustand).
// All existing imports of useMarket / MarketProvider continue to work unchanged.
import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useMarketStore, AVAILABLE_MARKETS } from "./stores/useMarketStore";

// useMarket: same API as before, backed by Zustand
export const useMarket = () => {
  const selectedMarket  = useMarketStore((s) => s.selectedMarket);
  const selectMarket    = useMarketStore((s) => s.selectMarket);
  const availableMarkets = useMarketStore((s) => s.availableMarkets);
  return { selectedMarket, selectMarket, availableMarkets };
};

// MarketProvider: kept only for URL-param sync (?market=X)
// No longer needed for state — any component can call useMarket() anywhere
export const MarketProvider = ({ children }) => {
  const [searchParams] = useSearchParams();
  const selectMarket   = useMarketStore((s) => s.selectMarket);

  useEffect(() => {
    const marketParam = searchParams.get("market");
    if (marketParam && AVAILABLE_MARKETS[marketParam]) {
      selectMarket(marketParam);
    }
  }, [searchParams, selectMarket]);

  return children;
};
