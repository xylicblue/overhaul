// Shared market -> Supabase historical index-price table mapping.
// Current stats come from contracts; this config is for charts/sparklines/indexer DB fallback.
export const SPARKLINE_CONFIG = {
  "H100-GPU-PERP":         { table: "price_data",            priceField: "price",           timeField: "timestamp" },
  "H100-PERP":             { table: "price_data",            priceField: "price",           timeField: "timestamp" },
  "AWS-H100-PERP":         { table: "h100_hyperscaler_prices", priceField: "effective_price", providerFilter: "Amazon Web Services" },
  "AZURE-H100-PERP":       { table: "h100_hyperscaler_prices", priceField: "effective_price", providerFilter: "Microsoft Azure" },
  "GCP-H100-PERP":         { table: "h100_hyperscaler_prices", priceField: "effective_price", providerFilter: "Google Cloud" },
  "H100-HyperScalers-PERP": { table: "h100_hyperscalers_perp_prices", priceField: "price", timeField: "timestamp" },
  "H100-non-HyperScalers-PERP-V2": { table: "h100_non_hyperscalers_perp_prices", priceField: "price", timeField: "timestamp" },
  "H100-non-HyperScalers-PERP": { table: "h100_non_hyperscalers_perp_prices", priceField: "price", timeField: "timestamp" },

  "B200-PERP-V2":          { table: "b200_index_prices",      priceField: "index_price" },
  "B200-PERP":             { table: "b200_index_prices",      priceField: "index_price" },
  "AWS-B200-PERP":         { table: "b200_provider_prices",   priceField: "effective_price", providerFilter: "AWS" },
  "ORACLE-B200-PERP":      { table: "b200_provider_prices",   priceField: "effective_price", providerFilter: "Oracle" },
  "COREWEAVE-B200-PERP":   { table: "b200_provider_prices",   priceField: "effective_price", providerFilter: "CoreWeave" },
  "GCP-B200-PERP":         { table: "b200_provider_prices",   priceField: "effective_price", providerFilter: "Google Cloud" },

  "H200-PERP-V2":          { table: "h200_index_prices",      priceField: "index_price" },
  "H200-PERP":             { table: "h200_index_prices",      priceField: "index_price" },
  "ORACLE-H200-PERP":      { table: "h200_provider_prices",   priceField: "effective_price", providerFilter: "Oracle" },
  "ORACLE-H200-PERPETUAL": { table: "h200_provider_prices",   priceField: "effective_price", providerFilter: "Oracle" },
  "AWS-H200-PERP":         { table: "h200_provider_prices",   priceField: "effective_price", providerFilter: "AWS" },
  "AWS-H200-PERPETUAL":    { table: "h200_provider_prices",   priceField: "effective_price", providerFilter: "AWS" },
  "GCP-H200-PERP":         { table: "h200_provider_prices",   priceField: "effective_price", providerFilter: "Google Cloud" },
  "GCP-H200-PERPETUAL":    { table: "h200_provider_prices",   priceField: "effective_price", providerFilter: "Google Cloud" },
  "COREWEAVE-H200-PERP":   { table: "h200_provider_prices",   priceField: "effective_price", providerFilter: "CoreWeave" },
  "COREWEAVE-H200-PERPETUAL": { table: "h200_provider_prices", priceField: "effective_price", providerFilter: "CoreWeave" },
  "AZURE-H200-PERP":       { table: "h200_provider_prices",   priceField: "effective_price", providerFilter: "Azure" },
  "AZURE-H200-PERPETUAL":  { table: "h200_provider_prices",   priceField: "effective_price", providerFilter: "Azure" },

  "A100-PERP":             { table: "a100_index_prices",      priceField: "index_price",     timeField: "recorded_at" },
  "T4-PERP":               { table: "t4_index_prices",        priceField: "index_price" },
  "ETH-PERP-V2":           { table: "price_data",            priceField: "price",           timeField: "timestamp" },
};

export const DEFAULT_PRICE_SOURCE = {
  table: "price_data",
  priceField: "price",
  timeField: "timestamp",
};

export function getPriceSource(marketName) {
  return SPARKLINE_CONFIG[marketName] || DEFAULT_PRICE_SOURCE;
}

export function toDatafeedConfig(marketName, displayName = marketName) {
  const source = getPriceSource(marketName);
  return {
    displayName,
    tableName: source.table,
    priceField: source.priceField,
    timestampField: source.timeField || "created_at",
    providerFilter: source.providerFilter,
  };
}

export function toIndexerPriceSource(marketName) {
  const source = getPriceSource(marketName);
  return {
    tableName: source.table,
    priceField: source.priceField,
    timeField: source.timeField || "created_at",
    providerFilter: source.providerFilter,
  };
}
