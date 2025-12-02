import { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, formatUnits } from "ethers";
import { toast } from "react-hot-toast";
import { SEPOLIA_CONTRACTS, COLLATERAL_TOKENS } from "../contracts/addresses";
import { useDeposit, useWithdraw } from "../hooks/useClearingHouse";
import {
  Wallet,
  ArrowDownUp,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Shield,
  Coins,
} from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Separator } from "./ui/separator";

const ERC20_ABI = [
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

export function CollateralManager() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState("");
  const [isDepositing, setIsDepositing] = useState(true);
  const selectedToken = COLLATERAL_TOKENS[0]; // Default to mUSDC

  const {
    writeContract: approveToken,
    data: approveHash,
    isPending: isApproving,
    error: approveError,
    reset: resetApprove,
  } = useWriteContract();
  const { isLoading: isApprovingTx, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  const {
    deposit,
    isPending: isDepositPending,
    isSuccess: isDepositSuccess,
    error: depositError,
    reset: resetDeposit,
  } = useDeposit();
  const {
    withdraw,
    isPending: isWithdrawPending,
    isSuccess: isWithdrawSuccess,
    error: withdrawError,
    reset: resetWithdraw,
  } = useWithdraw();

  const { data: tokenBalance } = useReadContract({
    address: selectedToken.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address],
    query: { enabled: !!address, refetchInterval: 5000 },
  });
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: selectedToken.address,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address, SEPOLIA_CONTRACTS.collateralVault],
    query: { enabled: !!address, refetchInterval: 5000 },
  });
  const { data: vaultBalance, refetch: refetchVaultBalance } = useReadContract({
    address: SEPOLIA_CONTRACTS.collateralVault,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address, selectedToken.address],
    query: { enabled: !!address, refetchInterval: 5000 },
  });

  const formattedBalance = tokenBalance
    ? formatUnits(tokenBalance, selectedToken.decimals)
    : "0";
  const formattedAllowance = allowance
    ? formatUnits(allowance, selectedToken.decimals)
    : "0";

  const handleApprove = async () => {
    // If no amount set, approve a large amount (e.g., 1M) for convenience, or the balance
    const amountToApprove =
      amount && parseFloat(amount) > 0 ? amount : "1000000";
    try {
      approveToken({
        address: selectedToken.address,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [
          SEPOLIA_CONTRACTS.collateralVault,
          parseUnits(amountToApprove, selectedToken.decimals),
        ],
        chainId: 11155111,
      });
      toast.loading("Approving...", { id: "approve" });
    } catch (error) {
      toast.error("Failed to approve");
    }
  };

  const handleAction = async () => {
    if (!amount || parseFloat(amount) <= 0)
      return toast.error("Enter valid amount");
    try {
      if (isDepositing) {
        if (parseFloat(formattedAllowance) < parseFloat(amount))
          return toast.error("Insufficient allowance");
        deposit(selectedToken.address, amount);
        toast.loading("Depositing...", { id: "deposit" });
      } else {
        withdraw(selectedToken.address, amount);
        toast.loading("Withdrawing...", { id: "withdraw" });
      }
    } catch (error) {
      toast.error("Action failed");
    }
  };

  useEffect(() => {
    if (isApproveSuccess) {
      toast.success("Approved!", { id: "approve" });
      refetchAllowance();
    }
  }, [isApproveSuccess]);
  useEffect(() => {
    if (isDepositSuccess) {
      toast.success("Deposited!", { id: "deposit" });
      setAmount("");
      refetchVaultBalance();
    }
  }, [isDepositSuccess]);
  useEffect(() => {
    if (isWithdrawSuccess) {
      toast.success("Withdrawn!", { id: "withdraw" });
      setAmount("");
      refetchVaultBalance();
    }
  }, [isWithdrawSuccess]);

  if (!isConnected) return null;

  const needsApproval =
    isDepositing &&
    parseFloat(amount) > 0 &&
    parseFloat(formattedAllowance) < parseFloat(amount);
  const isApproved =
    isDepositing &&
    parseFloat(formattedAllowance) >= parseFloat(amount || "0") &&
    parseFloat(formattedAllowance) > 0;
  const formattedVaultBalance = vaultBalance
    ? parseFloat(formatUnits(vaultBalance, 6)).toFixed(2)
    : "0.00";
  const walletBalanceNum = parseFloat(formattedBalance);
  const vaultBalanceNum = parseFloat(formattedVaultBalance);
  const allowanceNum = parseFloat(formattedAllowance);

  return (
    <div className="space-y-3">
      {/* Balance Overview Cards */}
      <div className="grid grid-cols-2 gap-2">
        {/* Wallet Balance Card */}
        <Card className="bg-gradient-to-br from-slate-900 to-slate-950 border-slate-700/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10">
                <Wallet size={12} className="text-blue-400" />
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                Wallet
              </span>
            </div>
            <div className="text-lg font-bold text-white font-mono">
              {walletBalanceNum.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="text-[10px] text-slate-500">USDC</div>
          </CardContent>
        </Card>

        {/* Deposited Balance Card */}
        <Card className="bg-gradient-to-br from-green-950/30 to-slate-950 border-green-700/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-green-500/10">
                <Shield size={12} className="text-green-400" />
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                Deposited
              </span>
            </div>
            <div className="text-lg font-bold text-green-400 font-mono">
              {vaultBalanceNum.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="text-[10px] text-slate-500">USDC in Vault</div>
          </CardContent>
        </Card>
      </div>

      {/* Approval Status */}
      <Card className="bg-slate-900/30 border-slate-800/50">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`p-1 rounded-full ${
                  allowanceNum > 0 ? "bg-green-500/20" : "bg-slate-700/50"
                }`}
              >
                {allowanceNum > 0 ? (
                  <CheckCircle2 size={12} className="text-green-400" />
                ) : (
                  <AlertCircle size={12} className="text-slate-500" />
                )}
              </div>
              <span className="text-xs text-slate-400">Approved Allowance</span>
            </div>
            <Badge variant={allowanceNum > 0 ? "success" : "secondary"}>
              {allowanceNum > 1000000
                ? "Unlimited"
                : allowanceNum > 1000
                ? "1000+"
                : allowanceNum.toFixed(0)}{" "}
              USDC
            </Badge>
          </div>
          {allowanceNum > 0 && walletBalanceNum > 0 && (
            <div className="mt-2">
              <Progress
                value={Math.min(allowanceNum, walletBalanceNum)}
                max={walletBalanceNum}
                indicatorClassName="bg-gradient-to-r from-green-600 to-green-400"
              />
              <div className="text-[10px] text-slate-600 mt-1 text-right">
                {(
                  (Math.min(allowanceNum, walletBalanceNum) /
                    walletBalanceNum) *
                  100
                ).toFixed(0)}
                % of wallet approved
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator className="bg-slate-800/50" />

      {/* Deposit/Withdraw Section */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ArrowDownUp size={12} />
              <span>Manage Collateral</span>
            </div>
            <div className="flex bg-slate-950 rounded-lg p-0.5 border border-slate-800">
              <button
                onClick={() => setIsDepositing(true)}
                className={`px-3 py-1 text-[10px] rounded-md font-medium transition-all ${
                  isDepositing
                    ? "bg-green-600/20 text-green-400 border border-green-500/30"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Deposit
              </button>
              <button
                onClick={() => setIsDepositing(false)}
                className={`px-3 py-1 text-[10px] rounded-md font-medium transition-all ${
                  !isDepositing
                    ? "bg-red-600/20 text-red-400 border border-red-500/30"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Withdraw
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>
                Available:{" "}
                {isDepositing ? walletBalanceNum.toFixed(2) : vaultBalanceNum}{" "}
                USDC
              </span>
            </div>

            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-mono"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                <span className="text-[10px] text-slate-500">USDC</span>
                <button
                  onClick={() =>
                    setAmount(
                      isDepositing
                        ? formattedBalance
                        : vaultBalance
                        ? formatUnits(vaultBalance, 6)
                        : "0"
                    )
                  }
                  className="text-[10px] text-blue-400 hover:text-blue-300 font-bold bg-blue-500/10 px-2 py-0.5 rounded"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {isDepositing && (
                <button
                  onClick={handleApprove}
                  disabled={
                    isApproving ||
                    isApprovingTx ||
                    (allowanceNum >= parseFloat(amount || "0") &&
                      parseFloat(amount || "0") > 0)
                  }
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 ${
                    needsApproval
                      ? "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-900/20"
                      : "bg-slate-800 text-slate-500 border border-slate-700"
                  }`}
                >
                  <CheckCircle2 size={12} />
                  {isApproving || isApprovingTx ? "Approving..." : "Approve"}
                </button>
              )}

              <button
                onClick={handleAction}
                disabled={
                  isDepositPending ||
                  isWithdrawPending ||
                  !amount ||
                  (isDepositing && needsApproval)
                }
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 ${
                  !needsApproval && amount
                    ? isDepositing
                      ? "bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white shadow-lg shadow-green-900/20"
                      : "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-lg shadow-red-900/20"
                    : "bg-slate-800 text-slate-500 border border-slate-700"
                }`}
              >
                <Coins size={12} />
                {isDepositPending || isWithdrawPending
                  ? "Processing..."
                  : isDepositing
                  ? "Deposit"
                  : "Withdraw"}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CollateralManager;
