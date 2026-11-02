import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateAccountEquity, effectivePositionMargin } from '../src/equity.js';

const WAD = 10n ** 18n;

test('effective position margin derives equity from notional and margin ratio', () => {
  assert.equal(effectivePositionMargin(2500n * WAD, WAD / 5n), 500n * WAD);
});

test('aggregate account equity includes free collateral and every open market', () => {
  const result = aggregateAccountEquity(100n * WAD, [
    { notionalX18: 1000n * WAD, marginRatioX18: WAD / 10n },
    { notionalX18: 500n * WAD, marginRatioX18: WAD / 5n },
  ]);
  assert.equal(result, 300n * WAD);
});

test('aggregate account equity preserves negative free collateral', () => {
  assert.equal(aggregateAccountEquity(-25n * WAD, []), -25n * WAD);
});
