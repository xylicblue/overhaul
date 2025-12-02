// Component for minting testnet USDC tokens
import { useState, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits } from "ethers";
import toast from "react-hot-toast";
import { SEPOLIA_CONTRACTS } from "../contracts/addresses";
import { Coins, Fuel, Sparkles } from "lucide-react";
import { Card, CardContent } from "./ui/card";

const USDC_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

export function MintUSDC() {
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (hash && isConfirming) toast.loading("Minting USDC...", { id: "mint" });
    if (isSuccess)
      toast.success("✅ Successfully minted 10,000 USDC!", { id: "mint" });
  }, [hash, isConfirming, isSuccess]);

  useEffect(() => {
    if (error) {
      const errorMsg = error.message?.includes("User rejected")
        ? "Transaction cancelled"
        : `Mint failed: ${error.message}`;
      toast.error(errorMsg, { id: "mint" });
    }
  }, [error]);

  const mintUSDC = () => {
    if (!isConnected) return toast.error("Please connect your wallet first");
    if (!address) return toast.error("Wallet address not found");
    try {
      writeContract({
        address: SEPOLIA_CONTRACTS.usdc,
        abi: USDC_ABI,
        functionName: "mint",
        args: [address, parseUnits("10000", 6)],
      });
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    }
  };

  return (
    <Card className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border-slate-700/50">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={12} className="text-yellow-400" />
          <span className="text-[10px] text-slate-400 font-medium">
            Testnet Faucets
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={mintUSDC}
            disabled={!isConnected || isPending || isConfirming}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-gradient-to-r from-blue-600/20 to-blue-500/10 text-blue-400 hover:from-blue-600/30 hover:to-blue-500/20 rounded-lg border border-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Get free testnet USDC"
          >
            <Coins size={14} />
            <span>
              {isPending || isConfirming ? "Minting..." : "Mint 10K USDC"}
            </span>
          </button>

          <button
            onClick={async () => {
              if (!isConnected) return toast.error("Please connect wallet");
              try {
                toast.loading("Requesting ETH...", { id: "faucet" });

                // Call the ByteStrike Railway faucet API
                const response = await fetch(
                  "https://bytestrike-faucet-bot-production-1fc7.up.railway.app/request",
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ walletAddress: address }),
                  }
                );

                const data = await response.json();

                if (response.ok && data.success) {
                  toast.success(
                    <div>
                      <div>Sent 0.04 ETH!</div>
                      {data.txHash && (
                        <a
                          href={`https://sepolia.etherscan.io/tx/${data.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-sm"
                        >
                          View on Etherscan →
                        </a>
                      )}
                    </div>,
                    { id: "faucet", duration: 5000 }
                  );
                } else {
                  // Handle specific error messages from the API
                  const errorMsg =
                    data.message || data.error || "Faucet request failed";
                  toast.error(errorMsg, { id: "faucet" });
                }
              } catch (err) {
                console.error("Faucet error:", err);
                toast.error("Faucet unavailable, opening external site", {
                  id: "faucet",
                });
                setTimeout(() => {
                  window.open("https://sepoliafaucet.com", "_blank");
                }, 1000);
              }
            }}
            disabled={!isConnected}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-gradient-to-r from-purple-600/20 to-purple-500/10 text-purple-400 hover:from-purple-600/30 hover:to-purple-500/20 rounded-lg border border-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Get free Sepolia ETH"
          >
            <Fuel size={14} />
            <span>Get ETH</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export default MintUSDC;
