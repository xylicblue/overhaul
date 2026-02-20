// useWalletAuth.js — Custom hook for wallet-based authentication (Ethereum + Solana)
// Uses the wallet-auth Supabase Edge Function for signature verification and JWT generation.

import { useState, useCallback } from "react";
import { supabase } from "../creatclient";
import toast from "react-hot-toast";

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_API_GATEWAY_URL || import.meta.env.VITE_SUPABASE_URL}/functions/v1/wallet-auth`;

/**
 * Call the wallet-auth edge function
 */
async function callWalletAuth(payload) {
  const res = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Wallet authentication failed");
  }
  return data;
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
      const { nonce, message } = await callWalletAuth({
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

      // Step 5: Set the Supabase session with the returned JWT
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      if (sessionError) {
        throw sessionError;
      }

      toast.success(
        `Signed in with ${chain === "ethereum" ? "Ethereum" : "Solana"} wallet!`
      );

      return { ...session, is_new_user: session.is_new_user || false };
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
