// Temporary demo control for the Trade page only.
//
// It defaults to enabled so the demo build exposes only the canonical H100
// market without requiring a deployment-environment change. To restore every
// market later, set VITE_TRADE_H100_ONLY=false (or change the fallback below).
const configuredValue = import.meta.env.VITE_TRADE_H100_ONLY;

export const TRADE_H100_ONLY = configuredValue == null
  ? true
  : !["false", "0", "off", "no"].includes(String(configuredValue).trim().toLowerCase());

export const TRADE_DEMO_MARKET_NAME = "H100-GPU-PERP";
