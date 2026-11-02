import test from 'node:test';
import assert from 'node:assert/strict';
import { absolute, compareChainOrder, normalizeMonitoringLog } from '../src/events.js';

test('absolute handles positive and negative bigint values', () => {
  assert.equal(absolute(4n), 4n);
  assert.equal(absolute(-4n), 4n);
});

test('trade normalization uses absolute quote delta and retains evidence', () => {
  const result = normalizeMonitoringLog({
    eventName: 'TradeExecuted',
    args: {
      user: '0x1111111111111111111111111111111111111111',
      marketId: '0xABCDEF',
      baseDelta: -2n,
      quoteDelta: -3000000000000000000n,
      executionPrice: 4n,
      newSize: 5n,
      newMargin: 6n,
      realizedPnL: -7n,
      fee: 8n,
    },
  }, 6);
  assert.equal(result.eventType, 'trade');
  assert.equal(result.amountRaw, 3000000000000000000n);
  assert.equal(result.decimals, 18);
  assert.equal(result.payload.market_id, '0xabcdef');
  assert.equal(result.payload.realized_pnl_raw, '-7');
});

test('collateral normalization distinguishes deposits and withdrawals', () => {
  const deposit = normalizeMonitoringLog({
    eventName: 'collateralDeposited',
    args: {
      user: '0x1111111111111111111111111111111111111111',
      token: '0x2222222222222222222222222222222222222222',
      amount: 1250000n,
    },
  }, 6);
  assert.equal(deposit.eventType, 'collateral_deposit');
  assert.equal(deposit.decimals, 6);

  const withdrawal = normalizeMonitoringLog({
    eventName: 'collateralWithdrawn',
    args: deposit.payload.token_address
      ? {
          user: deposit.walletAddress,
          token: deposit.tokenAddress,
          amount: deposit.amountRaw,
        }
      : {},
  }, 6);
  assert.equal(withdrawal.eventType, 'collateral_withdrawal');
});

test('chain ordering uses block, transaction and log positions', () => {
  const logs = [
    { blockNumber: 11n, transactionIndex: 0, logIndex: 0 },
    { blockNumber: 10n, transactionIndex: 1, logIndex: 1 },
    { blockNumber: 10n, transactionIndex: 1, logIndex: 0 },
  ].sort(compareChainOrder);
  assert.deepEqual(logs.map((log) => [log.blockNumber, log.logIndex]), [
    [10n, 0], [10n, 1], [11n, 0],
  ]);
});
