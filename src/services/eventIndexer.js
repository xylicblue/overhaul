/**
 * Event Indexer Service
 * Listens to vAMM Swap events and stores them in Supabase
 * Also periodically snapshots mark prices for 24h change calculation
 */

import { createClient } from '@supabase/supabase-js';
import { createPublicClient, http, parseAbiItem, formatUnits } from 'viem';
import { sepolia } from 'viem/chains';
import { SEPOLIA_CONTRACTS, MARKET_IDS } from '../contracts/addresses';
import VAMMABI from '../contracts/abis/vAMM.json';

// Supabase client (will use service role key from env)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY; // Need to add this

let supabase = null;

// Public client for reading blockchain data
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http('https://ethereum-sepolia-rpc.publicnode.com'),
});

// Market configurations
const MARKETS = [
  {
    id: MARKET_IDS['H100-PERP'],
    name: 'H100-PERP',
    displayName: 'H100 GPU',
    vammAddress: SEPOLIA_CONTRACTS.vammProxy,
  },
  {
    id: MARKET_IDS['ETH-PERP-V2'],
    name: 'ETH-PERP-V2',
    displayName: 'H100 GPU',
    vammAddress: SEPOLIA_CONTRACTS.vammProxy,
  },
  {
    id: MARKET_IDS['ETH-PERP'],
    name: 'ETH-PERP',
    displayName: 'Test Market [OLD]',
    vammAddress: SEPOLIA_CONTRACTS.vammProxyOld,
  },
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
    supabase = createClient(supabaseUrl, import.meta.env.VITE_SUPABASE_ANON_KEY);
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
      abi: VAMMABI.abi,
      functionName: 'getMarkPrice',
    });
    return parseFloat(formatUnits(price, 18));
  } catch (error) {
    console.error('Error fetching mark price:', error);
    return null;
  }
}

/**
 * Get oracle price
 */
async function getOraclePrice() {
  try {
    // Import dynamically to avoid circular dependencies
    const { useOraclePrice } = await import('../hooks/useOracle');
    // For indexer, we'll just fetch directly from contract
    const OracleABI = (await import('../contracts/abis/Oracle.json')).default;

    const price = await publicClient.readContract({
      address: SEPOLIA_CONTRACTS.oracle,
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

  // Insert into database
  const { data, error } = await supabase
    .from('swap_events')
    .insert({
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
    })
    .select();

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
 * Get last indexed block number for a market
 */
async function getLastIndexedBlock(vammAddress) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('swap_events')
    .select('block_number')
    .eq('vamm_address', vammAddress.toLowerCase())
    .order('block_number', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error getting last indexed block:', error);
    return null;
  }

  return data && data.length > 0 ? BigInt(data[0].block_number) : null;
}

/**
 * Index historical Swap events for a market
 */
export async function indexHistoricalEvents(market, fromBlock = 'earliest', toBlock = 'latest') {
  console.log(`📊 Indexing historical events for ${market.name}...`);

  try {
    // Get last indexed block if resuming
    if (fromBlock === 'earliest') {
      const lastBlock = await getLastIndexedBlock(market.vammAddress);
      if (lastBlock) {
        fromBlock = lastBlock + 1n;
        console.log(`Resuming from block ${fromBlock}`);
      }
    }

    // Get Swap events
    const swapEvents = await publicClient.getLogs({
      address: market.vammAddress,
      event: parseAbiItem('event Swap(address indexed sender, int256 baseDelta, int256 quoteDelta, uint256 avgPriceX18)'),
      fromBlock,
      toBlock,
    });

    console.log(`Found ${swapEvents.length} swap events`);

    // Index each event
    for (const event of swapEvents) {
      await indexSwapEvent(event, market);
    }

    console.log(`✅ Indexed ${swapEvents.length} events for ${market.name}`);
    return swapEvents.length;
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
    event: parseAbiItem('event Swap(address indexed sender, int256 baseDelta, int256 quoteDelta, uint256 avgPriceX18)'),
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

/**
 * Snapshot current price for a market
 */
export async function snapshotPrice(market) {
  const markPrice = await getMarkPrice(market.vammAddress);
  const oraclePrice = await getOraclePrice();
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
          last_updated: new Date().toISOString(),
        }, {
          onConflict: 'market_id',
        });

      if (upsertError) {
        console.error('Error upserting market stats:', error);
        return;
      }

      console.log(`📈 Updated stats for ${market.name}: $${stats.volume_24h_usd} volume, ${stats.change_24h_percent}% change`);
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
