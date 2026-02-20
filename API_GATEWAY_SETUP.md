# ByteStrike API Gateway — Setup & Deployment Guide

## Architecture Overview

```
┌─────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│   Frontend   │────▶│  Cloudflare Worker    │────▶│    Supabase      │
│  (React/Vite)│     │  (api.bytestrike.io)  │     │  (Database/Auth) │
└─────────────┘     │  • Rate limiting      │     │  • RLS enabled   │
                    │  • CORS enforcement   │     │  • Edge Functions │
                    │  • Response caching   │     │                  │
                    │  • Security headers   │     └──────────────────┘
                    └──────────────────────┘
```

The API gateway has 3 layers:

1. **Row Level Security (RLS)** — Database-level access control
2. **Edge Functions** — Server-side validation for sensitive operations
3. **Cloudflare Worker** — Rate limiting, caching, CORS, security headers

---

## Phase 1: Enable RLS Policies

### Steps

1. Open the Supabase Dashboard → **SQL Editor**
2. Paste and run the contents of `supabase/migrations/001_rls_policies.sql`
3. Verify in **Authentication → Policies** that all tables show RLS enabled

### What it does

| Table | Policy |
|-------|--------|
| `profiles` | Users can read/update their own row only |
| `interest_list` | Public can insert (waitlist); no public reads |
| `trade_history` | Public can read (leaderboard); only service_role can insert |
| `vamm_price_history` | Public can read (charts); only service_role can insert |
| `market_favorites` | Users can CRUD their own favorites only |
| `price_data`, index tables | Public read-only |
| `market_stats_24h` | Public read-only |
| `price_snapshots`, `swap_events` | Service role only (no public access) |
| `wallet_nonces` | Service role only |

> **Important:** After enabling RLS, direct frontend inserts to `trade_history` and `vamm_price_history` will be blocked. The frontend has been updated to use the `api-trade` edge function instead.

---

## Phase 2: Deploy Edge Functions

### api-trade

Records trades and vAMM price updates. Validates the Ethereum tx_hash on-chain before inserting.

```bash
cd overhaul
supabase functions deploy api-trade
```

### api-profile

Handles all profile mutations (get, update, set-username, update-wallet, check-username). Validates JWT before any operation.

```bash
supabase functions deploy api-profile
```

### Verify deployment

```bash
supabase functions list
```

You should see: `wallet-auth`, `record-oracle-price`, `record-vamm-price`, `api-trade`, `api-profile`

---

## Phase 3: Deploy Cloudflare Worker

### Prerequisites

- [Cloudflare account](https://dash.cloudflare.com)
- `wrangler` CLI: `npm install -g wrangler`
- Domain configured in Cloudflare (e.g., `bytestrike.io`)

### Setup

```bash
cd overhaul/cloudflare-worker
npm install
wrangler login
```

### Set secrets

```bash
wrangler secret put SUPABASE_URL
# Enter: https://basxvmmtxwlxylpukqjj.supabase.co

wrangler secret put SUPABASE_ANON_KEY
# Enter: your Supabase anon key

wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Enter: your Supabase service role key (from Supabase Dashboard → Settings → API)
```

### (Optional) Create KV namespace for distributed rate limiting

```bash
wrangler kv:namespace create RATE_LIMITER
# Copy the id and update wrangler.toml
```

### Deploy

```bash
wrangler deploy
```

### Set up custom domain

1. In Cloudflare Dashboard → Workers → your worker → **Triggers**
2. Add route: `api.bytestrike.io/*` → bytestrike-api-gateway
3. Or use a custom domain under **Settings → Domains & Routes**

### Rate Limits

| Tier | Limit | Applies to |
|------|-------|-----------|
| auth | 20/min | Login, signup, wallet-auth, check-location |
| write | 60/min | Trade recording, profile updates |
| read | 200/min | Market data, chart data, leaderboard |
| edge | 30/min | Other edge function calls |

---

## Phase 4: Switch Frontend to Use Gateway

In your `.env` (production):

```bash
VITE_API_GATEWAY_URL="https://api.bytestrike.io"
```

When this variable is set, all API calls route through the Cloudflare Worker proxy. When it's not set (development), calls go directly to Supabase.

---

## Files Created/Modified

### New files

| File | Purpose |
|------|---------|
| `supabase/migrations/001_rls_policies.sql` | RLS policies for all tables |
| `supabase/functions/api-trade/index.ts` | Edge function for trade recording |
| `supabase/functions/api-profile/index.ts` | Edge function for profile mutations |
| `cloudflare-worker/src/index.js` | Cloudflare Worker proxy |
| `cloudflare-worker/wrangler.toml` | Worker configuration |
| `cloudflare-worker/package.json` | Worker dependencies |
| `src/services/api.js` | Frontend API service layer |

### Modified files

| File | Change |
|------|--------|
| `src/tradingpanel.jsx` | Trade inserts now go through `recordTrade()` → api-trade edge function |
| `src/components/PositionPanel.jsx` | Close-trade inserts now go through `recordTrade()` → api-trade edge function |
| `src/welcome.jsx` | Username set now goes through `setUsername()` → api-profile edge function |
| `src/signup.jsx` | Username check now uses `checkUsername()` → api-profile edge function |
| `src/web3auth.jsx` | Wallet updates now use `updateWallet()` → api-profile edge function |
| `src/wallet.jsx` | Wallet connect/disconnect uses `updateWallet()` → api-profile edge function |
| `src/hooks/useWalletAuth.js` | Uses `VITE_API_GATEWAY_URL` when set |
| `src/data.js` | Removed hardcoded Supabase key; now requires `SUPABASE_SERVICE_ROLE_KEY` env var |
| `.env` | Added `VITE_API_GATEWAY_URL` variable (commented out for dev) |

---

## Security Checklist

- [ ] RLS policies enabled on all tables (run SQL script)
- [ ] `api-trade` edge function deployed
- [ ] `api-profile` edge function deployed
- [ ] Cloudflare Worker deployed with secrets set
- [ ] Custom domain configured (`api.bytestrike.io`)
- [ ] `VITE_API_GATEWAY_URL` set in production `.env`
- [ ] Remove `VITE_SUPABASE_ANON_KEY` from frontend in production (Worker injects it)
- [ ] Rotate Supabase anon key if it was previously exposed in `data.js`
- [ ] Test all flows: login, signup, wallet auth, trading, profile updates, charts
