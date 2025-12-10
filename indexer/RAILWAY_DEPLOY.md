# Deploy ByteStrike Indexer to Railway - Quick Guide

## 📋 Indexer Status

✅ **Ready to Deploy!**

The indexer is a standalone Node.js service that:
- Watches blockchain events (Swap) in real-time
- Takes price snapshots every 1 minute
- Calculates 24h stats (volume, change, high/low) every 5 minutes
- Stores data in Supabase for frontend to query

**Current Setup:**
- ✅ `index.js` - Complete indexer service (474 lines)
- ✅ `package.json` - Dependencies configured
- ✅ `railway.json` - Railway config ready
- ✅ Database migration - Ready to run in Supabase

---

## 🚀 Step-by-Step Railway Deployment

### **Step 1: Run Database Migration** (2 minutes)

Before deploying the indexer, you need to create the database tables in Supabase.

1. **Go to Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard
   - Select your project: `basxvmmtxwlxylpukqjj`

2. **Open SQL Editor:**
   - Click **SQL Editor** in left sidebar
   - Click **New query**

3. **Run Migration:**
   - Copy the entire contents of: `/supabase/migrations/001_create_market_data_tables.sql`
   - Paste into SQL editor
   - Click **Run** (bottom right)
   - Should see: "Success. No rows returned"

4. **Verify Tables Created:**
   - Click **Table Editor** in left sidebar
   - You should see 3 new tables:
     - `price_snapshots`
     - `swap_events`
     - `market_stats_24h`

---

### **Step 2: Get Supabase Service Key** (1 minute)

The indexer needs **Service Role Key** (not Anon Key) for write access.

1. **Go to Project Settings:**
   - In Supabase dashboard, click **Settings** (gear icon, bottom left)
   - Click **API**

2. **Copy Service Role Key:**
   - Scroll to **Project API keys** section
   - Find **service_role** key
   - Click **Copy** (keep this safe!)
   - **IMPORTANT:** This is different from the `anon` key

---

### **Step 3: Deploy to Railway** (5 minutes)

#### Option A: Deploy via CLI (Recommended)

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```
   - Browser will open
   - Authorize the CLI

3. **Navigate to Indexer Directory:**
   ```bash
   cd /Users/muhammadjonraza/root/byte-strike/overhaul/indexer
   ```

4. **Initialize Railway Project:**
   ```bash
   railway init
   ```
   - Select **Create new project**
   - Name it: `bytestrike-indexer`

5. **Set Environment Variables:**
   ```bash
   railway variables set SUPABASE_URL=https://basxvmmtxwlxylpukqjj.supabase.co
   railway variables set SUPABASE_SERVICE_KEY=your-service-role-key-here
   ```
   - Replace `your-service-role-key-here` with the key from Step 2

6. **Deploy:**
   ```bash
   railway up
   ```
   - Will upload code and start deployment
   - Wait ~30 seconds for build

7. **View Logs:**
   ```bash
   railway logs
   ```
   - Should see:
   ```
   ═══════════════════════════════════════════════════
     🚀 ByteStrike Event Indexer
   ═══════════════════════════════════════════════════
   ✅ Clients initialized
   📍 Network: Sepolia (Chain ID: 11155111)
   📜 Indexing historical events for H100-PERP...
   ✅ Indexer running successfully!
   ```

---

#### Option B: Deploy via Dashboard (Alternative)

1. **Go to Railway:**
   - Visit: https://railway.app/
   - Click **Login** and sign in with GitHub

2. **Create New Project:**
   - Click **New Project**
   - Select **Deploy from GitHub repo**
   - Authorize Railway to access your repo
   - Select your ByteStrike repository

3. **Configure Root Directory:**
   - Click **Settings** tab
   - Scroll to **Build** section
   - Set **Root Directory**: `indexer`
   - Click **Save**

4. **Set Environment Variables:**
   - Click **Variables** tab
   - Click **+ New Variable**
   - Add:
     - `SUPABASE_URL`: `https://basxvmmtxwlxylpukqjj.supabase.co`
     - `SUPABASE_SERVICE_KEY`: `your-service-role-key-here`
   - Click **Deploy** (top right)

5. **Monitor Deployment:**
   - Click **Deployments** tab
   - Wait for status: ✅ **Active**
   - Click on deployment to view logs

---

### **Step 4: Verify It's Working** (2 minutes)

1. **Check Railway Logs:**
   ```bash
   railway logs --follow
   ```
   - Should see periodic output:
   ```
   📸 Taking price snapshots...
   📸 H100-PERP: $3.79
   📊 Updating 24h statistics...
   📊 H100-PERP: $0.00 volume, 0.00% change
   ```

2. **Check Supabase Tables:**
   - Go to Supabase → **Table Editor**
   - Open `price_snapshots` table
   - Should see new rows appearing every minute
   - Open `market_stats_24h` table
   - Should see stats updated every 5 minutes

3. **Test with a Trade:**
   - Go to your frontend
   - Open a position (any size)
   - Check Railway logs - should see:
   ```
   💱 H100-PERP: LONG $100.00 @ $3.79
   ```
   - Check `swap_events` table - should have new row

