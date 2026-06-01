import { supabase } from "../creatclient";

export const PNL_TYPES_SET = new Set([
  "reduce",
  "close",
  "flip",
  "liquidation",
  "funding_settlement",
]);

export function marketDisplayName(row) {
  return row.market_name || `${row.market_id?.slice(0, 8)}...`;
}

export async function getCanonicalPnlEvents(walletAddress, options = {}) {
  if (!walletAddress) return [];

  let query = supabase
    .from("canonical_pnl_events")
    .select("*")
    .eq("user_address", walletAddress.toLowerCase())
    .order("block_number", { ascending: false })
    .order("transaction_index", { ascending: false })
    .order("primary_log_index", { ascending: false });

  if (options.marketId) {
    query = query.eq("market_id", options.marketId.toLowerCase());
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getCanonicalPnlTotals(walletAddress) {
  const rows = await getCanonicalPnlEvents(walletAddress);
  return rows
    .filter(row => PNL_TYPES_SET.has(row.accounting_type))
    .reduce(
      (acc, row) => {
        acc.realizedPnl        += Number(row.realized_pnl        || 0);
        acc.fundingPayment     += Number(row.funding_payment      || 0);
        acc.fees               += Number(row.fee                  || 0);
        acc.liquidationPenalties += Number(row.liquidation_penalty || 0);
        acc.netPnl             += Number(row.net_pnl              || 0);
        return acc;
      },
      { realizedPnl: 0, fundingPayment: 0, fees: 0, liquidationPenalties: 0, netPnl: 0 }
    );
}

export function subscribeToCanonicalPnl(walletAddress, onInsert) {
  const channel = supabase
    .channel(`canonical_pnl_${walletAddress.toLowerCase()}`)
    .on(
      "postgres_changes",
      {
        event:  "INSERT",
        schema: "public",
        table:  "canonical_pnl_events",
        filter: `user_address=eq.${walletAddress.toLowerCase()}`,
      },
      (payload) => onInsert(payload.new)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export function subscribeToTxHash(txHash, onInsert) {
  const channel = supabase
    .channel(`canonical_pnl_tx_${txHash.toLowerCase()}`)
    .on(
      "postgres_changes",
      {
        event:  "INSERT",
        schema: "public",
        table:  "canonical_pnl_events",
        filter: `tx_hash=eq.${txHash.toLowerCase()}`,
      },
      (payload) => onInsert(payload.new)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
