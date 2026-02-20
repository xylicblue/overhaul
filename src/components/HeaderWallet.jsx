import React from "react";
import { useAccount, useBalance, useChainId } from "wagmi";
import { sepolia } from "wagmi/chains";
import { SEPOLIA_CONTRACTS } from "../contracts/addresses";
import { AlertCircle } from "lucide-react";

const ETH_ICON = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" className="shrink-0">
    <path d="M12 2L5 12.5l7 4 7-4L12 2z" fill="currentColor" opacity=".6" />
    <path d="M12 16.5L5 12.5 12 22l7-9.5-7 4z" fill="currentColor" opacity=".9" />
  </svg>
);

const USDC_ICON = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" className="shrink-0">
    <circle cx="12" cy="12" r="10" fill="currentColor" opacity=".15" />
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 6v1.5M12 16.5V18M9 8.5c0-1.1.9-2 3-2s3 .9 3 2-1.2 1.8-3 2c-1.8.2-3 1-3 2.2 0 1.3 1.1 2.3 3 2.3s3-.9 3-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const HeaderWallet = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const { data: ethBalance } = useBalance({ address, chainId: sepolia.id });
  const { data: usdcBalance } = useBalance({
    address,
    token: SEPOLIA_CONTRACTS.usdc,
    chainId: sepolia.id,
  });

  if (!isConnected) return null;

  if (chainId !== sepolia.id) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/8 border border-red-500/20 rounded-lg">
        <AlertCircle size={12} className="text-red-400" />
        <span className="text-[11px] font-bold text-red-400">Wrong Network</span>
      </div>
    );
  }

  const eth  = ethBalance  ? parseFloat(ethBalance.formatted).toFixed(4)  : "—";
  const usdc = usdcBalance ? parseFloat(usdcBalance.formatted).toFixed(2) : "—";

  return (
    <div className="hidden lg:flex items-center h-8 bg-[#0a0a10] border border-zinc-800 rounded-lg overflow-hidden text-xs font-mono">

      {/* ETH */}
      <div className="flex items-center gap-1.5 px-3 h-full text-zinc-300 border-r border-zinc-800">
        <span className="text-blue-400">{ETH_ICON}</span>
        <span className="font-bold">{eth}</span>
        <span className="text-zinc-600 text-[10px] font-bold uppercase tracking-wider">ETH</span>
      </div>

      {/* USDC */}
      <div className="flex items-center gap-1.5 px-3 h-full text-zinc-300 border-r border-zinc-800">
        <span className="text-blue-400">{USDC_ICON}</span>
        <span className="font-bold">{usdc}</span>
        <span className="text-zinc-600 text-[10px] font-bold uppercase tracking-wider">USDC</span>
      </div>

      {/* Address + status dot */}
      <div className="flex items-center gap-2 px-3 h-full">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
        </span>
        <span className="text-zinc-400">
          {address?.slice(0, 6)}…{address?.slice(-4)}
        </span>
      </div>

    </div>
  );
};
