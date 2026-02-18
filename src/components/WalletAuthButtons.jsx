// WalletAuthButtons.jsx — Shared Ethereum + Solana sign-in buttons
import React from "react";
import { useWalletAuth } from "../hooks/useWalletAuth";

// Ethereum (MetaMask) SVG icon
const EthereumIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 256 417" preserveAspectRatio="xMidYMid">
    <path fill="#343434" d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z" />
    <path fill="#8C8C8C" d="M127.962 0L0 212.32l127.962 75.639V154.158z" />
    <path fill="#3C3C3B" d="M127.961 312.187l-1.575 1.92v98.199l1.575 4.601L256 236.587z" />
    <path fill="#8C8C8C" d="M127.962 416.905v-104.72L0 236.585z" />
    <path fill="#141414" d="M127.961 287.958l127.96-75.637-127.96-58.162z" />
    <path fill="#393939" d="M0 212.32l127.96 75.638v-133.8z" />
  </svg>
);

// Solana SVG icon
const SolanaIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 397.7 311.7" preserveAspectRatio="xMidYMid">
    <linearGradient id="sol-a" x1="360.879" y1="351.455" x2="141.213" y2="-69.294" gradientUnits="userSpaceOnUse" gradientTransform="matrix(1 0 0 -1 0 314)">
      <stop offset="0" stopColor="#00FFA3" />
      <stop offset="1" stopColor="#DC1FFF" />
    </linearGradient>
    <path fill="url(#sol-a)" d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" />
    <path fill="url(#sol-a)" d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" />
    <path fill="url(#sol-a)" d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" />
  </svg>
);

/**
 * Wallet authentication buttons for Ethereum and Solana.
 * 
 * @param {object} props
 * @param {function} [props.onSuccess] - Called after successful auth
 * @param {string} [props.variant] - "full" (default) or "compact"
 */
const WalletAuthButtons = ({ onSuccess, onNewUser, variant = "full" }) => {
  const { signInWithEthereum, signInWithSolana, loading } = useWalletAuth();

  const handleResult = (result) => {
    if (!result) return;
    if (result.is_new_user && onNewUser) {
      onNewUser(result);
    } else if (onSuccess) {
      onSuccess(result);
    }
  };

  const handleEthSignIn = async () => {
    const result = await signInWithEthereum();
    handleResult(result);
  };

  const handleSolSignIn = async () => {
    const result = await signInWithSolana();
    handleResult(result);
  };

  if (variant === "compact") {
    return (
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleEthSignIn}
          disabled={loading}
          className="flex-1 py-3 px-4 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2.5 text-sm group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <EthereumIcon />
          <span className="text-zinc-300 group-hover:text-white transition-colors">
            {loading ? "..." : "Ethereum"}
          </span>
        </button>
        <button
          type="button"
          onClick={handleSolSignIn}
          disabled={loading}
          className="flex-1 py-3 px-4 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2.5 text-sm group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <SolanaIcon />
          <span className="text-zinc-300 group-hover:text-white transition-colors">
            {loading ? "..." : "Solana"}
          </span>
        </button>
      </div>
    );
  }

  // Full variant (stacked buttons)
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleEthSignIn}
        disabled={loading}
        className="w-full py-3.5 px-4 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-3 text-sm group disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <EthereumIcon />
        <span className="text-zinc-300 group-hover:text-white transition-colors">
          {loading ? "Connecting..." : "Sign in with Ethereum"}
        </span>
      </button>
      <button
        type="button"
        onClick={handleSolSignIn}
        disabled={loading}
        className="w-full py-3.5 px-4 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-3 text-sm group disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <SolanaIcon />
        <span className="text-zinc-300 group-hover:text-white transition-colors">
          {loading ? "Connecting..." : "Sign in with Solana"}
        </span>
      </button>
    </div>
  );
};

export default WalletAuthButtons;
