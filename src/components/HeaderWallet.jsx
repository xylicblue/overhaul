import React from "react";
import { useAccount, useBalance, useChainId } from "wagmi";
import { sepolia } from "wagmi/chains";
import { SEPOLIA_CONTRACTS } from "../contracts/addresses";
import { Wallet, AlertCircle } from "lucide-react";

export const HeaderWallet = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const { data: ethBalance } = useBalance({
    address,
    chainId: sepolia.id,
  });

  const { data: usdcBalance } = useBalance({
    address,
    token: SEPOLIA_CONTRACTS.usdc,
    chainId: sepolia.id,
  });

  if (!isConnected) return null;

  const isWrongNetwork = chainId !== sepolia.id;

  if (isWrongNetwork) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full">
        <AlertCircle size={14} className="text-red-400" />
        <span className="text-xs font-bold text-red-400">Wrong Network</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-full px-3 py-1">
      {/* Balances */}
      <div className="hidden lg:flex items-center gap-3 text-xs font-medium border-r border-slate-800 pr-3">
        <span className="text-slate-300">
          {ethBalance ? parseFloat(ethBalance.formatted).toFixed(4) : "0.00"} ETH
        </span>
        <span className="text-slate-300">
          {usdcBalance ? parseFloat(usdcBalance.formatted).toFixed(2) : "0.00"} USDC
        </span>
      </div>

      {/* Address */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
        <span className="text-xs font-mono text-slate-400">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
      </div>
    </div>
  );
};