---

## 📊 What the Indexer Does

### Real-Time Event Watching
- Listens for `Swap` events from vAMM contract
- Indexes every trade: trader, size, price, notional
- Stores in `swap_events` table

### Price Snapshots (Every 1 min)
- Fetches mark price from vAMM
- Fetches oracle/index price
- Stores in `price_snapshots` table
- Used for calculating 24h change

### 24h Statistics (Every 5 min)
- Calculates from last 24h of data:
  - **Volume 24h**: Sum of all trade notional
  - **Change 24h**: (Current price - Price 24h ago) / Price 24h ago
  - **High 24h**: Highest mark price
  - **Low 24h**: Lowest mark price
  - **Trades 24h**: Count of swaps
- Caches in `market_stats_24h` table

### Frontend Integration
Your frontend (`marketData.jsx`) already queries this data:
```javascript
const stats = await get24hStats(market.marketId);
// Returns: { volume_24h_usd, change_24h_percent, high_24h, low_24h, trades_24h }
```

Once indexer is deployed, frontend will automatically show **real data** instead of "$100.00" placeholder.

---

## 🔧 Configuration Options

You can customize the indexer by setting these environment variables in Railway:

| Variable | Default | Description |
|----------|---------|-------------|
| `SUPABASE_URL` | - | **Required** - Your Supabase URL |
| `SUPABASE_SERVICE_KEY` | - | **Required** - Service role key |
| `RPC_URL` | Public Sepolia | Custom RPC endpoint (optional) |
| `SNAPSHOT_INTERVAL` | `60000` (1 min) | Price snapshot frequency (ms) |
| `STATS_INTERVAL` | `300000` (5 min) | Stats calculation frequency (ms) |
| `INDEX_HISTORICAL` | `true` | Index past events on startup |

**To add more variables:**
```bash
railway variables set SNAPSHOT_INTERVAL=30000  # Snapshot every 30s
railway variables set STATS_INTERVAL=60000     # Stats every 1 min
```

---

## 🛠️ Maintenance & Updates

### View Live Logs
```bash
railway logs --follow
```

### Restart Service
```bash
railway restart
```

### Update Code
```bash
# Make changes to index.js
git add indexer/
git commit -m "Update indexer"
git push

# Railway auto-deploys on push (if connected to GitHub)
# OR manually deploy:
railway up
```

### Check Service Status
```bash
railway status
```

---

## 💰 Cost

**Railway Free Tier:**
- $5 in credits per month (no credit card required)
- This indexer uses ~$0.50-1.00/month
- Well within free tier limits
- No auto-sleep (runs 24/7)

**If you outgrow free tier:**
- Railway Pro: $5/month for higher limits

---

## ✅ Deployment Checklist

Before marking complete:

- [ ] Database migration ran successfully in Supabase
- [ ] All 3 tables created: `price_snapshots`, `swap_events`, `market_stats_24h`
- [ ] Got Supabase Service Role Key (not anon key)
- [ ] Railway CLI installed (or using dashboard)
- [ ] Environment variables set in Railway
- [ ] Deployment shows "Active" status
- [ ] Logs show "✅ Indexer running successfully!"
- [ ] `price_snapshots` table receiving new rows every minute
- [ ] Made a test trade and it appears in `swap_events`
- [ ] Frontend shows real volume (not "$100.00" placeholder)

---

## 🐛 Troubleshooting

### "SUPABASE_SERVICE_KEY not configured"
- Check you used **Service Role Key**, not Anon Key
- Verify variable name is exact: `SUPABASE_SERVICE_KEY`
- Try setting again: `railway variables set SUPABASE_SERVICE_KEY=your-key`

### "Error storing price snapshot"
- Database migration didn't run
- Go to Supabase → SQL Editor → Run migration again
- Check table exists: Supabase → Table Editor

### "No historical events found"
- Normal if contracts are new
- Indexer will start tracking once first trade happens

### Indexer keeps restarting
- Check logs: `railway logs`
- Common issue: Invalid RPC endpoint
- Solution: Set custom RPC or use default (remove RPC_URL variable)

### Frontend still shows "$100.00"
- Check `market_stats_24h` table has data
- Clear browser cache
- Make a test trade to trigger stats calculation
- Check Supabase anon key is correct in frontend `.env`

---

## 🎉 You're Done!

Once deployed, your indexer will:
- ✅ Run 24/7 automatically (no need to keep your computer on)
- ✅ Track all trades in real-time
- ✅ Provide accurate 24h volume & change to frontend
- ✅ Require **zero maintenance**

**No more fake data - all metrics are real!** 🚀

---

## 📞 Quick Commands Reference

```bash
# Deploy
cd indexer
railway login
railway init
railway variables set SUPABASE_URL=https://basxvmmtxwlxylpukqjj.supabase.co
railway variables set SUPABASE_SERVICE_KEY=your-key-here
railway up

# Monitor
railway logs --follow

# Manage
railway restart
railway status
railway open  # Open dashboard
```
