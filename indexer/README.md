# ByteStrike Event Indexer - Deployment Guide

Deploy the event indexer as a standalone service that runs 24/7 without keeping your local dev server running.

## 🚀 Quick Deploy (Choose One)

### Option 1: Railway (Recommended) ⚡

**Deploy in 2 minutes!**

1. **Click to Deploy:**

   [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

2. **Or Manual Deploy:**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli

   # Login
   railway login

   # Navigate to indexer directory
   cd indexer

   # Deploy
   railway up
   ```

3. **Set Environment Variables:**
   - Go to your Railway project dashboard
   - Click on your service → **Variables** tab
   - Add:
     - `SUPABASE_URL`: `https://basxvmmtxwlxylpukqjj.supabase.co`
     - `SUPABASE_SERVICE_KEY`: Your service role key from Supabase

4. **Redeploy:**
   - After adding variables, click **Redeploy**

✅ **Done!** Your indexer is now running 24/7 on Railway's free tier.

---

### Option 2: Render 🎨

1. **Go to:** https://render.com/

2. **Create New Web Service:**
   - Click **New** → **Background Worker**
   - Connect your GitHub repository
   - Select the `indexer` directory as root

3. **Configure:**
   - **Name**: `bytestrike-indexer`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

4. **Environment Variables:**
   Add these in the **Environment** tab:
   - `SUPABASE_URL`: `https://basxvmmtxwlxylpukqjj.supabase.co`
   - `SUPABASE_SERVICE_KEY`: Your service role key

5. **Deploy:**
   - Click **Create Background Worker**

✅ **Done!** Indexer running on Render.

---

### Option 3: Fly.io 🪂

1. **Install Fly CLI:**
   ```bash
   brew install flyctl  # macOS
   # or
   curl -L https://fly.io/install.sh | sh  # Linux/WSL
   ```

2. **Login:**
   ```bash
   fly auth login
   ```

3. **Deploy:**
   ```bash
   cd indexer
   fly launch
   ```

4. **Set Secrets:**
   ```bash
   fly secrets set SUPABASE_URL=https://basxvmmtxwlxylpukqjj.supabase.co
   fly secrets set SUPABASE_SERVICE_KEY=your-service-key-here
   ```

5. **Deploy:**
   ```bash
   fly deploy
   ```

✅ **Done!** Running on Fly.io.

---

## 📋 Pre-Deployment Checklist

Before deploying, make sure:

- ✅ Database migration ran successfully (`001_create_market_data_tables.sql`)
- ✅ You have your Supabase service role key
- ✅ Tables exist: `price_snapshots`, `swap_events`, `market_stats_24h`

---

## 🔧 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SUPABASE_URL` | ✅ Yes | - | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | ✅ Yes | - | Service role key (not anon key!) |
| `RPC_URL` | ❌ No | Public Sepolia RPC | Custom RPC endpoint |
| `SNAPSHOT_INTERVAL` | ❌ No | `60000` (1 min) | Price snapshot frequency (ms) |
| `STATS_INTERVAL` | ❌ No | `300000` (5 min) | Stats update frequency (ms) |
| `INDEX_HISTORICAL` | ❌ No | `true` | Index historical events on startup |

---

## 📊 Monitoring

### Check if Indexer is Running

**Railway:**
1. Go to your project dashboard
2. Click on your service
3. View **Logs** tab - should see:
   ```
   ✅ Indexer running successfully!
   📸 Taking price snapshots...
   💱 H100-PERP: LONG $301.18 @ $3.76
   ```

**Render:**
1. Go to your service dashboard
2. Click **Logs**
3. Should see similar output

**Fly.io:**
```bash
fly logs
```

### Check Database

Go to Supabase Dashboard → **Table Editor**:

1. **price_snapshots** - Should have new rows every minute
2. **swap_events** - Should have rows for each trade
3. **market_stats_24h** - Should update every 5 minutes

### Query Stats Manually

```sql
-- Latest 24h stats
SELECT * FROM market_stats_24h;

-- Recent price snapshots
SELECT * FROM price_snapshots
ORDER BY timestamp DESC
LIMIT 10;

-- Recent swaps
SELECT * FROM swap_events
ORDER BY timestamp DESC
LIMIT 10;
```

---

## 🐛 Troubleshooting

### "SUPABASE_URL not configured"
- Make sure you added `SUPABASE_URL` to environment variables
- Redeploy after adding variables

### "Error storing price snapshot"
- Check that database migration ran successfully
- Verify service key has write permissions
- Check Supabase logs for errors

### "No historical events found"
- This is normal if no trades have happened yet
- Indexer will start tracking once first trade occurs

### Indexer keeps restarting
- Check logs for specific error
- Verify RPC endpoint is accessible
- Ensure Supabase credentials are correct

### High memory usage
- Normal: ~50-100MB
- High (>500MB): May indicate memory leak, restart service

---

## 💰 Cost Breakdown

### Railway (Free Tier)
- **Included**: $5 credits/month
- **Usage**: ~$0.50-1/month (well within free tier)
- **Limits**: 500 hours/month (plenty for 24/7 operation)

### Render (Free Tier)
- **Included**: 750 hours/month
- **Usage**: 720 hours/month (24/7)
- **Limits**: Service spins down after 15min inactivity (not ideal)

### Fly.io (Free Tier)
- **Included**: 3 shared VMs
- **Usage**: 1 VM running 24/7
- **Limits**: No auto-sleep, better for production

**Recommendation:** **Railway** for best free tier experience (no sleep).

---

## 🔄 Updates & Maintenance

### Update Indexer Code

**Railway:**
```bash
# Make changes to indexer/index.js
git commit -am "Update indexer"
git push

# Railway auto-deploys on push
```

**Render:**
- Automatic deploy on git push (if enabled)
- Or manual deploy from dashboard

**Fly.io:**
```bash
fly deploy
```

### View Logs

**Railway:**
- Dashboard → Logs tab

**Render:**
- Dashboard → Logs

**Fly.io:**
```bash
fly logs
fly logs --follow  # Live tail
```

### Restart Service

**Railway:**
- Dashboard → Click **Restart**

**Render:**
- Dashboard → **Manual Deploy** → **Deploy**

**Fly.io:**
```bash
fly apps restart bytestrike-indexer
```

---

## 📈 Scaling (Future)

If you outgrow free tier:

### Railway Pro ($5/month)
- Higher limits
- Better performance
- No usage cap

### Render Paid ($7/month)
- Always-on (no sleep)
- Better resources

### Fly.io Paid ($1.94/month)
- Dedicated CPU
- More memory

---

## 🔐 Security Best Practices

1. **Never commit `.env` file**
   - Use platform's environment variables feature
   - Service key has full database access

2. **Rotate service key periodically**
   - Generate new key in Supabase dashboard
   - Update environment variable
   - Redeploy

3. **Monitor for unusual activity**
   - Check logs for errors
   - Set up Supabase alerts
   - Review database size monthly

---

## ✅ Verification Checklist

After deployment:

- [ ] Indexer shows "running successfully" in logs
- [ ] `price_snapshots` table receives new rows every minute
- [ ] `swap_events` table captures trades (test by making a trade)
- [ ] `market_stats_24h` updates every 5 minutes
- [ ] Frontend shows real volume (not "Loading...")
- [ ] Frontend shows real 24h change (no tilde ~)

---

## 🆘 Support

**Logs show errors:**
- Check environment variables are correct
- Verify database migration ran
- Ensure RPC endpoint is accessible

**No data in tables:**
- Wait 1-2 minutes for first snapshot
- Check indexer logs for errors
- Verify service has network access to blockchain

**Frontend still shows "Loading...":**
- Clear browser cache
- Check Supabase anon key is correct in frontend
- Verify `market_stats_24h` table has data

---

## 📚 Architecture

```
┌─────────────────────────────────────┐
│  Railway/Render/Fly.io             │
│  ┌───────────────────────────────┐ │
│  │  Node.js Indexer (24/7)       │ │
│  │  - Watches blockchain events  │ │
│  │  - Snapshots prices           │ │
│  │  - Calculates 24h stats       │ │
│  └────────┬──────────────────────┘ │
└───────────┼─────────────────────────┘
            │
            ↓ Writes to
┌─────────────────────────────────────┐
│  Supabase (PostgreSQL)             │
│  - price_snapshots                  │
│  - swap_events                      │
│  - market_stats_24h                 │
└────────┬────────────────────────────┘
         │
         ↓ Reads from
┌─────────────────────────────────────┐
│  Frontend (Vercel/Netlify)         │
│  - Shows real 24h metrics           │
└─────────────────────────────────────┘
```

---

## 🎉 Success!

Once deployed, your indexer will:
- ✅ Run 24/7 automatically
- ✅ Track all trades in real-time
- ✅ Provide accurate 24h volume & change
- ✅ Require zero maintenance

**No more keeping your local server running!** 🚀
