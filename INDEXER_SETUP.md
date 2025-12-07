# Event Indexer Setup Guide

This guide explains how to set up the event indexer for tracking real 24h volume and price changes.

## Overview

The event indexer:
- **Listens to vAMM Swap events** and stores them in Supabase
- **Snapshots mark prices** every minute for 24h change tracking
- **Calculates 24h statistics** (volume, price change, high/low, trade count)
- **Provides real-time data** to the frontend via Supabase queries

## Prerequisites

1. **Supabase Project** - You already have one set up
2. **Supabase Service Role Key** - Needed for write permissions (see below)
3. **Node.js environment** - For running the indexer

## Step 1: Run Database Migration

### Option A: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://supabase.com/dashboard/project/basxvmmtxwlxylpukqjj
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the contents of `supabase/migrations/001_create_market_data_tables.sql`
5. Paste and click **Run**

### Option B: Via Supabase CLI

```bash
cd overhaul
supabase db push
```

## Step 2: Get Service Role Key

The indexer needs write permissions to store events.

1. Go to: https://supabase.com/dashboard/project/basxvmmtxwlxylpukqjj/settings/api
2. Find **service_role** key under "Project API keys"
3. Copy the key (starts with `eyJ...`)

⚠️ **IMPORTANT:** This key has full database access. **Never commit it to git!**

## Step 3: Add Service Key to Environment

Update your `.env.local`:

```bash
# Existing
VITE_SUPABASE_URL="https://basxvmmtxwlxylpukqjj.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Add this (replace with your actual service role key)
VITE_SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M..."
```

## Step 4: Install Dependencies

The indexer needs additional packages:

```bash
cd overhaul
npm install @supabase/supabase-js
```

## Step 5: Start the Indexer

### Option A: Standalone Indexer Script

Create a file `scripts/runIndexer.js`:

```javascript
import { startIndexer } from '../src/services/eventIndexer.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const serviceKey = process.env.VITE_SUPABASE_SERVICE_KEY;

if (!serviceKey) {
  console.error('❌ VITE_SUPABASE_SERVICE_KEY not found in .env.local');
  process.exit(1);
}

console.log('🚀 Starting ByteStrike Event Indexer...');
console.log('📍 Network: Sepolia');
console.log('🔗 RPC: https://ethereum-sepolia-rpc.publicnode.com');

startIndexer({
  indexHistorical: true,  // Index all historical events on first run
  watchEvents: true,      // Watch for new events
  snapshotInterval: 60000,  // Snapshot prices every 1 minute
  statsInterval: 300000,    // Update stats every 5 minutes
  serviceKey,
}).then((cleanup) => {
  console.log('✅ Indexer running...');
  console.log('Press Ctrl+C to stop');

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down indexer...');
    if (cleanup) cleanup();
    process.exit(0);
  });
}).catch((error) => {
  console.error('❌ Failed to start indexer:', error);
  process.exit(1);
});
```

Run it:

```bash
node --experimental-modules scripts/runIndexer.js
```

### Option B: Integrate with Frontend (Dev Mode)

Add to `src/main.jsx`:

```javascript
// Only run indexer in development
if (import.meta.env.DEV && import.meta.env.VITE_SUPABASE_SERVICE_KEY) {
  import('./services/eventIndexer').then(({ startIndexer }) => {
    startIndexer({
      indexHistorical: true,
      watchEvents: true,
      serviceKey: import.meta.env.VITE_SUPABASE_SERVICE_KEY,
    });
  });
}
```

Then just run:

```bash
npm run dev
```

### Option C: Deploy as Separate Service

For production, run the indexer as a separate Node.js service:

1. **Deploy to Railway/Render/Fly.io**
2. **Set environment variables** (VITE_SUPABASE_URL, VITE_SUPABASE_SERVICE_KEY)
3. **Run continuously** with PM2 or systemd

## Step 6: Verify It's Working

### Check Database Tables

1. Go to Supabase Dashboard → **Table Editor**
2. You should see 3 new tables:
   - `price_snapshots` - Price history
   - `swap_events` - All trades
   - `market_stats_24h` - Cached 24h stats

### Check Console Logs

You should see:

