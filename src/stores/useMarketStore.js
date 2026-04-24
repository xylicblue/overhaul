import { create } from "zustand";
import { persist } from "zustand/middleware";
import { MARKET_IDS } from "../contracts/addresses";

export const AVAILABLE_MARKETS = {
  "H100-PERP": {
    name: "H100-PERP",
    displayName: "H100 GPU ($3.79/hr)",
    type: "Perpetual",
    baseAsset: "GPU-HOURS",
    quoteAsset: "USDC",
    marketId: MARKET_IDS["H100-PERP"],
    description: "H100 GPU hourly rental rate perpetual futures (all providers)",
  },
  "H100-non-HyperScalers-PERP": {
    name: "H100-non-HyperScalers-PERP",
    displayName: "H100 Neocloud ($2.95/hr)",
    type: "Perpetual",
    baseAsset: "GPU-HOURS",
    quoteAsset: "USDC",
    marketId: MARKET_IDS["H100-non-HyperScalers-PERP"],
    description: "H100 GPU rental rates from Neocloud providers (Lambda, CoreWeave, etc.)",
  },
  "B200-PERP": {
    name: "B200-PERP",
    displayName: "B200 GPU ($7.15/hr)",
    type: "Perpetual",
    baseAsset: "GPU-HOURS",
    quoteAsset: "USDC",
    marketId: MARKET_IDS["B200-PERP"],
    description: "B200 GPU hourly rental rate perpetual futures",
  },
  "H200-PERP": {
    name: "H200-PERP",
    displayName: "H200 GPU ($3.53/hr)",
    type: "Perpetual",
    baseAsset: "GPU-HOURS",
    quoteAsset: "USDC",
    marketId: MARKET_IDS["H200-PERP"],
    description: "H200 GPU hourly rental rate perpetual futures",
  },
  "ORACLE-B200-PERP": {
    name: "ORACLE-B200-PERP",
    displayName: "Oracle B200 ($6.47/hr)",
    type: "Perpetual",
    baseAsset: "GPU-HOURS",
    quoteAsset: "USDC",
    marketId: MARKET_IDS["ORACLE-B200-PERP"],
    description: "Oracle Cloud B200 GPU hourly rental rate perpetual futures",
  },
  "AWS-B200-PERP": {
    name: "AWS-B200-PERP",
    displayName: "AWS B200 ($4.04/hr)",
    type: "Perpetual",
    baseAsset: "GPU-HOURS",
    quoteAsset: "USDC",
    marketId: MARKET_IDS["AWS-B200-PERP"],
    description: "AWS B200 GPU hourly rental rate perpetual futures",
  },
  "COREWEAVE-B200-PERP": {
    name: "COREWEAVE-B200-PERP",
    displayName: "CoreWeave B200 ($14.53/hr)",
    type: "Perpetual",
    baseAsset: "GPU-HOURS",
    quoteAsset: "USDC",
    marketId: MARKET_IDS["COREWEAVE-B200-PERP"],
    description: "CoreWeave B200 GPU hourly rental rate perpetual futures",
  },
  "GCP-B200-PERP": {
    name: "GCP-B200-PERP",
    displayName: "GCP B200 ($6.60/hr)",
    type: "Perpetual",
    baseAsset: "GPU-HOURS",
    quoteAsset: "USDC",
    marketId: MARKET_IDS["GCP-B200-PERP"],
    description: "Google Cloud B200 GPU hourly rental rate perpetual futures",
  },
  "ORACLE-H200-PERP": {
    name: "ORACLE-H200-PERP",
    displayName: "Oracle H200 ($2.92/hr)",
    type: "Perpetual",
    baseAsset: "GPU-HOURS",
    quoteAsset: "USDC",
    marketId: MARKET_IDS["ORACLE-H200-PERP"],
    description: "Oracle Cloud H200 GPU hourly rental rate perpetual futures",
  },
  "AWS-H200-PERP": {
    name: "AWS-H200-PERP",
    displayName: "AWS H200 ($2.65/hr)",
    type: "Perpetual",
    baseAsset: "GPU-HOURS",
    quoteAsset: "USDC",
    marketId: MARKET_IDS["AWS-H200-PERP"],
    description: "AWS H200 GPU hourly rental rate perpetual futures",
  },
  "COREWEAVE-H200-PERP": {
    name: "COREWEAVE-H200-PERP",
    displayName: "CoreWeave H200 ($2.57/hr)",
    type: "Perpetual",
    baseAsset: "GPU-HOURS",
    quoteAsset: "USDC",
    marketId: MARKET_IDS["COREWEAVE-H200-PERP"],
    description: "CoreWeave H200 GPU hourly rental rate perpetual futures",
  },
  "GCP-H200-PERP": {
    name: "GCP-H200-PERP",
    displayName: "GCP H200 ($4.55/hr)",
    type: "Perpetual",
    baseAsset: "GPU-HOURS",
    quoteAsset: "USDC",
    marketId: MARKET_IDS["GCP-H200-PERP"],
    description: "Google Cloud H200 GPU hourly rental rate perpetual futures",
  },
  "AZURE-H200-PERP": {
    name: "AZURE-H200-PERP",
    displayName: "Azure H200 ($5.05/hr)",
    type: "Perpetual",
    baseAsset: "GPU-HOURS",
    quoteAsset: "USDC",
    marketId: MARKET_IDS["AZURE-H200-PERP"],
    description: "Azure H200 GPU hourly rental rate perpetual futures",
  },
  "AWS-H100-PERP": {
    name: "AWS-H100-PERP",
    displayName: "AWS H100 ($3.85/hr)",
    type: "Perpetual",
    baseAsset: "GPU-HOURS",
    quoteAsset: "USDC",
    marketId: MARKET_IDS["AWS-H100-PERP"],
    description: "AWS H100 GPU hourly rental rate perpetual futures",
  },
  "AZURE-H100-PERP": {
    name: "AZURE-H100-PERP",
    displayName: "Azure H100 ($2.12/hr)",
    type: "Perpetual",
    baseAsset: "GPU-HOURS",
    quoteAsset: "USDC",
    marketId: MARKET_IDS["AZURE-H100-PERP"],
    description: "Azure H100 GPU hourly rental rate perpetual futures",
  },
  "GCP-H100-PERP": {
    name: "GCP-H100-PERP",
    displayName: "GCP H100 ($3.88/hr)",
    type: "Perpetual",
    baseAsset: "GPU-HOURS",
    quoteAsset: "USDC",
    marketId: MARKET_IDS["GCP-H100-PERP"],
    description: "Google Cloud H100 GPU hourly rental rate perpetual futures",
  },
  "A100-PERP": {
    name: "A100-PERP",
    displayName: "A100 GPU ($1.76/hr)",
    type: "Perpetual",
    baseAsset: "GPU-HOURS",
    quoteAsset: "USDC",
    marketId: MARKET_IDS["A100-PERP"],
    description: "A100 GPU hourly rental rate perpetual futures",
  },
  "T4-PERP": {
    name: "T4-PERP",
    displayName: "T4 GPU ($0.45/hr)",
    type: "Perpetual",
    baseAsset: "GPU-HOURS",
    quoteAsset: "USDC",
    marketId: MARKET_IDS["T4-PERP"],
    description: "T4 GPU hourly rental rate perpetual futures",
  },
  "ETH-PERP-V2": {
    name: "ETH-PERP-V2",
    displayName: "H100 GPU ($3.79/hr)",
    type: "Perpetual",
    baseAsset: "GPU-HOURS",
    quoteAsset: "USDC",
    marketId: MARKET_IDS["ETH-PERP-V2"],
  },
};

export const DEFAULT_MARKET = AVAILABLE_MARKETS["H100-PERP"];

export const useMarketStore = create(
  persist(
    (set) => ({
      selectedMarket: DEFAULT_MARKET,
      availableMarkets: AVAILABLE_MARKETS,
      selectMarket: (marketName) => {
        const market = AVAILABLE_MARKETS[marketName];
        if (market) {
          set({ selectedMarket: market });
        } else {
          console.warn(`Market ${marketName} not found. Available:`, Object.keys(AVAILABLE_MARKETS));
        }
      },
    }),
    {
      name: "selected_market",
      // Only persist the selected market name — rehydrate the full object from config
      partialize: (state) => ({ selectedMarket: state.selectedMarket }),
      // Validate rehydrated market still exists in config
      onRehydrateStorage: () => (state) => {
        if (state?.selectedMarket && !AVAILABLE_MARKETS[state.selectedMarket.name]) {
          state.selectedMarket = DEFAULT_MARKET;
        }
      },
    }
  )
);
