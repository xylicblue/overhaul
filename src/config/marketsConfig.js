// Shared market → Supabase table mapping.
// Imported by Sparkline and any hook that needs to know where price data lives.
export const SPARKLINE_CONFIG = {
  "H100-PERP":             { table: "price_data",            priceField: "price",           timeField: "timestamp" },
  "B200-PERP":             { table: "b200_index_prices",      priceField: "index_price" },
  "H200-PERP":             { table: "h200_index_prices",      priceField: "index_price" },
  "T4-PERP":               { table: "t4_index_prices",        priceField: "index_price" },
  "ORACLE-B200-PERP":      { table: "b200_provider_prices",   priceField: "effective_price", providerFilter: "Oracle" },
  "AWS-B200-PERP":         { table: "b200_provider_prices",   priceField: "effective_price", providerFilter: "AWS" },
  "GCP-B200-PERP":         { table: "b200_provider_prices",   priceField: "effective_price", providerFilter: "Google Cloud" },
  "COREWEAVE-B200-PERP":   { table: "b200_provider_prices",   priceField: "effective_price", providerFilter: "CoreWeave" },
  "ORACLE-H200-PERP":      { table: "h200_provider_prices",   priceField: "effective_price", providerFilter: "Oracle" },
  "AWS-H200-PERP":         { table: "h200_provider_prices",   priceField: "effective_price", providerFilter: "AWS" },
  "GCP-H200-PERP":         { table: "h200_provider_prices",   priceField: "effective_price", providerFilter: "Google Cloud" },
  "COREWEAVE-H200-PERP":   { table: "h200_provider_prices",   priceField: "effective_price", providerFilter: "CoreWeave" },
  "AZURE-H200-PERP":       { table: "h200_provider_prices",   priceField: "effective_price", providerFilter: "Azure" },
  "AWS-H100-PERP":         { table: "h100_hyperscaler_prices", priceField: "effective_price", providerFilter: "Amazon Web Services" },
  "AZURE-H100-PERP":       { table: "h100_hyperscaler_prices", priceField: "effective_price", providerFilter: "Microsoft Azure" },
  "GCP-H100-PERP":         { table: "h100_hyperscaler_prices", priceField: "effective_price", providerFilter: "Google Cloud" },
  "H100-non-HyperScalers-PERP": { table: "price_data",       priceField: "price",           timeField: "timestamp" },
  "ETH-PERP-V2":           { table: "price_data",            priceField: "price",           timeField: "timestamp" },
};
