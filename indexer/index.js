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
import { SEPOLIA_CONTRACTS as DEPLOYED_CONTRACTS, getActiveMarkets } from '../src/contracts/addresses.js';
import { toIndexerPriceSource } from '../src/config/marketsConfig.js';

// Load environment variables
dotenv.config();

function normalizeSupabaseUrl(value) {
  const url = value?.trim().replace(/^['"]|['"]$/g, "");
  if (!url || /^https?:\/\//i.test(url)) return url;
  if (/^[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) return `https://${url.replace(/\/$/, "")}`;
  return url;
}

// ==================== CONFIGURATION ====================

const CONFIG = {
  // Supabase
  supabaseUrl: normalizeSupabaseUrl(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY,

  // Blockchain
  rpcUrl: process.env.RPC_URL || process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
  chainId: 11155111, // Sepolia

  // Contracts (Sepolia)
  contracts: {
    clearingHouse: DEPLOYED_CONTRACTS.clearingHouse,
    collateralVault: DEPLOYED_CONTRACTS.collateralVault,
    marketRegistry: DEPLOYED_CONTRACTS.marketRegistry,
    cuOracle: DEPLOYED_CONTRACTS.cuOracle,
    collateralOracle: DEPLOYED_CONTRACTS.collateralOracle,
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

const MARKETS = getActiveMarkets()
  .filter((market) => !market.isAlias)
  .map((market) => ({
    id: market.id,
    name: market.name,
    displayName: market.displayName,
    vammAddress: market.vamm,
    oracleAddress: market.oracle,
    ...toIndexerPriceSource(market.name),
    active: market.active,
  }));

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
    "type": "function",
    "name": "totalLongOI",
    "inputs": [],
    "outputs": [{"type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalShortOI",
    "inputs": [],
    "outputs": [{"type": "uint256"}],
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
    throw new Error('SUPABASE_SERVICE_KEY, SUPABASE_SERVICE_ROLE_KEY, or VITE_SUPABASE_SERVICE_KEY not configured');
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

async function getOpenInterestUsd(market) {
  try {
    const [longOI, shortOI, markPrice] = await Promise.all([
      publicClient.readContract({
        address: market.vammAddress,
        abi: VAMM_ABI,
        functionName: 'totalLongOI',
      }),
      publicClient.readContract({
        address: market.vammAddress,
        abi: VAMM_ABI,
        functionName: 'totalShortOI',
      }),
      publicClient.readContract({
        address: market.vammAddress,
        abi: VAMM_ABI,
        functionName: 'getMarkPrice',
      }),
    ]);

    const openInterestX18 = ((longOI + shortOI) * markPrice) / 10n ** 18n;
    return parseFloat(formatUnits(openInterestX18, 18));
  } catch (error) {
    console.error(`Error fetching open interest for ${market.name}:`, error.message);
    return null;
  }
}

async function getExistingOpenInterestUsd(marketId) {
  try {
    const { data, error } = await supabase
      .from('market_stats_24h')
      .select('open_interest_usd')
      .eq('market_id', marketId)
      .maybeSingle();

    if (error) return null;
    return data?.open_interest_usd ?? null;
  } catch {
    return null;
  }
}

async function getIndexPriceFromDB(market) {
  if (!market?.tableName) return null;
  const timeField = market.timeField || 'created_at';
  try {
    let query = supabase
      .from(market.tableName)
      .select(`${market.priceField}, ${timeField}`);

    if (market.providerFilter) {
      query = query.eq('provider_name', market.providerFilter);
    }

    const { data, error } = await query
      .order(timeField, { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return parseFloat(data[market.priceField]);
  } catch (error) {
    console.error(`Error fetching index price from DB (${market.tableName}):`, error.message);
    return null;
  }
}

// ==================== NOTIFICATION ENGINE ====================

/**
 * Map market ID bytes32 → human-readable label.
 * Falls back to truncated marketId if not found.
 */
const MARKET_ID_TO_LABEL = Object.fromEntries(
  MARKETS.map((market) => [market.id.toLowerCase(), market.name])
);

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

  // 2. Write to vamm_price_history (unified table for AdvancedChart).
  // The market-specific index tables are source-of-truth bot tables, so the
  // indexer reads from them but does not write synthetic rows back into them.
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
      const openInterestUsd = await getOpenInterestUsd(market);
      const existingOpenInterestUsd = openInterestUsd == null
        ? await getExistingOpenInterestUsd(market.id)
        : null;
      const nextOpenInterestUsd = openInterestUsd ?? existingOpenInterestUsd ?? 0;

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
          open_interest_usd: nextOpenInterestUsd,
          last_updated: new Date().toISOString(),
        }, {
          onConflict: 'market_id',
        });

      if (upsertError) {
        console.error('Error upserting stats:', upsertError.message);
        return;
      }

      console.log(`📊 ${market.name}: $${parseFloat(stats.volume_24h_usd || 0).toFixed(2)} volume, ${parseFloat(stats.change_24h_percent || 0).toFixed(2)}% change, $${parseFloat(nextOpenInterestUsd || 0).toFixed(2)} OI`);
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
  const oraclePrice = await getIndexPriceFromDB(market);
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
