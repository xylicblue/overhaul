// Component to display wallet connection status and balances
import { useAccount, useBalance, useChainId } from "wagmi";
import { sepolia } from "wagmi/chains";
import toast from "react-hot-toast";
import { SEPOLIA_CONTRACTS } from "../contracts/addresses";
import { Copy } from "lucide-react";

export function WalletStatus() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  // Get ETH balance
  const { data: ethBalance } = useBalance({
    address,
    chainId: sepolia.id,
  });

  // Get USDC balance
  const { data: usdcBalance } = useBalance({
    address,
    token: SEPOLIA_CONTRACTS.usdc,
    chainId: sepolia.id,
  });

  if (!isConnected) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-white">Wallet</h3>
          <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
            Disconnected
          </div>
        </div>
        <div className="text-center py-4 text-slate-500 text-xs">
          Connect your wallet to start trading
        </div>
      </div>
    );
  }

  const isWrongNetwork = chainId !== sepolia.id;

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-white">Wallet</h3>
        <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
          isWrongNetwork 
            ? "bg-red-500/10 text-red-400 border-red-500/20" 
            : "bg-green-500/10 text-green-400 border-green-500/20"
        }`}>
          {isWrongNetwork ? "Wrong Network" : "Connected"}
        </div>
      </div>

      <div className="flex items-center justify-between bg-slate-950 rounded p-2 mb-4 border border-slate-800">
        <span className="text-xs text-slate-400 font-mono">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <button
          className="text-slate-500 hover:text-blue-400 transition-colors"
          onClick={() => {
            navigator.clipboard.writeText(address);
            toast.success("Address copied!");
          }}
          title="Copy address"
        >
          <Copy className="w-3 h-3" />
        </button>
      </div>

      {isWrongNetwork ? (
        <div className="text-center py-2 text-red-400 text-xs bg-red-500/5 rounded border border-red-500/10">
          Please switch to Sepolia network
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">ETH Balance</span>
            <span className="text-white font-mono">
              {ethBalance ? parseFloat(ethBalance.formatted).toFixed(4) : "0.0000"} ETH
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">USDC Balance</span>
            <span className="text-white font-mono">
              {usdcBalance ? parseFloat(usdcBalance.formatted).toFixed(2) : "0.00"} USDC
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default WalletStatus;
