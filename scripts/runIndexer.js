#!/usr/bin/env node

/**
 * ByteStrike Event Indexer
 * Indexes vAMM Swap events and price snapshots for 24h stats
 */

import { startIndexer } from '../src/services/eventIndexer.js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get directory of current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
const envPath = join(__dirname, '..', '.env.local');
dotenv.config({ path: envPath });

const serviceKey = process.env.VITE_SUPABASE_SERVICE_KEY;
const supabaseUrl = process.env.VITE_SUPABASE_URL;

console.log('');
console.log('═══════════════════════════════════════════════════');
console.log('  🚀 ByteStrike Event Indexer');
console.log('═══════════════════════════════════════════════════');
console.log('');

// Validate configuration
if (!supabaseUrl) {
  console.error('❌ ERROR: VITE_SUPABASE_URL not found in .env.local');
  console.error('');
  console.error('Please add to your .env.local:');
  console.error('  VITE_SUPABASE_URL="https://your-project.supabase.co"');
  console.error('');
  process.exit(1);
}

if (!serviceKey) {
  console.error('❌ ERROR: VITE_SUPABASE_SERVICE_KEY not found in .env.local');
  console.error('');
  console.error('The indexer needs write permissions to store events.');
  console.error('');
  console.error('Get your service role key:');
  console.error('  1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api');
  console.error('  2. Copy the "service_role" key');
  console.error('  3. Add to .env.local:');
  console.error('     VITE_SUPABASE_SERVICE_KEY="your-service-key"');
  console.error('');
  console.error('⚠️  WARNING: Service key has full database access. Never commit to git!');
  console.error('');
  process.exit(1);
}

console.log('✅ Configuration loaded');
console.log(`📍 Network: Sepolia Testnet`);
console.log(`🔗 RPC: https://ethereum-sepolia-rpc.publicnode.com`);
console.log(`💾 Database: ${supabaseUrl}`);
console.log('');
console.log('Starting indexer with:');
console.log('  • Historical event indexing: ON');
console.log('  • Real-time event watching: ON');
console.log('  • Price snapshots: Every 60 seconds');
console.log('  • Stats updates: Every 5 minutes');
console.log('');
console.log('───────────────────────────────────────────────────');
console.log('');

// Start the indexer
startIndexer({
  indexHistorical: true,  // Index all historical events on first run
  watchEvents: true,      // Watch for new events in real-time
  snapshotInterval: 60000,  // Snapshot prices every 1 minute
  statsInterval: 300000,    // Update stats every 5 minutes
  serviceKey,
}).then((cleanup) => {
  console.log('');
  console.log('✅ Indexer is now running!');
  console.log('');
  console.log('Tracking markets:');
  console.log('  • H100-PERP (active)');
  console.log('  • ETH-PERP-V2 (active)');
  console.log('');
  console.log('Data being collected:');
  console.log('  📊 Swap events → swap_events table');
  console.log('  📈 Price snapshots → price_snapshots table');
  console.log('  📋 24h statistics → market_stats_24h table');
  console.log('');
  console.log('View data in Supabase Dashboard:');
  console.log(`  ${supabaseUrl.replace('//', '//app.')}/table-editor`);
  console.log('');
  console.log('Press Ctrl+C to stop the indexer');
  console.log('───────────────────────────────────────────────────');
  console.log('');

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('');
    console.log('───────────────────────────────────────────────────');
    console.log('🛑 Shutting down indexer...');
    if (cleanup) cleanup();
    console.log('✅ Indexer stopped gracefully');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('');
    console.log('🛑 Received SIGTERM, shutting down...');
    if (cleanup) cleanup();
    process.exit(0);
  });

}).catch((error) => {
  console.error('');
  console.error('❌ Failed to start indexer:');
  console.error('');
  console.error(error);
  console.error('');

  if (error.message?.includes('permission')) {
    console.error('💡 This looks like a permissions issue.');
    console.error('   Make sure you\'re using the service_role key, not the anon key.');
  } else if (error.message?.includes('network')) {
    console.error('💡 This looks like a network issue.');
    console.error('   Check your internet connection and RPC endpoint.');
  } else if (error.message?.includes('table')) {
    console.error('💡 This looks like a database schema issue.');
    console.error('   Make sure you ran the migration: supabase/migrations/001_create_market_data_tables.sql');
  }

  console.error('');
  console.error('See INDEXER_SETUP.md for troubleshooting guide.');
  console.error('');
  process.exit(1);
});
