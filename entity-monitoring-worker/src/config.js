import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getAddress, isAddress, isHex } from 'viem';

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function integer(name, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const raw = process.env[name]?.trim();
  const value = raw === undefined || raw === '' ? fallback : Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function boolean(name, fallback = false) {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new Error(`${name} must be true or false`);
}

function address(name) {
  const value = required(name);
  if (!isAddress(value)) throw new Error(`${name} must be a valid EVM address`);
  return getAddress(value);
}

export function loadConfig() {
  const pollIntervalMs = integer('POLL_INTERVAL_MS', 15000, { min: 1000, max: 300000 });
  const leaseSeconds = integer('LEASE_SECONDS', 60, { min: 30, max: 900 });
  if (leaseSeconds * 1000 <= pollIntervalMs * 2) {
    throw new Error('LEASE_SECONDS must exceed twice POLL_INTERVAL_MS');
  }

  const supabaseUrl = required('SUPABASE_URL').replace(/\/$/, '');
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl)) {
    throw new Error('SUPABASE_URL must be a valid Supabase project URL');
  }

  const marketConfigPath = resolve(process.cwd(), process.env.MARKET_CONFIG_PATH?.trim() || './config/markets.sepolia.json');
  const marketConfig = JSON.parse(readFileSync(marketConfigPath, 'utf8'));
  if (!Array.isArray(marketConfig) || marketConfig.length === 0) {
    throw new Error('MARKET_CONFIG_PATH must contain a non-empty JSON array');
  }
  const markets = marketConfig.map((market, index) => {
    if (!market?.marketId || !isHex(market.marketId, { strict: true }) || market.marketId.length !== 66) {
      throw new Error(`Market entry ${index + 1} must contain a bytes32 marketId`);
    }
    return Object.freeze({ name: market.name || `Market ${index + 1}`, marketId: market.marketId.toLowerCase() });
  });

  return Object.freeze({
    supabaseUrl,
    supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
    rpcUrl: required('RPC_URL'),
    chainId: integer('CHAIN_ID', undefined, { min: 1 }),
    clearingHouseAddress: address('CLEARING_HOUSE_ADDRESS'),
    collateralTokenAddress: address('COLLATERAL_TOKEN_ADDRESS'),
    startBlock: BigInt(integer('START_BLOCK', undefined, { min: 0 })),
    finalityConfirmations: BigInt(integer('FINALITY_CONFIRMATIONS', 12, { min: 1, max: 1000 })),
    blockChunkSize: BigInt(integer('BLOCK_CHUNK_SIZE', 1000, { min: 1, max: 10000 })),
    pollIntervalMs,
    leaseSeconds,
    retryDelayMs: integer('RETRY_DELAY_MS', 10000, { min: 1000, max: 300000 }),
    riskRefreshIntervalMs: integer('RISK_REFRESH_INTERVAL_MS', 900000, { min: 60000, max: 86400000 }),
    riskRefreshBatchSize: integer('RISK_REFRESH_BATCH_SIZE', 50, { min: 1, max: 500 }),
    collateralDecimals: integer('COLLATERAL_DECIMALS', 6, { min: 0, max: 36 }),
    marketConfigPath,
    markets,
    port: integer('PORT', 8080, { min: 1, max: 65535 }),
    workerName: process.env.WORKER_NAME?.trim() || 'entity-live-monitoring',
    instanceId: process.env.INSTANCE_ID?.trim() || null,
    runOnce: boolean('RUN_ONCE'),
    dryRun: boolean('DRY_RUN'),
  });
}
