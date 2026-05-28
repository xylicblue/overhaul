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

  // Contracts (Sepolia)
  contracts: {
    vammProxy: '0x81C40Fb63dFBa1C7d6C32b7a23fc25bd2E6bE3Cc',
    vammProxyOld: '0xd5d946Fc7c41C1AD7C0aC1BdfDCE53FE0a860204',
    oracle: '0x0Ed715b613E19028eB9e5b06cc696B45C7d4D1F9',
  },

  // Market IDs (keccak256 of market name)
  marketIds: {
    'H100-PERP': '0x1a9c55d7e8e99e4e5e6b6f5c7a4e9e8f6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0',
    'ETH-PERP-V2': '0x2b8d66e7f9f88f5f6f7c8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b',
    'ETH-PERP': '0x3c9e77f8g0g99g6g7g8d9f0g1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0c',
  },

  // Indexer settings
  snapshotInterval: parseInt(process.env.SNAPSHOT_INTERVAL) || 60000, // 1 minute
  statsInterval: parseInt(process.env.STATS_INTERVAL) || 300000, // 5 minutes
  indexHistorical: process.env.INDEX_HISTORICAL !== 'false', // Default: true
};

// ==================== MARKETS ====================

const MARKETS = [
  {
    id: CONFIG.marketIds['H100-PERP'],
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
    id: CONFIG.marketIds['ETH-PERP-V2'],
    name: 'ETH-PERP-V2',
    displayName: 'H100 GPU',
    vammAddress: CONFIG.contracts.vammProxy,
    // Alias to H100-PERP data
    tableName: 'price_data',
    active: true,
  },
  {
    id: CONFIG.marketIds['ETH-PERP'],
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
    "type": "event",
    "name": "Swap",
    "inputs": [
      {"name": "sender", "type": "address", "indexed": true},
      {"name": "baseDelta", "type": "int256", "indexed": false},
      {"name": "quoteDelta", "type": "int256", "indexed": false},
      {"name": "avgPriceX18", "type": "uint256", "indexed": false}
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

async function getOraclePrice() {
  try {
    const price = await publicClient.readContract({
      address: CONFIG.contracts.oracle,
      abi: ORACLE_ABI,
      functionName: 'getPrice',
    });
    return parseFloat(formatUnits(price, 18));
  } catch (error) {
    console.error('Error fetching oracle price:', error.message);
    return null;
  }
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

async function snapshotPrice(market) {
  const markPrice = await getMarkPrice(market.vammAddress);
  const oraclePrice = await getOraclePrice();
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

    // Watch for new events
    const unwatch = startEventWatcher(market);
    unwatchFns.push(unwatch);

    // Initial snapshot and stats
    await snapshotPrice(market);
    await updateMarketStats(market);

    console.log('');
  }

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
