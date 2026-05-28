import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_MARKET_KEY, getActiveMarkets, getMarketByName } from "../contracts/addresses";

export const AVAILABLE_MARKETS = Object.fromEntries(
  getActiveMarkets().map((market) => [
    market.name,
    {
      name: market.name,
      displayName: market.displayName,
      type: market.type,
      baseAsset: market.baseAsset,
      quoteAsset: market.quoteAsset,
      marketId: market.id,
      vammAddress: market.vamm,
      oracleAddress: market.oracle,
      description: market.description,
    },
  ])
);

export const DEFAULT_MARKET = AVAILABLE_MARKETS[DEFAULT_MARKET_KEY];

export const useMarketStore = create(
  persist(
    (set) => ({
      selectedMarket: DEFAULT_MARKET,
      availableMarkets: AVAILABLE_MARKETS,
      selectMarket: (marketName) => {
        const market = AVAILABLE_MARKETS[marketName] || getMarketByName(marketName);
        if (market) {
          set({
            selectedMarket: AVAILABLE_MARKETS[market.name] || {
              name: market.name,
              displayName: market.displayName,
              type: market.type,
              baseAsset: market.baseAsset,
              quoteAsset: market.quoteAsset,
              marketId: market.id,
              vammAddress: market.vamm,
              oracleAddress: market.oracle,
              description: market.description,
            },
          });
        } else {
          console.warn(`Market ${marketName} not found. Available:`, Object.keys(AVAILABLE_MARKETS));
        }
      },
    }),
    {
      name: "selected_market",
      partialize: (state) => ({ selectedMarket: state.selectedMarket }),
      onRehydrateStorage: () => (state) => {
        const rehydratedName = state?.selectedMarket?.name;
        if (state && (!rehydratedName || !AVAILABLE_MARKETS[rehydratedName])) {
          state.selectedMarket = DEFAULT_MARKET;
        }
      },
    }
  )
);

