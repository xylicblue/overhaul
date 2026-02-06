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
    <div className="rounded-xl bg-[#0a0a0a] border border-zinc-800/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-zinc-800/40">
        <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Testnet Faucets</h3>
      </div>
      
      {/* Faucet Buttons */}
      <div className="p-3 flex gap-2">
        {/* Mint USDC Button */}
        <button
          onClick={mintUSDC}
          disabled={!isConnected || isPending || isConfirming}
          className="flex-1 px-4 py-2.5 text-xs font-semibold text-zinc-50 hover:text-white bg-zinc-800/60 hover:bg-zinc-700/80 border border-zinc-600 hover:border-zinc-500 rounded-lg transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          {isPending || isConfirming ? "Minting..." : "Mint 10K USDC"}
        </button>

        {/* Get ETH Button */}
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
          className="flex-1 px-4 py-2.5 text-xs font-semibold text-zinc-50 hover:text-white bg-zinc-800/60 hover:bg-zinc-700/80 border border-zinc-600 hover:border-zinc-500 rounded-lg transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          Get Sepolia ETH
        </button>
      </div>
    </div>
  );
}

export default MintUSDC;
