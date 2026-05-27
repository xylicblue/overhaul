/**
 * Event Indexer Service
 * Listens to vAMM Swap events and stores them in Supabase
 * Also periodically snapshots mark prices for 24h change calculation
 */

import { createClient } from '@supabase/supabase-js';
import { createPublicClient, http, parseAbiItem, formatUnits } from 'viem';
import { sepolia } from 'viem/chains';
import { SEPOLIA_CONTRACTS, getActiveMarkets } from '../contracts/addresses';

const runtimeEnv = typeof process !== 'undefined' ? process.env : {};
const viteEnv = import.meta.env || {};
const env = (key) => viteEnv[key] || runtimeEnv[key];

function normalizeSupabaseUrl(value) {
  const url = value?.trim().replace(/^['"]|['"]$/g, "");
  if (!url || /^https?:\/\//i.test(url)) return url;
  if (/^[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) return `https://${url.replace(/\/$/, "")}`;
  return url;
}

// Supabase client (will use service role key from env)
const supabaseUrl = normalizeSupabaseUrl(env('VITE_SUPABASE_URL') || env('SUPABASE_URL'));
const supabaseServiceKey = env('VITE_SUPABASE_SERVICE_KEY') || env('SUPABASE_SERVICE_KEY') || env('SUPABASE_SERVICE_ROLE_KEY');
const supabaseAnonKey = env('VITE_SUPABASE_ANON_KEY') || env('SUPABASE_ANON_KEY') || env('SUPABASE_ANON_PUBLIC_KEY');

let supabase = null;
let swapEventCursorColumnsSupported = true;

// Public client for reading blockchain data
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(env('VITE_SEPOLIA_RPC_URL') || env('SEPOLIA_RPC_URL') || env('RPC_URL') || 'https://ethereum-sepolia-rpc.publicnode.com'),
});

// Market configurations
const MARKETS = getActiveMarkets()
  .filter((market) => !market.isAlias)
  .map((market) => ({
    id: market.id,
    name: market.name,
    displayName: market.displayName,
    vammAddress: market.vamm,
    oracleAddress: market.oracle,
  }));

const MARKET_BY_ID = Object.fromEntries(MARKETS.map((market) => [market.id.toLowerCase(), market]));
const pendingFundingByTrade = new Map();

const SWAP_EVENT_ABI = parseAbiItem('event Swap(address indexed sender, int256 baseDelta, int256 quoteDelta, uint256 avgPriceX18)');

function numberFromLogIndex(value) {
  return value == null ? null : Number(value);
}

function getLogCursor(log) {
  return {
    blockNumber: BigInt(log.blockNumber),
    transactionIndex: numberFromLogIndex(log.transactionIndex),
    logIndex: numberFromLogIndex(log.logIndex),
    txHash: log.transactionHash?.toLowerCase() ?? null,
  };
}

function compareLogCursor(a, b) {
  if (a.blockNumber !== b.blockNumber) {
    return a.blockNumber < b.blockNumber ? -1 : 1;
  }
  if (a.transactionIndex !== b.transactionIndex) {
    return a.transactionIndex < b.transactionIndex ? -1 : 1;
  }
  if (a.logIndex !== b.logIndex) {
    return a.logIndex < b.logIndex ? -1 : 1;
  }
  return 0;
}

function sortLogsByChainOrder(logs) {
  return [...logs].sort((a, b) => compareLogCursor(getLogCursor(a), getLogCursor(b)));
}

function swapLogKey(log) {
  const cursor = getLogCursor(log);
  if (cursor.transactionIndex != null && cursor.logIndex != null) {
    return `log:${cursor.transactionIndex}:${cursor.logIndex}`;
  }
  return `tx:${cursor.txHash}`;
}

const VAMM_READ_ABI = [
  {
    type: 'function',
    name: 'getMarkPrice',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalLongOI',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalShortOI',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
];

const CLEARING_HOUSE_ACCOUNTING_ABI = [
  parseAbiItem('event TradeExecuted(address indexed user, bytes32 indexed marketId, int256 baseDelta, int256 quoteDelta, uint256 executionPrice, int256 newSize, uint256 newMargin, int256 realizedPnL, uint256 fee)'),
  parseAbiItem('event PositionClosed(address indexed user, bytes32 indexed marketId, uint128 size, uint256 exitPrice, int256 realizedPnL)'),
  parseAbiItem('event FundingSettled(bytes32 indexed marketId, address indexed account, int256 fundingPayment)'),
];

/**
 * Initialize Supabase client with service key
 */
export function initializeIndexer(serviceKey = null) {
  const key = serviceKey || supabaseServiceKey;

  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL not configured');
  }

  if (!key) {
    console.warn('⚠️ No service key provided. Using anon key (limited permissions)');
    // Fallback to anon key for read-only operations
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    return false; // Can't write
  }

  supabase = createClient(supabaseUrl, key);
  return true; // Can write
}

/**
 * Get mark price from vAMM contract
 */
async function getMarkPrice(vammAddress) {
  try {
    const price = await publicClient.readContract({
      address: vammAddress,
      abi: VAMM_READ_ABI,
      functionName: 'getMarkPrice',
    });
    return parseFloat(formatUnits(price, 18));
  } catch (error) {
    console.error('Error fetching mark price:', error);
    return null;
  }
}

async function getOpenInterestUsd(market) {
  try {
    const [longOI, shortOI, markPrice] = await Promise.all([
      publicClient.readContract({
        address: market.vammAddress,
        abi: VAMM_READ_ABI,
        functionName: 'totalLongOI',
      }),
      publicClient.readContract({
        address: market.vammAddress,
        abi: VAMM_READ_ABI,
        functionName: 'totalShortOI',
      }),
      publicClient.readContract({
        address: market.vammAddress,
        abi: VAMM_READ_ABI,
        functionName: 'getMarkPrice',
      }),
    ]);

    const openInterestX18 = ((longOI + shortOI) * markPrice) / 10n ** 18n;
    return parseFloat(formatUnits(openInterestX18, 18));
  } catch (error) {
    console.error(`Error fetching open interest for ${market.name}:`, error);
    return null;
  }
}

async function getExistingOpenInterestUsd(marketId) {
  if (!supabase) return null;

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

/**
 * Get oracle price
 */
async function getOraclePrice(oracleAddress) {
  try {
    const OracleABI = (await import('../contracts/abis/Oracle.json')).default;

    const price = await publicClient.readContract({
      address: oracleAddress,
      abi: OracleABI.abi,
      functionName: 'getPrice',
    });
    return parseFloat(formatUnits(price, 18));
  } catch (error) {
    console.error('Error fetching oracle price:', error);
    return null;
  }
}

/**
 * Store price snapshot in Supabase
 */
async function storePriceSnapshot(market, markPrice, oraclePrice, blockNumber) {
  if (!supabase) {
    console.error('Supabase not initialized');
    return false;
  }

  const { data, error } = await supabase
    .from('price_snapshots')
    .insert({
      market_id: market.id,
      market_name: market.name,
      vamm_address: market.vammAddress.toLowerCase(),
      mark_price: markPrice,
      oracle_price: oraclePrice,
      block_number: blockNumber,
      timestamp: new Date().toISOString(),
    });

  if (error) {
    console.error('Error storing price snapshot:', error);
    return false;
  }

  console.log(`✅ Stored price snapshot for ${market.name}: $${markPrice}`);
  return true;
}

function tradeAccountingKey(txHash, userAddress, marketId) {
  return `${txHash.toLowerCase()}:${userAddress.toLowerCase()}:${marketId.toLowerCase()}`;
}

function canonicalSideFromTrade(baseDelta, newSize) {
  if (baseDelta < 0n && newSize >= 0n) return 'Long';
  if (baseDelta > 0n && newSize <= 0n) return 'Short';
  return baseDelta > 0n ? 'Long' : 'Short';
}

async function getBlockTimestamp(blockNumber) {
  const block = await publicClient.getBlock({ blockNumber });
  return new Date(Number(block.timestamp) * 1000).toISOString();
}

async function writeCanonicalTrade(event) {
  if (!supabase) {
    console.error('Supabase not initialized');
    return false;
  }

  const { args, blockNumber, transactionHash } = event;
  const marketId = args.marketId.toLowerCase();
  const market = MARKET_BY_ID[marketId];

  if (!market) {
    console.warn(`Skipping TradeExecuted for unknown market ${marketId}`);
    return false;
  }

  const userAddress = args.user.toLowerCase();
  const key = tradeAccountingKey(transactionHash, userAddress, marketId);
  const timestamp = await getBlockTimestamp(blockNumber);
  const fundingEarned = pendingFundingByTrade.get(key) ?? 0;
  const size = Math.abs(parseFloat(formatUnits(args.baseDelta, 18)));
  const notional = Math.abs(parseFloat(formatUnits(args.quoteDelta, 18)));

  const payload = {
    user_address: userAddress,
    market: market.name,
    side: canonicalSideFromTrade(args.baseDelta, args.newSize),
    size,
    price: parseFloat(formatUnits(args.executionPrice, 18)),
    notional,
    tx_hash: transactionHash,
    created_at: timestamp,
    pnl: parseFloat(formatUnits(args.realizedPnL, 18)),
    funding_earned: fundingEarned,
    fees_paid: parseFloat(formatUnits(args.fee, 18)),
  };

  const { data: existing, error: selectError } = await supabase
    .from('trade_history')
    .select('id')
    .eq('tx_hash', transactionHash)
    .eq('user_address', userAddress)
    .limit(20);

  if (selectError) {
    console.error('Error checking canonical trade row:', selectError);
    return false;
  }

  const existingIds = (existing || []).map((row) => row.id);
  const query = existingIds.length > 0
    ? supabase.from('trade_history').update(payload).in('id', existingIds)
    : supabase.from('trade_history').insert(payload);

  const { error } = await query;
  if (error) {
    console.error('Error writing canonical trade row:', error);
    return false;
  }

  pendingFundingByTrade.delete(key);
  console.log(`Indexed canonical trade: ${market.name} ${payload.side} $${notional.toFixed(2)} fee $${payload.fees_paid.toFixed(2)}`);
  return true;
}

async function applyFundingSettlement(event) {
  if (!supabase) {
    console.error('Supabase not initialized');
    return false;
  }

  const { args, transactionHash } = event;
  const marketId = args.marketId.toLowerCase();
  const userAddress = args.account.toLowerCase();
  const key = tradeAccountingKey(transactionHash, userAddress, marketId);
  const payment = parseFloat(formatUnits(args.fundingPayment, 18));
  const nextFunding = (pendingFundingByTrade.get(key) || 0) + payment;
  pendingFundingByTrade.set(key, nextFunding);

  const { data: rows, error: selectError } = await supabase
    .from('trade_history')
    .select('id')
    .eq('tx_hash', transactionHash)
    .eq('user_address', userAddress)
    .limit(20);

  if (selectError) {
    console.error('Error checking trade row for funding:', selectError);
    return false;
  }

  if (!rows?.length) return true;

  const { error } = await supabase
    .from('trade_history')
    .update({ funding_earned: nextFunding })
    .in('id', rows.map((row) => row.id));

  if (error) {
    console.error('Error applying canonical funding:', error);
    return false;
  }

  return true;
}

async function applyPositionClosed(event) {
  if (!supabase) {
    console.error('Supabase not initialized');
    return false;
  }

  const { args, transactionHash } = event;
  const userAddress = args.user.toLowerCase();
  const { data: rows, error: selectError } = await supabase
    .from('trade_history')
    .select('id')
    .eq('tx_hash', transactionHash)
    .eq('user_address', userAddress)
    .limit(20);

  if (selectError) {
    console.error('Error checking trade row for PositionClosed:', selectError);
    return false;
  }

  if (!rows?.length) return true;

  const { error } = await supabase
    .from('trade_history')
    .update({
      size: Math.abs(parseFloat(formatUnits(args.size, 18))),
      price: parseFloat(formatUnits(args.exitPrice, 18)),
      pnl: parseFloat(formatUnits(args.realizedPnL, 18)),
    })
    .in('id', rows.map((row) => row.id));

  if (error) {
    console.error('Error applying PositionClosed accounting:', error);
    return false;
  }

  return true;
}

/**
 * Index a single Swap event
 */
async function indexSwapEvent(event, market) {
  if (!supabase) {
    console.error('Supabase not initialized');
    return false;
  }

  const { args, blockNumber, transactionHash } = event;

  // Parse event args
  // event Swap(address indexed sender, int256 baseDelta, int256 quoteDelta, uint256 avgPriceX18)
  const sender = args.sender;
  const baseDelta = args.baseDelta;
  const quoteDelta = args.quoteDelta;
  const avgPriceX18 = args.avgPriceX18;

  // Convert to numbers
  const baseDeltaNum = parseFloat(formatUnits(baseDelta, 18));
  const quoteDeltaNum = parseFloat(formatUnits(quoteDelta, 18));
  const avgPrice = parseFloat(formatUnits(avgPriceX18, 18));

  // Calculate notional value (absolute value of quote delta)
  const notionalUsd = Math.abs(quoteDeltaNum);
  const isLong = baseDeltaNum > 0;

  // Get block timestamp
  const block = await publicClient.getBlock({ blockNumber });
  const timestamp = new Date(Number(block.timestamp) * 1000).toISOString();

  const payload = {
    market_id: market.id,
    market_name: market.name,
    vamm_address: market.vammAddress.toLowerCase(),
    tx_hash: transactionHash,
    block_number: Number(blockNumber),
    timestamp,
    trader_address: sender.toLowerCase(),
    base_delta: baseDeltaNum.toString(),
    quote_delta: quoteDeltaNum.toString(),
    avg_price: avgPrice,
    notional_usd: notionalUsd,
    is_long: isLong,
  };

  if (swapEventCursorColumnsSupported) {
    payload.transaction_index = numberFromLogIndex(event.transactionIndex);
    payload.log_index = numberFromLogIndex(event.logIndex);
  }

  // Insert into database
  let { data, error } = await supabase
    .from('swap_events')
    .insert(payload)
    .select();

  if (error && swapEventCursorColumnsSupported && /transaction_index|log_index/i.test(error.message || "")) {
    swapEventCursorColumnsSupported = false;
    delete payload.transaction_index;
    delete payload.log_index;
    ({ data, error } = await supabase.from('swap_events').insert(payload).select());
  }

  if (error) {
    // Ignore duplicate errors (event already indexed)
    if (error.code === '23505') {
      return true;
    }
    console.error('Error indexing swap event:', error);
    return false;
  }

  console.log(`✅ Indexed swap: ${isLong ? 'LONG' : 'SHORT'} $${notionalUsd.toFixed(2)} @ $${avgPrice.toFixed(2)}`);
  return true;
}

/**
 * Get the last indexed event cursor for a market.
 */
async function getLastIndexedSwapCursor(vammAddress) {
  if (!supabase) return null;

  let { data, error } = await supabase
    .from('swap_events')
    .select('block_number,transaction_index,log_index,tx_hash')
    .eq('vamm_address', vammAddress.toLowerCase())
    .order('block_number', { ascending: false })
    .order('transaction_index', { ascending: false, nullsFirst: false })
    .order('log_index', { ascending: false, nullsFirst: false })
    .limit(1);

  if (error) {
    swapEventCursorColumnsSupported = false;
    ({ data, error } = await supabase
      .from('swap_events')
      .select('block_number,tx_hash')
      .eq('vamm_address', vammAddress.toLowerCase())
      .order('block_number', { ascending: false })
      .limit(1));

    if (error) {
      console.error('Error getting last indexed cursor:', error);
      return null;
    }
  }

  if (!data?.length) return null;

  const row = data[0];
  return {
    blockNumber: BigInt(row.block_number),
    transactionIndex: row.transaction_index == null ? null : Number(row.transaction_index),
    logIndex: row.log_index == null ? null : Number(row.log_index),
    txHash: row.tx_hash?.toLowerCase() ?? null,
  };
}

async function getIndexedSwapKeysForBlock(vammAddress, blockNumber) {
  if (!supabase) return new Set();

  const { data, error } = await supabase
    .from('swap_events')
    .select('tx_hash,transaction_index,log_index')
    .eq('vamm_address', vammAddress.toLowerCase())
    .eq('block_number', Number(blockNumber));

  if (error) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('swap_events')
      .select('tx_hash')
      .eq('vamm_address', vammAddress.toLowerCase())
      .eq('block_number', Number(blockNumber));

    if (fallbackError) {
      console.error('Error getting indexed swap keys:', fallbackError);
      return new Set();
    }

    return new Set((fallbackData || []).map((row) => `tx:${row.tx_hash?.toLowerCase()}`));
  }

  return new Set((data || []).map((row) => {
    if (row.transaction_index != null && row.log_index != null) {
      return `log:${Number(row.transaction_index)}:${Number(row.log_index)}`;
    }
    return `tx:${row.tx_hash?.toLowerCase()}`;
  }));
}

/**
 * Index historical Swap events for a market
 */
export async function indexHistoricalEvents(market, fromBlock = 'earliest', toBlock = 'latest') {
  console.log(`📊 Indexing historical events for ${market.name}...`);

  try {
    let lastCursor = null;
    let resumeBlockKeys = new Set();

    // Get last indexed block if resuming
    if (fromBlock === 'earliest') {
      lastCursor = await getLastIndexedSwapCursor(market.vammAddress);
      if (lastCursor) {
        fromBlock = lastCursor.blockNumber;
        resumeBlockKeys = await getIndexedSwapKeysForBlock(market.vammAddress, lastCursor.blockNumber);
        const suffix = lastCursor.logIndex !== null
          ? `txIndex ${lastCursor.transactionIndex}, logIndex ${lastCursor.logIndex}`
          : `tx ${lastCursor.txHash}`;
        console.log(`Resuming from block ${fromBlock} after ${suffix}`);
      }
    }

    // Get Swap events
    const swapEvents = await publicClient.getLogs({
      address: market.vammAddress,
      event: SWAP_EVENT_ABI,
      fromBlock,
      toBlock,
    });

    let indexed = 0;
    for (const event of sortLogsByChainOrder(swapEvents)) {
      if (lastCursor && event.blockNumber === lastCursor.blockNumber) {
        const cursor = getLogCursor(event);
        const hasExactCursor = cursor.transactionIndex != null && cursor.logIndex != null
          && lastCursor.transactionIndex != null && lastCursor.logIndex != null;

        if (
          resumeBlockKeys.has(swapLogKey(event))
          || (hasExactCursor && compareLogCursor(cursor, lastCursor) <= 0)
        ) {
          continue;
        }
      }

      const ok = await indexSwapEvent(event, market);
      if (!ok) {
        throw new Error(`failed to index swap ${event.transactionHash} at block ${event.blockNumber}`);
      }
      indexed++;
    }

    console.log(`Found ${swapEvents.length} swap events; indexed ${indexed} new events`);
    console.log(`✅ Indexed ${indexed} events for ${market.name}`);
    return indexed;
  } catch (error) {
    console.error('Error indexing historical events:', error);
    return 0;
  }
}

/**
 * Start watching for new Swap events in real-time
 */
export function startEventWatcher(market) {
  console.log(`👀 Watching for new swaps on ${market.name}...`);

  const unwatch = publicClient.watchEvent({
    address: market.vammAddress,
    event: SWAP_EVENT_ABI,
    onLogs: async (logs) => {
      console.log(`🔔 New swap event on ${market.name}`);
      for (const log of logs) {
        await indexSwapEvent(log, market);
      }

      // Also update price snapshot when new trade happens
      await snapshotPrice(market);
      await updateMarketStats(market);
    },
  });

  return unwatch;
}

function startClearingHouseAccountingWatcher() {
  console.log('Watching ClearingHouse accounting events...');

  const [tradeExecutedEvent, positionClosedEvent, fundingSettledEvent] = CLEARING_HOUSE_ACCOUNTING_ABI;

  return [
    publicClient.watchEvent({
      address: SEPOLIA_CONTRACTS.clearingHouse,
      event: tradeExecutedEvent,
      onLogs: async (logs) => {
        for (const log of logs) {
          await writeCanonicalTrade(log);
        }
      },
    }),
    publicClient.watchEvent({
      address: SEPOLIA_CONTRACTS.clearingHouse,
      event: positionClosedEvent,
      onLogs: async (logs) => {
        for (const log of logs) {
          await applyPositionClosed(log);
        }
      },
    }),
    publicClient.watchEvent({
      address: SEPOLIA_CONTRACTS.clearingHouse,
      event: fundingSettledEvent,
      onLogs: async (logs) => {
        for (const log of logs) {
          await applyFundingSettlement(log);
        }
      },
    }),
  ];
}

/**
 * Snapshot current price for a market
 */
export async function snapshotPrice(market) {
  const markPrice = await getMarkPrice(market.vammAddress);
  const oraclePrice = await getOraclePrice(market.oracleAddress);
  const block = await publicClient.getBlockNumber();

  if (markPrice) {
    await storePriceSnapshot(market, markPrice, oraclePrice, Number(block));
  }
}

/**
 * Update 24h market stats for a market
 */
export async function updateMarketStats(market) {
  if (!supabase) return;

  try {
    // Call the PostgreSQL function to calculate stats
    const { data, error } = await supabase
      .rpc('calculate_market_stats_24h', { p_market_id: market.id });

    if (error) {
      console.error('Error calculating market stats:', error);
      return;
    }

    if (data && data.length > 0) {
      const stats = data[0];
      const openInterestUsd = await getOpenInterestUsd(market);
      const existingOpenInterestUsd = openInterestUsd == null
        ? await getExistingOpenInterestUsd(market.id)
        : null;
      const nextOpenInterestUsd = openInterestUsd ?? existingOpenInterestUsd ?? 0;

      // Upsert into market_stats_24h
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
        console.error('Error upserting market stats:', error);
        return;
      }

      console.log(`📈 Updated stats for ${market.name}: $${stats.volume_24h_usd} volume, ${stats.change_24h_percent}% change, $${nextOpenInterestUsd} OI`);
    }
  } catch (error) {
    console.error('Error updating market stats:', error);
  }
}

/**
 * Start the full indexer service
 * - Index historical events
 * - Watch for new events
 * - Snapshot prices periodically
 */
export async function startIndexer(options = {}) {
  const {
    indexHistorical = true,
    watchEvents = true,
    snapshotInterval = 60000, // 1 minute
    statsInterval = 300000, // 5 minutes
    serviceKey = null,
  } = options;

  // Initialize Supabase
  const canWrite = initializeIndexer(serviceKey);

  if (!canWrite) {
    console.warn('⚠️ Indexer running in read-only mode');
    return null;
  }

  console.log('🚀 Starting event indexer...');

  const unwatchFns = [];

  // Process each market
  for (const market of MARKETS) {
    if (market.name === 'ETH-PERP') {
      console.log(`⏭️ Skipping deprecated market: ${market.name}`);
      continue;
    }

    // Index historical events (from last indexed block)
    if (indexHistorical) {
      await indexHistoricalEvents(market);
    }

    // Watch for new events
    if (watchEvents) {
      const unwatch = startEventWatcher(market);
      unwatchFns.push(unwatch);
    }

    // Initial price snapshot and stats
    await snapshotPrice(market);
    await updateMarketStats(market);
  }

  if (watchEvents) {
    unwatchFns.push(...startClearingHouseAccountingWatcher());
  }

  // Set up periodic price snapshots
  const snapshotTimer = setInterval(async () => {
    console.log('📸 Taking periodic price snapshots...');
    for (const market of MARKETS) {
      if (market.name !== 'ETH-PERP') {
        await snapshotPrice(market);
      }
    }
  }, snapshotInterval);

  // Set up periodic stats updates
  const statsTimer = setInterval(async () => {
    console.log('📊 Updating market stats...');
    for (const market of MARKETS) {
      if (market.name !== 'ETH-PERP') {
        await updateMarketStats(market);
      }
    }
  }, statsInterval);

  console.log('✅ Indexer started successfully');

  // Return cleanup function
  return () => {
    console.log('🛑 Stopping indexer...');
    unwatchFns.forEach(unwatch => unwatch());
    clearInterval(snapshotTimer);
    clearInterval(statsTimer);
  };
}

/**
 * Get 24h stats for a market (read from cached table)
 */
export async function get24hStats(marketId) {
  if (!supabase) {
    initializeIndexer(); // Initialize with anon key for reading
  }

  const { data, error } = await supabase
    .from('market_stats_24h')
    .select('*')
    .eq('market_id', marketId)
    .single();

  if (error) {
    console.error('Error fetching 24h stats:', error);
    return null;
  }

  return data;
}

export { supabase };
