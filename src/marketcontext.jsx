// src/context/MarketContext.js
import React, { createContext, useState, useContext } from "react";
import { MARKET_IDS } from "./contracts/addresses";

// Markets deployed on Sepolia testnet
const AVAILABLE_MARKETS = {
  "H100-PERP": {
    name: "H100-PERP",
    displayName: "H100 GPU ($3.79/hr)",
    type: "Perpetual",
    baseAsset: "GPU-HOURS",
    quoteAsset: "USDC",
    marketId: MARKET_IDS['H100-PERP'],
    description: "H100 GPU hourly rental rate perpetual futures (all providers)",
  },

  "H100-non-HyperScalers-PERP": {
    name: "H100-non-HyperScalers-PERP",
    displayName: "Neocloud ($2.95/hr)",
    type: "Perpetual",
    baseAsset: "GPU-HOURS",
    quoteAsset: "USDC",
    marketId: MARKET_IDS['H100-non-HyperScalers-PERP'],
    description: "H100 GPU rental rates from Neocloud providers (Lambda, CoreWeave, etc.)",
  },
  "B200-PERP": {
    name: "B200-PERP",
    displayName: "B200 GPU ($7.15/hr)",
    type: "Perpetual",
    baseAsset: "GPU-HOURS",
    quoteAsset: "USDC",
    marketId: MARKET_IDS['B200-PERP'],
    description: "B200 GPU hourly rental rate perpetual futures",
  },
  "H200-PERP": {
    name: "H200-PERP",
    displayName: "H200 GPU ($3.53/hr)",
    type: "Perpetual",
    baseAsset: "GPU-HOURS",
    quoteAsset: "USDC",
    marketId: MARKET_IDS['H200-PERP'],
    description: "H200 GPU hourly rental rate perpetual futures",
  },
  "ORACLE-H200-PERP": {
    name: "ORACLE-H200-PERP",
    displayName: "Oracle H200 ($6.47/hr)",
    type: "Perpetual",
    baseAsset: "GPU-HOURS",
    quoteAsset: "USDC",
    marketId: MARKET_IDS['ORACLE-H200-PERP'],
    description: "Oracle Cloud H200 GPU hourly rental rate perpetual futures",
  },
  "AWS-H200-PERP": {
    name: "AWS-H200-PERP",
    displayName: "AWS H200 ($4.04/hr)",
    type: "Perpetual",
    baseAsset: "GPU-HOURS",
    quoteAsset: "USDC",
    marketId: MARKET_IDS['AWS-H200-PERP'],
    description: "AWS H200 GPU hourly rental rate perpetual futures",
  },
  "COREWEAVE-H200-PERP": {
    name: "COREWEAVE-H200-PERP",
    displayName: "CoreWeave H200 ($14.53/hr)",
    type: "Perpetual",
    baseAsset: "GPU-HOURS",
    quoteAsset: "USDC",
    marketId: MARKET_IDS['COREWEAVE-H200-PERP'],
    description: "CoreWeave H200 GPU hourly rental rate perpetual futures",
  },
  "GCP-H200-PERP": {
    name: "GCP-H200-PERP",
    displayName: "GCP H200 ($6.60/hr)",
    type: "Perpetual",
    baseAsset: "GPU-HOURS",
    quoteAsset: "USDC",
    marketId: MARKET_IDS['GCP-H200-PERP'],
    description: "Google Cloud H200 GPU hourly rental rate perpetual futures",
  },
  "ETH-PERP-V2": {
    name: "ETH-PERP-V2",
    displayName: "H100 GPU ($3.79/hr)",
    type: "Perpetual",
    baseAsset: "GPU-HOURS",
    quoteAsset: "USDC",
    marketId: MARKET_IDS['ETH-PERP-V2'], // Alias for H100-PERP
  },
};

// Default to the H100 GPU market
const DEFAULT_MARKET = AVAILABLE_MARKETS["H100-PERP"];

// 1. Create the context
const MarketContext = createContext();

// 2. Create the Provider component
export const MarketProvider = ({ children }) => {
  // State to hold the currently selected market
  // Default to ETH-PERP-V2 (the new $3.75 market)
  const [selectedMarket, setSelectedMarket] = useState(DEFAULT_MARKET);

  // Function to change the market
  // Supports both ETH-PERP-V2 and ETH-PERP
  const selectMarket = (marketName) => {
    const market = AVAILABLE_MARKETS[marketName];
    
    if (market) {
      setSelectedMarket(market);
      console.log("Market selected:", market);
    } else {
      console.warn(`Market ${marketName} not found. Available markets:`, Object.keys(AVAILABLE_MARKETS));
      // Don't change if market not found
    }
  };

  return (
    <MarketContext.Provider value={{ selectedMarket, selectMarket, availableMarkets: AVAILABLE_MARKETS }}>
      {children}
    </MarketContext.Provider>
  );
};

// 3. Create a custom hook for easy access to the context
export const useMarket = () => {
  return useContext(MarketContext);
};
