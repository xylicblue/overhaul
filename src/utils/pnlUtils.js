/**
 * Shared PnL helpers — single source of truth used by position panel,
 * portfolio, PnL chart, and leaderboard.
 *
 * Canonical net realized PnL = realizedPnL + fundingPayment − fee
 */

/** Net realized PnL for one trade row. */
export function calcNetPnl(trade) {
  const pnl     = parseFloat(trade?.pnl            ?? 0);
  const funding = parseFloat(trade?.funding_earned  ?? 0);
  const fees    = parseFloat(trade?.fees_paid       ?? 0);
  return pnl + funding - fees;
}

/**
 * True only for rows whose accounting values were written by the
 * on-chain event indexer, not by frontend estimates.
 */
export function isCanonical(trade) {
  return trade?.accounting_source === "canonical";
}

/**
 * True when a row has the minimum fields needed to display P&L
 * (regardless of source).
 */
export function hasAccounting(trade) {
  return trade?.pnl != null && trade?.fees_paid != null;
}
