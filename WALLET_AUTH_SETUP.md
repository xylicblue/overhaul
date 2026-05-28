# Wallet Authentication Setup Guide (Ethereum + Solana)

This guide walks you through setting up wallet-based sign-in for ByteStrike using Supabase Edge Functions.

---

## 1. Create the `wallet_nonces` Table in Supabase

Go to your Supabase Dashboard → **SQL Editor** and run:

```sql
-- Table to store temporary nonces for wallet signature verification
CREATE TABLE IF NOT EXISTS public.wallet_nonces (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address text NOT NULL UNIQUE,
  chain text NOT NULL CHECK (chain IN ('ethereum', 'solana')),
  nonce text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wallet_nonces ENABLE ROW LEVEL SECURITY;

-- Allow the service role (edge functions) full access. No public access needed.
-- RLS blocks all access by default, which is what we want since only the
-- edge function (using service_role key) reads/writes this table.

-- Auto-cleanup expired nonces (optional cron job)
-- You can set this up in Dashboard → Database → Extensions → pg_cron
-- SELECT cron.schedule('cleanup-expired-nonces', '*/10 * * * *', $$
--   DELETE FROM public.wallet_nonces WHERE expires_at < now();
-- $$);
```

## 2. Add `wallet_type` Column to Profiles Table

If your `profiles` table doesn't already have a `wallet_type` column:

```sql
-- Add wallet_type to track which chain the user signed up with
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS wallet_type text;

-- Update RLS policies if needed (your profiles table should already have policies)
```

## 3. Get Your Supabase JWT Secret

The edge function needs `SUPABASE_JWT_SECRET` to sign JWTs.

1. Go to **Supabase Dashboard** → **Settings** → **API**
2. Under **JWT Settings**, copy the **JWT Secret**
3. This secret is automatically available as an environment variable in Edge Functions as `SUPABASE_JWT_SECRET`

> **Note**: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are also automatically available in Edge Functions — no manual setup needed.

## 4. Deploy the Edge Function

From the `overhaul/` project directory, run:

```bash
# Login to Supabase CLI (if not already)
npx supabase login

# Link your project (if not already linked)
npx supabase link --project-ref basxvmmtxwlxylpukqjj

# Deploy the wallet-auth edge function
npx supabase functions deploy wallet-auth --no-verify-jwt
```

> **Important**: The `--no-verify-jwt` flag is required because unauthenticated users
> call this function to sign in. The function handles its own authentication via
> wallet signatures.

## 5. Verify the Deployment

Test the nonce endpoint:

```bash
curl -X POST "https://basxvmmtxwlxylpukqjj.supabase.co/functions/v1/wallet-auth" \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{"action": "get-nonce", "address": "0x1234567890abcdef1234567890abcdef12345678", "chain": "ethereum"}'
```

You should get back a JSON response with `nonce` and `message` fields.

---

## How It Works

### Authentication Flow

```
User clicks "Sign in with Ethereum/Solana"
        │
        ▼
Frontend connects wallet (MetaMask / Phantom)
        │
        ▼
Frontend → Edge Function: { action: "get-nonce", address, chain }
        │
        ▼
Edge Function generates nonce, stores in wallet_nonces table
        │
        ▼
Frontend asks wallet to sign the nonce message
        │
        ▼
Frontend → Edge Function: { action: "verify", address, signature, chain }
        │
        ▼
Edge Function verifies signature (ethers.js for ETH, tweetnacl for SOL)
        │
        ▼
Edge Function creates user if new (synthetic email: address@wallet.bytestrike.io)
        │
        ▼
Edge Function signs a JWT and returns session tokens
        │
        ▼
Frontend calls supabase.auth.setSession() with the tokens
        │
        ▼
User is now authenticated! ✅
```

### Files Created/Modified

**New files:**
- `supabase/functions/wallet-auth/index.ts` — Edge Function (nonce + verification)
- `src/hooks/useWalletAuth.js` — React hook for wallet sign-in flow
- `src/components/WalletAuthButtons.jsx` — Reusable ETH/SOL sign-in buttons

**Modified files:**
- `src/login.jsx` — Added wallet sign-in buttons below Google
- `src/signup.jsx` — Added wallet sign-in section
- `src/components/AuthModal.jsx` — Added compact wallet buttons to both login/signup modes

### Wallet Requirements

- **Ethereum**: MetaMask (or any injected EIP-1193 wallet)
- **Solana**: Phantom wallet

Users without these wallets will see an appropriate error message prompting them to install the wallet extension.

### User Accounts

Wallet users are created with:
- **Email**: `{wallet_address}@wallet.bytestrike.io` (synthetic, for Supabase compatibility)
- **Username**: Auto-generated like `eth_a1b2c3` or `sol_a1b2c3`
- **Profile**: `wallet_address` and `wallet_type` fields are populated

---

## Troubleshooting

### "Failed to generate nonce"
- Make sure the `wallet_nonces` table exists (Step 1)
- Check the Edge Function logs: Dashboard → Edge Functions → wallet-auth → Logs

### "Invalid signature"
- The nonce may have expired (5-minute window). Try again.
- Ensure the user actually signed the message (didn't cancel)

### "No Ethereum/Solana wallet found"
- The user needs MetaMask (ETH) or Phantom (SOL) browser extension installed

### CORS errors
- The edge function includes CORS headers. If issues persist, check that the function
  was deployed with `--no-verify-jwt`
