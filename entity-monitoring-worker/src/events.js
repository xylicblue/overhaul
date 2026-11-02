export function absolute(value) {
  return value < 0n ? -value : value;
}

export function compareChainOrder(left, right) {
  if (left.blockNumber !== right.blockNumber) return left.blockNumber < right.blockNumber ? -1 : 1;
  const leftTransaction = Number(left.transactionIndex ?? 0);
  const rightTransaction = Number(right.transactionIndex ?? 0);
  if (leftTransaction !== rightTransaction) return leftTransaction - rightTransaction;
  return Number(left.logIndex ?? 0) - Number(right.logIndex ?? 0);
}

export function normalizeMonitoringLog(log, collateralDecimals) {
  const base = {
    walletAddress: null,
    tokenAddress: null,
    amountRaw: 0n,
    decimals: 18,
    payload: {},
  };

  if (log.eventName === 'TradeExecuted') {
    return {
      ...base,
      eventType: 'trade',
      walletAddress: log.args.user,
      amountRaw: absolute(log.args.quoteDelta),
      payload: {
        market_id: log.args.marketId.toLowerCase(),
        base_delta_raw: log.args.baseDelta.toString(),
        quote_delta_raw: log.args.quoteDelta.toString(),
        execution_price_raw: log.args.executionPrice.toString(),
        new_size_raw: log.args.newSize.toString(),
        new_margin_raw: log.args.newMargin.toString(),
        realized_pnl_raw: log.args.realizedPnL.toString(),
        fee_raw: log.args.fee.toString(),
      },
    };
  }

  if (log.eventName === 'collateralDeposited' || log.eventName === 'collateralWithdrawn') {
    return {
      ...base,
      eventType: log.eventName === 'collateralDeposited' ? 'collateral_deposit' : 'collateral_withdrawal',
      walletAddress: log.args.user,
      tokenAddress: log.args.token,
      amountRaw: log.args.amount,
      decimals: collateralDecimals,
      payload: { token_address: log.args.token.toLowerCase() },
    };
  }

  throw new Error(`Unsupported event ${log.eventName || 'unknown'}`);
}
