#!/usr/bin/env node

/**
 * ByteStrike Event Indexer - Standalone Service
 * Indexes vAMM Swap events and price snapshots for 24h statistics
 *
 * Deploy this as a separate Node.js service (Railway, Render, etc.)
 * to run continuously without keeping your local dev server running.
 */

import { createClient } from '@supabase/supabase-js';
import { createPublicClient, http, parseAbiItem, formatUnits } from 'viem';
import { sepolia } from 'viem/chains';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ==================== CONFIGURATION ====================

const CONFIG = {
  // Supabase
  supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY,

  // Blockchain
  rpcUrl: process.env.RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
  chainId: 11155111, // Sepolia

  // Contracts (Sepolia) — updated to V5 addresses
  contracts: {
    clearingHouse:  '0x18F863b1b0A3Eca6B2235dc1957291E357f490B0', // V5 ClearingHouse proxy
    collateralVault:'0x86A10164eB8F55EA6765185aFcbF5e073b249Dd2',
    vammProxy:       '0xF7210ccC245323258CC15e0Ca094eBbe2DC2CD85', // H100-PERP
    vammProxyOld:    '0xF8908F7B4a1AaaD69bF0667FA83f85D3d0052739',
    oracle:          '0x3cA2Da03e4b6dB8fe5a24c22Cf5EB2A34B59cbad',
  },

  // Indexer settings
  snapshotInterval: parseInt(process.env.SNAPSHOT_INTERVAL) || 60000, // 1 minute
  statsInterval:    parseInt(process.env.STATS_INTERVAL)    || 300000, // 5 minutes
  indexHistorical:  process.env.INDEX_HISTORICAL !== 'false',

  // Notification dedup suppression windows (ms)
  dedup: {
    A1: 5  * 60 * 1000,  // 5 min
    A2: 2  * 60 * 1000,  // 2 min
    A3: 30 * 1000,        // 30 sec
    C2: 60 * 60 * 1000,  // 1 hr
    C3: 4  * 60 * 60 * 1000, // 4 hr
    F3: 30 * 60 * 1000,  // 30 min
    _default: 0,          // 0 = no suppression (event-driven)
  },
};

// ==================== MARKETS ====================

const MARKETS = [
  {
    id: '0x2bc0c3f3ef82289c7da8a9335c83ea4f2b5b8bd62b67c4f4e0dba00b304c2937', // H100-PERP
    name: 'H100-PERP',
    displayName: 'H100 GPU',
    vammAddress: CONFIG.contracts.vammProxy,
    tableName: 'price_data',
    active: true,
  },
  {
    id: '0xf4aa47cc83b0d01511ca8025a996421dda6fbab1764466da4b0de6408d3db2e2', // H100-HyperScalers-PERP
    name: 'H100-HyperScalers-PERP',
    displayName: 'H100 HyperScalers',
    vammAddress: '0xFE1df531084Dcf0Fe379854823bC5d402932Af99',
    tableName: 'h100_hyperscalers_perp_prices',
    active: true,
  },
  {
    id: '0x9d2d658888da74a10ac9263fc14dcac4a834dd53e8edf664b4cc3b2b4a23f214', // H100-non-HyperScalers-PERP
    name: 'H100-non-HyperScalers-PERP',
    displayName: 'H100 non-HyperScalers',
    vammAddress: '0x19574B8C91717389231DA5b0579564d6F81a79B0',
    tableName: 'h100_non_hyperscalers_perp_prices',
    active: true,
  },
  {
    id: '0xb1bae2ea6c465ce4acb7d8a4a16a8899c9cc94ac35b5a82403875c6b2aa34f3e', // T4-PERP
    name: 'T4-PERP',
    displayName: 'T4 GPU',
    vammAddress: '0x910C730dBEd5384fbF83bf1F387609bf83E8ffDd',
    tableName: 't4_index_prices',
    active: true,
  },
  {
    id: '0x385badc5603eb47056a6bdcd6ac81a50df49d7a4e8a7451405e580bd12087a28', // ETH-PERP-V2 (deprecated alias)
    name: 'ETH-PERP-V2',
    displayName: 'H100 GPU',
    vammAddress: CONFIG.contracts.vammProxy,
    // Alias to H100-PERP data
    tableName: 'price_data',
    active: true,
  },
  {
    id: '0x352291f10e3a0d4a9f7beb3b623eac0b06f735c95170f956bc68b2f8b504a35d', // ETH-PERP (deprecated)
    name: 'ETH-PERP',
    displayName: 'Test Market [OLD]',
    vammAddress: CONFIG.contracts.vammProxyOld,
    active: false, // Skip deprecated markets
  },
];