```
🚀 Starting event indexer...
📊 Indexing historical events for H100-PERP...
Found 15 swap events
✅ Indexed swap: LONG $301.18 @ $3.76
✅ Indexed swap: SHORT $450.20 @ $3.79
✅ Indexed 15 events for H100-PERP
📸 Taking periodic price snapshots...
✅ Stored price snapshot for H100-PERP: $3.33
📈 Updated stats for H100-PERP: $1250.50 volume, -12.35% change
```

### Check Frontend

1. Open the app: http://localhost:5173
2. Look at the ticker bar:
   - **24h Change** should show real percentage (no tilde ~)
   - **24h Volume** should show real dollar amount (not "Loading...")

## How It Works

### Data Flow

```
Blockchain (Sepolia)
    ↓ (event listener)
Event Indexer
    ↓ (writes to)
Supabase Database
    ↓ (reads from)
Frontend React App
```

### Tables Schema

#### `price_snapshots`
Stores mark prices every minute:
```sql
market_id | mark_price | oracle_price | timestamp
----------|------------|--------------|----------
0x123...  | 3.33       | 3.79         | 2025-12-05 16:30:00
```

#### `swap_events`
Stores every trade:
```sql
market_id | trader | base_delta | quote_delta | notional_usd | timestamp
----------|--------|------------|-------------|--------------|----------
0x123...  | 0xabc  | 700.0000   | -2633.47    | 2633.47      | 2025-12-05 14:15:23
```

#### `market_stats_24h`
Cached 24h metrics (updated every 5 min):
```sql
market_id | current_price | change_24h_percent | volume_24h_usd | trades_24h
----------|---------------|--------------------|-----------------|-----------
0x123...  | 3.33          | -12.35             | 12450.50        | 47
```

## Troubleshooting

### "Error: No service key provided"
- Make sure `VITE_SUPABASE_SERVICE_KEY` is in `.env.local`
- Restart the dev server after adding it

### "Error inserting into price_snapshots"
- Check that you ran the migration (Step 1)
- Verify service key has correct permissions

### "No swap events found"
- This is normal if no trades have happened yet
- You can test by opening a position in the app
- Historical events will be indexed on first run

### Volume shows "Loading..."
- Wait for first price snapshot (happens within 1 minute)
- Check console for indexer logs
- Verify Supabase tables have data

## Production Deployment

### Recommended Architecture

1. **Frontend** (Vercel/Netlify)
   - Reads data from Supabase (uses anon key)
   - No write permissions needed

2. **Indexer Service** (Railway/Render)
   - Separate Node.js process
   - Uses service role key to write data
   - Runs 24/7 to catch all events

### Environment Variables (Frontend)

```bash
VITE_SUPABASE_URL="https://basxvmmtxwlxylpukqjj.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJ..."  # Public, safe to expose
```

### Environment Variables (Indexer)

```bash
VITE_SUPABASE_URL="https://basxvmmtxwlxylpukqjj.supabase.co"
VITE_SUPABASE_SERVICE_KEY="eyJ..."  # Secret, keep private!
```

## Monitoring

### Check Indexer Health

Query Supabase to see latest data:

```sql
-- Latest price snapshot
SELECT * FROM price_snapshots
ORDER BY timestamp DESC
LIMIT 1;

-- Recent swaps
SELECT * FROM swap_events
ORDER BY timestamp DESC
LIMIT 10;

-- Current 24h stats
SELECT * FROM market_stats_24h;
```

### View in Dashboard

Go to Supabase Dashboard → **Table Editor** to see all data in real-time.

## Cost Considerations

- **Supabase Free Tier**: 500MB database, 2GB bandwidth/month
- **Typical usage**: ~1000 rows/day (snapshots + events)
- **Storage needed**: ~50MB/month
- Should fit comfortably in free tier for testnet usage

## Next Steps

After the indexer is running:

1. ✅ 24h Change will show **real** price movement
2. ✅ 24h Volume will show **actual** trading volume
3. ✅ High/Low prices available (can add to UI)
4. ✅ Trade count available (can add to UI)

## Support

If you encounter issues:

1. Check console logs for errors
2. Verify Supabase tables exist and have data
3. Ensure service key has correct permissions
4. Check that RPC endpoint is responding
