# Quick Start: Real 24h Volume & Change Tracking

## What's Been Implemented

I've built a complete event indexer that tracks **real** 24-hour volume and price changes from the blockchain.

### Before (Fake Data ❌)
- **24h Change**: Difference between 15-min TWAP and current price (meaningless)
- **24h Volume**: `currentPrice × 10` (completely fake)

### After (Real Data ✅)
- **24h Change**: Actual price movement over last 24 hours from indexed snapshots
- **24h Volume**: Sum of all trade notional values over last 24 hours
- **Bonus**: High/Low prices, trade count also available

## Files Created

### 1. Database Schema
📁 `supabase/migrations/001_create_market_data_tables.sql`
- Creates 3 tables: `price_snapshots`, `swap_events`, `market_stats_24h`
- PostgreSQL function to calculate 24h stats
- Row-level security policies

### 2. Event Indexer Service
📁 `src/services/eventIndexer.js`
- Listens to vAMM `Swap` events in real-time
- Snapshots mark prices every minute
- Calculates and caches 24h statistics
- Handles historical event indexing

### 3. Frontend Integration
📁 `src/marketData.jsx` (updated)
- Fetches real 24h stats from Supabase
- Falls back to approximation if data not available
- Updates every 30 seconds

### 4. Run Script
📁 `scripts/runIndexer.js`
- Easy-to-use CLI script to start the indexer
- Validates environment configuration
- Graceful shutdown handling

### 5. Documentation
📁 `INDEXER_SETUP.md` - Complete setup guide
📁 `QUICK_START.md` - This file

## Setup (3 Steps)

### Step 1: Run Database Migration

Go to Supabase Dashboard → SQL Editor and run:
`supabase/migrations/001_create_market_data_tables.sql`

**Or** use Supabase CLI:
```bash
supabase db push
```

### Step 2: Get Service Role Key

1. Go to: https://supabase.com/dashboard/project/basxvmmtxwlxylpukqjj/settings/api
2. Copy the **service_role** key
3. Add to `.env.local`:

```bash
VITE_SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

⚠️ **Never commit this key to git!**

### Step 3: Run the Indexer

```bash
npm run indexer
```

That's it! The indexer will:
1. Index all historical swap events (one-time)
2. Watch for new swaps in real-time
3. Snapshot prices every minute
4. Update 24h stats every 5 minutes

## Verify It's Working

### 1. Check Console
You should see:
```
✅ Indexed swap: LONG $301.18 @ $3.76
✅ Stored price snapshot for H100-PERP: $3.33
📈 Updated stats for H100-PERP: $1250.50 volume, -12.35% change
```

### 2. Check Supabase Dashboard
Go to **Table Editor** and verify tables have data:
- `price_snapshots` - Should have rows every minute
- `swap_events` - Should have one row per trade
- `market_stats_24h` - Should show current 24h stats

### 3. Check Frontend
Open http://localhost:5173 and look at ticker bar:
- **24h Change**: Real percentage (no tilde ~)
- **24h Volume**: Real dollar amount

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Blockchain (Sepolia)                               │
│  - vAMM Contract emits Swap events                  │
└─────────────────┬───────────────────────────────────┘
                  │ Event Listener (viem)
                  ↓
┌─────────────────────────────────────────────────────┐
│  Event Indexer (Node.js)                            │
│  - Listens to Swap events                           │
│  - Snapshots prices every 60s                       │
│  - Calculates 24h stats every 5min                  │
└─────────────────┬───────────────────────────────────┘
                  │ Writes to
                  ↓
┌─────────────────────────────────────────────────────┐
│  Supabase (PostgreSQL)                              │
│  - price_snapshots: Price history                   │
│  - swap_events: All trades                          │
│  - market_stats_24h: Cached stats                   │
└─────────────────┬───────────────────────────────────┘
                  │ Queries
                  ↓
┌─────────────────────────────────────────────────────┐
│  Frontend (React)                                   │
│  - Displays real 24h change & volume                │
│  - Updates every 30 seconds                         │
└─────────────────────────────────────────────────────┘
```

## How 24h Metrics Are Calculated

### 24h Change
```sql
-- Get current price
current_price = (SELECT mark_price FROM price_snapshots
                 ORDER BY timestamp DESC LIMIT 1)

-- Get price from 24h ago
price_24h_ago = (SELECT mark_price FROM price_snapshots
                 WHERE timestamp <= NOW() - INTERVAL '24 hours'
                 ORDER BY timestamp DESC LIMIT 1)

-- Calculate percentage change
change_24h = ((current_price - price_24h_ago) / price_24h_ago) * 100
```

### 24h Volume
```sql
-- Sum all trade notional values in last 24 hours
volume_24h = (SELECT SUM(notional_usd) FROM swap_events
              WHERE timestamp >= NOW() - INTERVAL '24 hours')
```

## Production Deployment

### Option 1: Run with Frontend (Dev)
Already works! Just run:
```bash
npm run dev
```

The indexer starts automatically in development mode if service key is present.

### Option 2: Separate Service (Production)
Deploy the indexer as a standalone Node.js service on Railway/Render/Fly.io:

1. Create new service
2. Point to `scripts/runIndexer.js`
3. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_SERVICE_KEY`
4. Run continuously (will auto-restart on crash)

### Frontend (Vercel/Netlify)
No changes needed! Just deploy normally with:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (read-only, safe to expose)

## What's Tracked

| Metric | Source | Update Frequency |
|--------|--------|------------------|
| **Mark Price** | vAMM contract | Real-time (every 5s) |
| **24h Change** | Price snapshots | Every 60s (snapshot), 5min (stats) |
| **24h Volume** | Swap events | Real-time (per trade), 5min (stats) |
| **24h High** | Price snapshots | Every 60s (snapshot), 5min (stats) |
| **24h Low** | Price snapshots | Every 60s (snapshot), 5min (stats) |
| **Trade Count** | Swap events | Real-time (per trade), 5min (stats) |

## Cost Estimate

**Supabase Free Tier:**
- 500MB database
- 2GB bandwidth/month

**Usage:**
- ~1,440 price snapshots/day (1 per minute)
- ~50-100 swap events/day (depends on trading activity)
- ~50MB storage/month

✅ **Fits comfortably in free tier**

## Troubleshooting

### "Loading..." shows forever
- Make sure indexer is running (`npm run indexer`)
- Check console for errors
- Verify Supabase tables have data

### "Error: No service key"
- Add `VITE_SUPABASE_SERVICE_KEY` to `.env.local`
- Get it from Supabase Dashboard → Settings → API

### No historical events found
- This is normal for new contracts
- Wait for a trade to happen, then check `swap_events` table

### Volume shows $0.00
- Indexer needs at least one price snapshot (wait 1 minute)
- At least one trade must have happened in last 24h

## Next Steps

1. ✅ Run the indexer: `npm run indexer`
2. ✅ Verify data in Supabase Dashboard
3. ✅ Check frontend shows real data
4. 🚀 Deploy indexer as separate service for production
5. 💡 Optional: Add high/low prices to UI
6. 💡 Optional: Add trade count to UI
7. 💡 Optional: Add "Last Updated" timestamp

## Support

See `INDEXER_SETUP.md` for detailed troubleshooting.

---

**Built with:**
- Viem (blockchain interactions)
- Supabase (database & real-time)
- PostgreSQL (24h stats calculation)
- Node.js (event indexer)
