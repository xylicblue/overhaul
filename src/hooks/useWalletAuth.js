// useWalletAuth.js — Custom hook for wallet-based authentication (Ethereum + Solana)
// Uses the wallet-auth Supabase Edge Function for signature verification and
// creation of a native, refreshable Supabase Auth session.

import { useState, useCallback } from "react";
import { supabase } from "../creatclient";
import toast from "react-hot-toast";

function normalizeSupabaseUrl(value) {
  const url = value?.trim().replace(/^['"]|['"]$/g, "");
  if (!url || /^https?:\/\//i.test(url)) return url;
  if (/^[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) return `https://${url.replace(/\/$/, "")}`;
  return url;
}

const SUPABASE_URL = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL);
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_PUBLIC_KEY;
const EDGE_FUNCTION_URL = `${import.meta.env.VITE_API_GATEWAY_URL || SUPABASE_URL}/functions/v1/wallet-auth`;

/**
 * Call the wallet-auth edge function
 */
async function callWalletAuth(payload) {
  const res = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Wallet authentication failed");
  }
  return data;
}

function hasNativeSupabaseSession(accessToken) {
  try {
    const encodedPayload = accessToken.split(".")[1];
    if (!encodedPayload) return false;
    const base64 = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded));
    return typeof payload?.session_id === "string" && payload.session_id.length > 0;
  } catch {
    return false;
  }
}

/** Install and verify the native Supabase session returned by wallet-auth. */
async function installWalletSession(walletSession) {
  if (!walletSession?.access_token || !walletSession?.refresh_token) {
    throw new Error("Wallet authentication did not return a valid session.");
  }
  if (!hasNativeSupabaseSession(walletSession.access_token)) {
    throw new Error(
      "Wallet authentication returned an outdated session. Please redeploy wallet authentication and try again."
    );
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: walletSession.access_token,
    refresh_token: walletSession.refresh_token,
  });

  if (error) throw error;
  if (!data?.session?.user) {
    throw new Error("Wallet authentication could not establish a user session.");
  }

  // setSession can reconstruct user data from the access token. Confirm the
  // token with Supabase Auth as well, so an older hand-built wallet token can
  // never be mistaken for a native session and fail later during onboarding or
  // MFA enrolment.
  const { data: verified, error: verificationError } = await supabase.auth.getUser(
    data.session.access_token
  );
  if (verificationError || !verified?.user || verified.user.id !== data.session.user.id) {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Best-effort local cleanup; the verified-session check still fails closed.
    }
    throw new Error("Wallet sign-in could not establish a verified session. Please try again.");
  }

  return { ...data.session, user: verified.user };
}

/**
 * Request Ethereum wallet signature via MetaMask or any injected provider
 */
async function signWithEthereum(message) {
  if (!window.ethereum) {
    throw new Error("No Ethereum wallet found. Please install MetaMask.");
  }

  // Request account access
  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts",
  });
  const address = accounts[0];

  // Sign the message using personal_sign
  const signature = await window.ethereum.request({
    method: "personal_sign",
    params: [message, address],
  });

  return { address, signature };
}

/**
 * Request Solana wallet signature via Phantom or any injected Solana provider
 */
async function signWithSolana(message) {
  const provider = window.phantom?.solana || window.solana;

  if (!provider || !provider.isPhantom) {
    throw new Error(
      "No Solana wallet found. Please install Phantom wallet."
    );
  }

  // Connect if not already connected
  const resp = await provider.connect();
  const address = resp.publicKey.toString();

  // Encode the message and sign
  const encodedMessage = new TextEncoder().encode(message);
  const { signature } = await provider.signMessage(encodedMessage, "utf8");

  // Convert signature Uint8Array to base64
  const signatureBase64 = btoa(
    String.fromCharCode(...new Uint8Array(signature))
  );

  return { address, signature: signatureBase64 };
}

/**
 * Silently refresh the session for an already-known wallet address.
 * Skips the "request accounts" step — jumps straight to nonce → sign → verify.
 * Throws if the wallet is locked, disconnected, or the user rejects the signature.
 *
 * @param {string} address - The wallet address (already known from the expired session)
 * @param {string} chain   - "ethereum" | "solana"
 */
export async function silentRefresh(address, chain) {
  // 1. Get a fresh nonce
  const { message } = await callWalletAuth({ action: "get-nonce", address, chain });

  // 2. Sign with the wallet — this will pop up the wallet extension
  let signature;
  if (chain === "ethereum") {
    const result = await signWithEthereum(message);
    signature = result.signature;
  } else {
    const result = await signWithSolana(message);
    signature = result.signature;
  }

  // 3. Verify signature and get a fresh JWT
  const session = await callWalletAuth({ action: "verify", address, signature, chain });

  // 4. Install the new session into the Supabase client
  await installWalletSession(session);
}

/**
 * useWalletAuth hook
 *
 * Returns:
 *   signInWithEthereum() — Connect MetaMask, sign, authenticate
 *   signInWithSolana()   — Connect Phantom, sign, authenticate
 *   loading              — Whether auth is in progress
 *   error                — Last error message (or null)
 */
export function useWalletAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const authenticateWithWallet = useCallback(async (chain) => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Get the wallet address first (to request nonce)
      let address;
      if (chain === "ethereum") {
        if (!window.ethereum) {
          throw new Error("No Ethereum wallet found. Please install MetaMask.");
        }
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        address = accounts[0];
      } else {
        const provider = window.phantom?.solana || window.solana;
        if (!provider || !provider.isPhantom) {
          throw new Error("No Solana wallet found. Please install Phantom.");
        }
        const resp = await provider.connect();
        address = resp.publicKey.toString();
      }

      // Step 2: Request nonce from edge function
      const { message } = await callWalletAuth({
        action: "get-nonce",
        address,
        chain,
      });

      // Step 3: Sign the message with the wallet
      let signature;
      if (chain === "ethereum") {
        const result = await signWithEthereum(message);
        signature = result.signature;
      } else {
        const result = await signWithSolana(message);
        signature = result.signature;
      }

      // Step 4: Verify signature with edge function and get JWT
      const session = await callWalletAuth({
        action: "verify",
        address,
        signature,
        chain,
      });

      // Step 5: Install and verify the native Supabase session.
      const installedSession = await installWalletSession(session);

      toast.success(
        `Signed in with ${chain === "ethereum" ? "Ethereum" : "Solana"} wallet!`
      );

      return {
        ...session,
        user: installedSession.user,
        is_new_user: session.is_new_user || false,
      };
    } catch (err) {
      const message =
        err?.message || "Wallet authentication failed. Please try again.";

      // Don't show error toast for user rejections
      if (
        !message.includes("User rejected") &&
        !message.includes("user rejected") &&
        !message.includes("User denied")
      ) {
        setError(message);
        toast.error(message);
      }

      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const signInWithEthereum = useCallback(
    () => authenticateWithWallet("ethereum"),
    [authenticateWithWallet]
  );

  const signInWithSolana = useCallback(
    () => authenticateWithWallet("solana"),
    [authenticateWithWallet]
  );

  return {
    signInWithEthereum,
    signInWithSolana,
    loading,
    error,
  };
}

export default useWalletAuth;