// ==================== ABIs ====================

const VAMM_ABI = [
  {
    "type": "function",
    "name": "getMarkPrice",
    "inputs": [],
    "outputs": [{"type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getFundingRate",
    "inputs": [],
    "outputs": [{"type": "int256"}],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "Swap",
    "inputs": [
      {"name": "sender",      "type": "address", "indexed": true},
      {"name": "baseDelta",   "type": "int256",  "indexed": false},
      {"name": "quoteDelta",  "type": "int256",  "indexed": false},
      {"name": "avgPriceX18","type": "uint256", "indexed": false}
    ]
  }
];

const ORACLE_ABI = [
  {
    "type": "function",
    "name": "getPrice",
    "inputs": [],
    "outputs": [{"type": "uint256"}],
    "stateMutability": "view"
  }
];

// ClearingHouse ABI — only the events we need for notifications
const CLEARING_HOUSE_ABI = [
  {
    "type": "event",
    "name": "LiquidationExecuted",
    "inputs": [
      {"name": "marketId",        "type": "bytes32", "indexed": true},
      {"name": "liquidator",      "type": "address", "indexed": true},
      {"name": "account",         "type": "address", "indexed": true},
      {"name": "size",            "type": "uint128", "indexed": false},
      {"name": "notional",        "type": "uint256", "indexed": false},
      {"name": "penalty",         "type": "uint256", "indexed": false},
      {"name": "liquidatorReward","type": "uint256", "indexed": false},
      {"name": "protocolFee",     "type": "uint256", "indexed": false},
      {"name": "insurancePayout", "type": "uint256", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "FundingSettled",
    "inputs": [
      {"name": "marketId",       "type": "bytes32", "indexed": true},
      {"name": "account",        "type": "address", "indexed": true},
      {"name": "fundingPayment", "type": "int256",  "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "MarketPaused",
    "inputs": [
      {"name": "marketId", "type": "bytes32", "indexed": true},
      {"name": "isPaused", "type": "bool",    "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "collateralDeposited",
    "inputs": [
      {"name": "user",   "type": "address", "indexed": true},
      {"name": "token",  "type": "address", "indexed": true},
      {"name": "amount", "type": "uint256", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "collateralWithdrawn",
    "inputs": [
      {"name": "user",   "type": "address", "indexed": true},
      {"name": "token",  "type": "address", "indexed": true},
      {"name": "amount", "type": "uint256", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "MarginAdded",
    "inputs": [
      {"name": "user",     "type": "address", "indexed": true},
      {"name": "marketId", "type": "bytes32", "indexed": true},
      {"name": "amount",   "type": "uint256", "indexed": false}
    ]
  }
];

// ==================== CLIENTS ====================

let supabase = null;
let publicClient = null;

function initializeClients() {
  // Validate config
  if (!CONFIG.supabaseUrl) {
    throw new Error('SUPABASE_URL or VITE_SUPABASE_URL not configured');
  }
  if (!CONFIG.supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_KEY or VITE_SUPABASE_SERVICE_KEY not configured');
  }

  // Initialize Supabase
  supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseServiceKey);

  // Initialize blockchain client
  publicClient = createPublicClient({
    chain: sepolia,
    transport: http(CONFIG.rpcUrl),
  });

  console.log('✅ Clients initialized');
}

// ==================== BLOCKCHAIN FUNCTIONS ====================

async function getMarkPrice(vammAddress) {
  try {
    const price = await publicClient.readContract({
      address: vammAddress,
      abi: VAMM_ABI,
      functionName: 'getMarkPrice',
    });
    return parseFloat(formatUnits(price, 18));
  } catch (error) {
    console.error('Error fetching mark price:', error.message);
    return null;
  }
}

async function getIndexPriceFromDB(tableName) {
  if (!tableName) return null;
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('price')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();
    if (error || !data) return null;
    return parseFloat(data.price);
  } catch (error) {
    console.error(`Error fetching index price from DB (${tableName}):`, error.message);
    return null;
  }
}

// ==================== NOTIFICATION ENGINE ====================

/**
 * Map market ID bytes32 → human-readable label.
 * Falls back to truncated marketId if not found.
 */
const MARKET_ID_TO_LABEL = {
  '0x2bc0c3f3ef82289c7da8a9335c83ea4f2b5b8bd62b67c4f4e0dba00b304c2937': 'H100-PERP',
  '0xf4aa47cc83b0d01511ca8025a996421dda6fbab1764466da4b0de6408d3db2e2': 'H100-HyperScalers-PERP',
  '0x9d2d658888da74a10ac9263fc14dcac4a834dd53e8edf664b4cc3b2b4a23f214': 'H100-non-HyperScalers-PERP',
  '0xb4be6bdaf765a9dc45759a99c834b32d12825dce59bc28052946c1f1267a999b': 'B200-PERP',
  '0x3b9736717eab3427f776c56345a626690c13be77aa87cb6858bf92d50ad0c998': 'H200-PERP',
  '0x78b1dd5626222aef5d91e323da7cbe8941adb4eaaf0d1e90ac2dcee2680be01f': 'Oracle-B200-PERP',
  '0x7e0ed16d08b6e36ae874386fd9c02a530e31026876a299a5ac59e9a8a7859c8e': 'AWS-B200-PERP',
  '0x05b98a16e85afdd21369f8dde4ae197e2b445f37445b0e382ebcfdd10b711306': 'CoreWeave-B200-PERP',
  '0xd0394d4ba76fe79cd0b954eb8e205df0cc4f08fb654dc916f5728d31c19f9305': 'GCP-B200-PERP',
  '0x61f05fafb6842941c9a7d6839378de32d97a2de181b4db0e276b8d2093b61866': 'Oracle-H200-PERP',
  '0x12aa394c59dbf446e7ba1d3ab66f4629761c27d0dbacf484da0f4b205260c8fc': 'AWS-H200-PERP',
  '0xf8444beb26f5f34e8d5ec6c988b1023100cd68287fa48066b54e428188ffa447': 'CoreWeave-H200-PERP',
  '0xb654d9eedc69b55e0fe883d03cae37d13fdacc319a5a1f507bb33875e0e14201': 'GCP-H200-PERP',
  '0xc845b4b5cdd753d1ad772bc105e5c4ddddff19c3da674c69da5c9f1a810bb872': 'Azure-H200-PERP',
  '0x69df00e859e1b007896c59653bb3ca35622fdf2bf46c2fd9fea7ffa7d88b6378': 'AWS-H100-PERP',
  '0x2492e86fcfe9b174434dfca2c27205159a34cf4e90f0ec7a1605fae91a7e7bbd': 'Azure-H100-PERP',
  '0x8c78c8c17cc7712fe1b17592a2c0a7f814f8ec784de0fbb4ae6573e3457e11dd': 'GCP-H100-PERP',
  '0x7c611d543b87d4eecced3a16f8db373340d784390882ad3e2fd76f257a51cf55': 'A100-PERP',
  '0xb1bae2ea6c465ce4acb7d8a4a16a8899c9cc94ac35b5a82403875c6b2aa34f3e': 'T4-PERP',
};

function marketLabel(marketId) {
  const id = marketId.toLowerCase();
  return MARKET_ID_TO_LABEL[id] || `Market(${id.slice(0,10)}...)`;
}

/**
 * Check suppression window for a (user, marketId, code) triplet.
 * Returns true if we should skip inserting (still within window).
 */
async function isDuped(userAddress, marketId, code) {
  const windowMs = CONFIG.dedup[code] ?? CONFIG.dedup._default;
  if (windowMs === 0) return false; // event-driven, never suppress

  const { data, error } = await supabase
    .from('notification_dedup_log')
    .select('last_sent_at, send_count')
    .eq('user_id',   userAddress.toLowerCase())
    .eq('market_id', (marketId || '').toLowerCase())
    .eq('code',      code)
    .single();

  if (error || !data) return false;

  const elapsed = Date.now() - new Date(data.last_sent_at).getTime();
  return elapsed < windowMs;
}

/**
 * Update the dedup log after sending a notification.
 */
async function updateDedup(userAddress, marketId, code) {
  await supabase
    .from('notification_dedup_log')
    .upsert({
      user_id:      userAddress.toLowerCase(),
      market_id:    (marketId || '').toLowerCase(),
      code,
      last_sent_at: new Date().toISOString(),
    }, { onConflict: 'user_id,market_id,code' })
    .select();
}

/**
 * CODE → { category, priority, titleFn, bodyFn, actionsFn }
 */
const NOTIFICATION_DEFS = {
  // ── B: Liquidation ──────────────────────────────────────────
  B1: {
    category: 'B', priority: 'critical',
    titleFn: (d) => `Partial Liquidation — ${d.market}`,
    bodyFn:  (d) => `${d.sizeFormatted} of your position was liquidated. Penalty: $${d.penaltyFormatted}. Remaining: ${d.remainingFormatted} units.`,
    actionsFn: () => [{ label: 'View Position', href: '/trade' }],
  },
  B2: {
    category: 'B', priority: 'critical',
    titleFn: (d) => `Full Liquidation — ${d.market}`,
    bodyFn:  (d) => `Your entire position (notional: $${d.notionalFormatted}) was liquidated. Penalty: $${d.penaltyFormatted}.`,
    actionsFn: () => [{ label: 'View History', href: '/portfolio' }],
  },
  // ── C: Funding ──────────────────────────────────────────────
  C1: {
    category: 'C', priority: 'low',
    titleFn: (d) => `Funding Settled — ${d.market}`,
    bodyFn:  (d) => `Funding payment: ${d.fundingFormatted} (${d.fundingSign}).`,
    actionsFn: () => [],
  },
  // ── D: Position Events ──────────────────────────────────────
  D1: {
    category: 'D', priority: 'low',
    titleFn: (d) => `Position Opened — ${d.market}`,
    bodyFn:  (d) => `${d.side} ${d.sizeFormatted} units at $${d.priceFormatted}/unit.`,
    actionsFn: () => [{ label: 'View Position', href: '/trade' }],
  },
  D2: {
    category: 'D', priority: 'low',
    titleFn: (d) => `Position Closed — ${d.market}`,
    bodyFn:  (d) => `Closed ${d.sizeFormatted} units. Realized PnL: +$${d.pnlFormatted}.`,
    actionsFn: () => [{ label: 'View History', href: '/portfolio' }],
  },
  D3: {
    category: 'D', priority: 'low',
    titleFn: (d) => `Position Closed — ${d.market}`,
    bodyFn:  (d) => `Closed ${d.sizeFormatted} units. Realized PnL: -$${d.pnlFormatted}.`,
    actionsFn: () => [{ label: 'View History', href: '/portfolio' }],
  },
  // ── E: Collateral ───────────────────────────────────────────
  E1: {
    category: 'E', priority: 'low',
    titleFn: () => 'Deposit Confirmed',
    bodyFn:  (d) => `$${d.amountFormatted} USDC deposited to your account.`,
    actionsFn: () => [],
  },
  E2: {
    category: 'E', priority: 'low',
    titleFn: () => 'Withdrawal Confirmed',
    bodyFn:  (d) => `$${d.amountFormatted} USDC withdrawn to your wallet.`,
    actionsFn: () => [],
  },
  // ── F: Market Status ────────────────────────────────────────
  F1: {
    category: 'F', priority: 'high',
    titleFn: (d) => `Market Paused — ${d.market}`,
    bodyFn:  () => 'This market has been paused. No new trades or position changes can be made. Your open position is safe.',
    actionsFn: () => [],
  },
  F2: {
    category: 'F', priority: 'high',
    titleFn: (d) => `Market Resumed — ${d.market}`,
    bodyFn:  () => 'Trading has resumed. Funding rates will continue from where they left off.',
    actionsFn: () => [{ label: 'Trade Now', href: '/trade' }],
  },
};

/**
 * Core function: build and persist a trader notification.
 * Called by every event handler and the state poller.
 */
async function createTraderNotification(code, userAddress, marketId, payload, txHash = null) {
  const def = NOTIFICATION_DEFS[code];
  if (!def) {
    console.warn(`⚠️  No definition for notification code: ${code}`);
    return;
  }

  const userLower   = userAddress.toLowerCase();
  const marketIdLow = (marketId || '').toLowerCase();
  const label       = marketLabel(marketId);

  // Suppression check
  if (await isDuped(userLower, marketIdLow, code)) {
    console.log(`🔕 Suppressed ${code} for ${userLower.slice(0,8)}... (dedup window active)`);
    return;
  }

  const data = { market: label, ...payload };

  const { error } = await supabase
    .from('trader_notifications')
    .insert({
      user_id:      userLower,
      category:     def.category,
      code,
      priority:     def.priority,
      market_id:    marketIdLow || null,
      market_label: label,
      title:        def.titleFn(data),
      body:         def.bodyFn(data),
      data:         payload,
      actions:      def.actionsFn(data),
      status:       'unread',
      tx_hash:      txHash,
    });

  if (error) {
    console.error(`❌ Failed to insert notification ${code}:`, error.message);
    return;
  }

  await updateDedup(userLower, marketIdLow, code);
  console.log(`🔔 [${code}] ${def.priority.toUpperCase()} → ${userLower.slice(0,10)}... | ${label}`);
}

// ==================== DATABASE FUNCTIONS ====================

async function storePriceSnapshot(market, markPrice, oraclePrice, blockNumber) {
  const timestamp = new Date().toISOString();

  // 1. Write to generic price_snapshots table
  const { error } = await supabase
    .from('price_snapshots')
    .insert({
      market_id: market.id,
      market_name: market.name,
      vamm_address: market.vammAddress.toLowerCase(),
      mark_price: markPrice,
      oracle_price: oraclePrice,
      block_number: blockNumber,
      timestamp: timestamp,
    });

  if (error) {
    console.error('Error storing price snapshot:', error.message);
  }

  // 2. Write to market-specific table if configured (for PriceIndexChart - ORACLE PRICES)
  if (market.tableName) {
    // Skip aliases from writing to the same table twice in the same loop run
    if (market.name !== 'ETH-PERP-V2') {
        const { error: specificError } = await supabase
        .from(market.tableName)
        .insert({
            price: oraclePrice, // IMPORTANT: These tables are for INDEX/ORACLE prices, not vAMM mark prices
            timestamp: timestamp,
        });

        if (specificError) {
             console.error(`Error storing to ${market.tableName}:`, specificError.message);
        } else {
            console.log(`📸 ${market.name} -> ${market.tableName}: $${oraclePrice.toFixed(2)}`);
        }
    }
  }

  // 3. Write to vamm_price_history (unified table for AdvancedChart)
  const { error: vammError } = await supabase
    .from('vamm_price_history')
    .insert({
      market: market.name,
      price: markPrice,
      twap: markPrice, // Use markPrice as TWAP fallback
      timestamp: timestamp,
    });

  if (vammError) {
    console.error(`Error storing to vamm_price_history:`, vammError.message);
  } else {
    console.log(`📊 ${market.name} -> vamm_price_history: $${markPrice.toFixed(2)}`);
  }

  return true;
}

async function indexSwapEvent(event, market) {
  const { args, blockNumber, transactionHash } = event;

  // Parse event
  const baseDeltaNum = parseFloat(formatUnits(args.baseDelta, 18));
  const quoteDeltaNum = parseFloat(formatUnits(args.quoteDelta, 18));
  const avgPrice = parseFloat(formatUnits(args.avgPriceX18, 18));
  const notionalUsd = Math.abs(quoteDeltaNum);
  const isLong = baseDeltaNum > 0;

  // Get block timestamp
  const block = await publicClient.getBlock({ blockNumber });
  const timestamp = new Date(Number(block.timestamp) * 1000).toISOString();

  // Insert into database
  const { error } = await supabase
    .from('swap_events')
    .insert({
      market_id: market.id,
      market_name: market.name,
      vamm_address: market.vammAddress.toLowerCase(),
      tx_hash: transactionHash,
      block_number: Number(blockNumber),
      timestamp,
      trader_address: args.sender.toLowerCase(),
      base_delta: baseDeltaNum.toString(),
      quote_delta: quoteDeltaNum.toString(),
      avg_price: avgPrice,
      notional_usd: notionalUsd,
      is_long: isLong,
    });

  if (error) {
    // Ignore duplicate errors
    if (error.code === '23505') return true;
    console.error('Error indexing swap:', error.message);
    return false;
  }

  console.log(`💱 ${market.name}: ${isLong ? 'LONG' : 'SHORT'} $${notionalUsd.toFixed(2)} @ $${avgPrice.toFixed(2)}`);
  return true;
}

async function getLastIndexedBlock(vammAddress) {
  const { data, error } = await supabase
    .from('swap_events')
    .select('block_number')
    .eq('vamm_address', vammAddress.toLowerCase())
    .order('block_number', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error getting last indexed block:', error.message);
    return null;
  }

  return data && data.length > 0 ? BigInt(data[0].block_number) : null;
}

async function updateMarketStats(market) {
  try {
    // Call PostgreSQL function to calculate stats
    const { data, error } = await supabase
      .rpc('calculate_market_stats_24h', { p_market_id: market.id });

    if (error) {
      console.error('Error calculating stats:', error.message);
      return;
    }

    if (data && data.length > 0) {
      const stats = data[0];

      // Upsert into cached stats table
      const { error: upsertError } = await supabase
        .from('market_stats_24h')
        .upsert({
          market_id: market.id,
          market_name: market.name,
          vamm_address: market.vammAddress.toLowerCase(),
          current_price: stats.current_price,
          price_24h_ago: stats.price_24h_ago,
          change_24h_percent: stats.change_24h_percent,
          volume_24h_usd: stats.volume_24h_usd,
          trades_24h: stats.trades_24h,
          high_24h: stats.high_24h,
          low_24h: stats.low_24h,
          last_updated: new Date().toISOString(),
        }, {
          onConflict: 'market_id',
        });

      if (upsertError) {
        console.error('Error upserting stats:', upsertError.message);
        return;
      }

      console.log(`📊 ${market.name}: $${parseFloat(stats.volume_24h_usd || 0).toFixed(2)} volume, ${parseFloat(stats.change_24h_percent || 0).toFixed(2)}% change`);
    }
  } catch (error) {
    console.error('Error updating market stats:', error.message);
  }
}

// ==================== INDEXER FUNCTIONS ====================

async function indexHistoricalEvents(market) {
  console.log(`📜 Indexing historical events for ${market.name}...`);

  try {
    // Get last indexed block or start from beginning
    let fromBlock = await getLastIndexedBlock(market.vammAddress);
    if (fromBlock) {
      fromBlock = fromBlock + 1n;
      console.log(`   Resuming from block ${fromBlock}`);
    } else {
      fromBlock = 5000000n; // Sepolia block where contracts were deployed
      console.log(`   Starting from block ${fromBlock}`);
    }

    // Get current block
    const currentBlock = await publicClient.getBlockNumber();
    const toBlock = currentBlock;

    // Fetch events in chunks to avoid rate limits
    const CHUNK_SIZE = 10000n;
    let indexed = 0;

    for (let start = fromBlock; start <= toBlock; start += CHUNK_SIZE) {
      const end = start + CHUNK_SIZE - 1n > toBlock ? toBlock : start + CHUNK_SIZE - 1n;

      const events = await publicClient.getLogs({
        address: market.vammAddress,
        event: parseAbiItem('event Swap(address indexed sender, int256 baseDelta, int256 quoteDelta, uint256 avgPriceX18)'),
        fromBlock: start,
        toBlock: end,
      });

      for (const event of events) {
        await indexSwapEvent(event, market);
        indexed++;
      }

      if (events.length > 0) {
        console.log(`   Indexed blocks ${start}-${end}: ${events.length} events`);
      }
    }

    console.log(`✅ Indexed ${indexed} historical events for ${market.name}`);
    return indexed;
  } catch (error) {
    console.error(`Error indexing historical events for ${market.name}:`, error.message);
    return 0;
  }
}

function startEventWatcher(market) {
  console.log(`👀 Watching ${market.name} for new swaps...`);

  const unwatch = publicClient.watchEvent({
    address: market.vammAddress,
    event: parseAbiItem('event Swap(address indexed sender, int256 baseDelta, int256 quoteDelta, uint256 avgPriceX18)'),
    onLogs: async (logs) => {
      for (const log of logs) {
        await indexSwapEvent(log, market);
      }
      // Update stats after new trade
      await snapshotPrice(market);
      await updateMarketStats(market);
    },
  });

  return unwatch;
}

// ==================== CLEARINGHOUSE EVENT WATCHERS ====================

/**
 * Watch all notification-relevant ClearingHouse events.
 * Returns an array of unwatch functions.
 */
function startClearingHouseWatchers() {
  const ch  = CONFIG.contracts.clearingHouse;
  const unwatches = [];

  // ── LiquidationExecuted → B1 (partial) or B2 (full) ─────────────
  unwatches.push(
    publicClient.watchEvent({
      address: ch,
      event: {
        type: 'event',
        name: 'LiquidationExecuted',
        inputs: CLEARING_HOUSE_ABI.find(e => e.name === 'LiquidationExecuted').inputs,
      },
      onLogs: async (logs) => {
        for (const log of logs) {
          const { marketId, account, size, notional, penalty } = log.args;
          const trader    = account.toLowerCase();
          const marketLow = marketId.toLowerCase();
          const sizeNum   = parseFloat(formatUnits(size, 18));
          const notionalNum = parseFloat(formatUnits(notional, 6));
          const penaltyNum  = parseFloat(formatUnits(penalty, 6));

          // Determine B1 vs B2: query the current position size to see if fully liquidated.
          // As a heuristic: if remaining = 0 we treat as B2. We don't have position state
          // in the indexer, so we read from swap_events to estimate.
          // Simplified approach: emit B2 for now (full liquidation) — can be improved later.
          const code = 'B2'; // TODO: compare against open position to detect partial (B1)

          await createTraderNotification(code, trader, marketLow, {
            sizeFormatted:      sizeNum.toFixed(4),
            notionalFormatted:  notionalNum.toFixed(2),
            penaltyFormatted:   penaltyNum.toFixed(2),
            remainingFormatted: '0',
          }, log.transactionHash);
        }
      },
    })
  );

  // ── FundingSettled → C1 ──────────────────────────────────────────
  unwatches.push(
    publicClient.watchEvent({
      address: ch,
      event: {
        type: 'event',
        name: 'FundingSettled',
        inputs: CLEARING_HOUSE_ABI.find(e => e.name === 'FundingSettled').inputs,
      },
      onLogs: async (logs) => {
        for (const log of logs) {
          const { marketId, account, fundingPayment } = log.args;
          const trader     = account.toLowerCase();
          const paymentNum = parseFloat(formatUnits(fundingPayment, 6));

          // Only notify if payment exceeds $1 threshold
          if (Math.abs(paymentNum) < 1.0) continue;

          const isPositive = paymentNum >= 0;
          await createTraderNotification('C1', trader, marketId.toLowerCase(), {
            fundingFormatted: `$${Math.abs(paymentNum).toFixed(2)}`,
            fundingSign:      isPositive ? 'received' : 'paid',
          }, log.transactionHash);
        }
      },
    })
  );

  // ── MarketPaused → F1 (paused) or F2 (resumed) ──────────────────
  unwatches.push(
    publicClient.watchEvent({
      address: ch,
      event: {
        type: 'event',
        name: 'MarketPaused',
        inputs: CLEARING_HOUSE_ABI.find(e => e.name === 'MarketPaused').inputs,
      },
      onLogs: async (logs) => {
        for (const log of logs) {
          const { marketId, isPaused } = log.args;
          const marketLow = marketId.toLowerCase();
          const code      = isPaused ? 'F1' : 'F2';

          // Get all traders with open positions in this market from swap_events
          const { data: traders } = await supabase
            .from('swap_events')
            .select('trader_address')
            .eq('market_id', marketLow)
            .order('block_number', { ascending: false });

          const uniqueTraders = [...new Set((traders || []).map(r => r.trader_address))];
          console.log(`📢 Market ${isPaused ? 'paused' : 'resumed'}: notifying ${uniqueTraders.length} traders`);

          for (const trader of uniqueTraders) {
            await createTraderNotification(code, trader, marketLow, {}, log.transactionHash);
          }
        }
      },
    })
  );

  // ── collateralDeposited → E1 ─────────────────────────────────────
  unwatches.push(
    publicClient.watchEvent({
      address: ch,
      event: {
        type: 'event',
        name: 'collateralDeposited',
        inputs: CLEARING_HOUSE_ABI.find(e => e.name === 'collateralDeposited').inputs,
      },
      onLogs: async (logs) => {
        for (const log of logs) {
          const { user, amount } = log.args;
          const amountNum = parseFloat(formatUnits(amount, 6)); // USDC = 6 decimals
          await createTraderNotification('E1', user.toLowerCase(), null, {
            amountFormatted: amountNum.toFixed(2),
          }, log.transactionHash);
        }
      },
    })
  );

  // ── collateralWithdrawn → E2 ─────────────────────────────────────
  unwatches.push(
    publicClient.watchEvent({
      address: ch,
      event: {
        type: 'event',
        name: 'collateralWithdrawn',
        inputs: CLEARING_HOUSE_ABI.find(e => e.name === 'collateralWithdrawn').inputs,
      },
      onLogs: async (logs) => {
        for (const log of logs) {
          const { user, amount } = log.args;
          const amountNum = parseFloat(formatUnits(amount, 6));
          await createTraderNotification('E2', user.toLowerCase(), null, {
            amountFormatted: amountNum.toFixed(2),
          }, log.transactionHash);
        }
      },
    })
  );

  console.log('✅ ClearingHouse event watchers started (LiquidationExecuted, FundingSettled, MarketPaused, collateralDeposited, collateralWithdrawn)');
  return unwatches;
}

async function snapshotPrice(market) {
  const markPrice = await getMarkPrice(market.vammAddress);
  const oraclePrice = await getIndexPriceFromDB(market.tableName);
  const block = await publicClient.getBlockNumber();

  if (markPrice) {
    await storePriceSnapshot(market, markPrice, oraclePrice, Number(block));
  }
}

// ==================== MAIN ====================

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  🚀 ByteStrike Event Indexer');
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  // Initialize
  try {
    initializeClients();
  } catch (error) {
    console.error('❌ Initialization failed:', error.message);
    process.exit(1);
  }

  console.log(`📍 Network: Sepolia (Chain ID: ${CONFIG.chainId})`);
  console.log(`🔗 RPC: ${CONFIG.rpcUrl}`);
  console.log(`💾 Database: ${CONFIG.supabaseUrl}`);
  console.log('');
  console.log('Settings:');
  console.log(`  • Price snapshots: Every ${CONFIG.snapshotInterval / 1000}s`);
  console.log(`  • Stats updates: Every ${CONFIG.statsInterval / 1000}s`);
  console.log(`  • Historical indexing: ${CONFIG.indexHistorical ? 'ON' : 'OFF'}`);
  console.log('');
  console.log('───────────────────────────────────────────────────');
  console.log('');

  const unwatchFns = [];

  // Process each market
  for (const market of MARKETS) {
    if (!market.active) {
      console.log(`⏭️  Skipping: ${market.name} (inactive)`);
      continue;
    }

    // Index historical events
    if (CONFIG.indexHistorical) {
      await indexHistoricalEvents(market);
    }

    // Watch for new swap events
    const unwatch = startEventWatcher(market);
    unwatchFns.push(unwatch);

    // Initial snapshot and stats
    await snapshotPrice(market);
    await updateMarketStats(market);

    console.log('');
  }

  // ── Start ClearingHouse notification watchers ─────────────────
  const chUnwatches = startClearingHouseWatchers();
  chUnwatches.forEach(fn => unwatchFns.push(fn));

  // Set up periodic tasks
  const snapshotTimer = setInterval(async () => {
    console.log('📸 Taking price snapshots...');
    for (const market of MARKETS) {
      if (market.active) {
        await snapshotPrice(market);
      }
    }
  }, CONFIG.snapshotInterval);

  const statsTimer = setInterval(async () => {
    console.log('📊 Updating 24h statistics...');
    for (const market of MARKETS) {
      if (market.active) {
        await updateMarketStats(market);
      }
    }
  }, CONFIG.statsInterval);

  console.log('✅ Indexer running successfully!');
  console.log('');
  console.log('Press Ctrl+C to stop');
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  // Graceful shutdown
  const cleanup = () => {
    console.log('');
    console.log('🛑 Shutting down...');
    unwatchFns.forEach(fn => fn());
    clearInterval(snapshotTimer);
    clearInterval(statsTimer);
    console.log('✅ Stopped gracefully');
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

// Start the indexer
main().catch((error) => {
  console.error('');
  console.error('❌ Fatal error:', error);
  console.error('');
  process.exit(1);
});
