import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, formatUnits } from "ethers";
import { toast } from "react-hot-toast";
import { SEPOLIA_CONTRACTS, COLLATERAL_TOKENS } from "../contracts/addresses";
import CollateralVaultABI from "../contracts/abis/CollateralVault.json";
import { useAllPositions, useDeposit, useWithdraw } from "../hooks/useClearingHouse";
import { usePositionMetrics } from "../hooks/usePositionMetrics";
import ConfirmationModal from "./ConfirmationModal";
import { CheckCircle2, AlertCircle, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

const ERC20_ABI = [
  {
    inputs: [{ internalType: "address", name: "spender", type: "address" }, { internalType: "uint256", name: "amount", type: "uint256" }],
    name: "approve", outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable", type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }, { internalType: "address", name: "spender", type: "address" }],
    name: "allowance", outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view", type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf", outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view", type: "function",
  },
];

const formatSignedMoney = (value) => {
  const amount = Number(value || 0);
  return `${amount >= 0 ? "+" : "-"}$${Math.abs(amount).toFixed(3)}`;
};

const formatUpdatedTime = (timestamp) => timestamp
  ? new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  : "Waiting for live data";

function PositionFundingCollector({ position, onUpdate, onRegisterRefetch }) {
  const metrics = usePositionMetrics(position);

  useEffect(() => {
    onUpdate(position.marketId, {
      pendingFunding: metrics.pendingFunding,
      effectiveMargin: metrics.effectiveMargin,
      marginRatioPercent: metrics.marginRatioPercent,
      lastUpdatedAt: metrics.lastUpdatedAt,
      ready: metrics.hasPnlData && metrics.hasLiquidationData,
    });
  }, [
    onUpdate,
    position.marketId,
    metrics.pendingFunding,
    metrics.effectiveMargin,
    metrics.marginRatioPercent,
    metrics.lastUpdatedAt,
    metrics.hasPnlData,
    metrics.hasLiquidationData,
  ]);

  useEffect(() => onRegisterRefetch(position.marketId, metrics.refetch), [onRegisterRefetch, position.marketId, metrics.refetch]);
  return null;
}

export function CollateralManager() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount]       = useState("");
  const [isDepositing, setIsDepositing] = useState(true);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [isRefreshingPreview, setIsRefreshingPreview] = useState(false);
  const [fundingSnapshots, setFundingSnapshots] = useState({});
  const fundingRefetchers = useRef(new Map());
  const selectedToken = COLLATERAL_TOKENS[0];

  const { writeContract: approveToken, data: approveHash, isPending: isApproving } = useWriteContract();
  const { isLoading: isApprovingTx, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });
  const { deposit, isPending: isDepositPending, isSuccess: isDepositSuccess } = useDeposit();
  const { withdraw, isPending: isWithdrawPending, isSuccess: isWithdrawSuccess } = useWithdraw();
  const { positions, refetch: refetchPositions } = useAllPositions();

  const { data: tokenBalance } = useReadContract({
    address: selectedToken.address, abi: ERC20_ABI, functionName: "balanceOf",
    args: [address], query: { enabled: !!address, refetchInterval: 5000 },
  });
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: selectedToken.address, abi: ERC20_ABI, functionName: "allowance",
    args: [address, SEPOLIA_CONTRACTS.collateralVault], query: { enabled: !!address, refetchInterval: 5000 },
  });
  const { data: vaultBalance, refetch: refetchVaultBalance } = useReadContract({
    address: SEPOLIA_CONTRACTS.collateralVault, abi: CollateralVaultABI.abi, functionName: "balanceOf",
    args: [address, selectedToken.address], query: { enabled: !!address, refetchInterval: 5000 },
  });

  const formattedBalance     = tokenBalance ? formatUnits(tokenBalance, selectedToken.decimals) : "0";
  const formattedAllowance   = allowance    ? formatUnits(allowance, selectedToken.decimals)    : "0";
  const formattedVaultBalance = vaultBalance ? parseFloat(formatUnits(vaultBalance, 6)).toFixed(2) : "0.00";
  const walletBalanceNum     = parseFloat(formattedBalance);
  const vaultBalanceNum      = parseFloat(formattedVaultBalance);
  const allowanceNum         = parseFloat(formattedAllowance);

  const needsApproval = isDepositing && parseFloat(amount) > 0 && allowanceNum < parseFloat(amount);

  const recordFundingSnapshot = useCallback((marketId, snapshot) => {
    setFundingSnapshots((current) => {
      const previous = current[marketId];
      if (
        previous &&
        previous.pendingFunding === snapshot.pendingFunding &&
        previous.effectiveMargin === snapshot.effectiveMargin &&
        previous.marginRatioPercent === snapshot.marginRatioPercent &&
        previous.lastUpdatedAt === snapshot.lastUpdatedAt &&
        previous.ready === snapshot.ready
      ) return current;
      return { ...current, [marketId]: snapshot };
    });
  }, []);

  const registerFundingRefetch = useCallback((marketId, refetch) => {
    fundingRefetchers.current.set(marketId, refetch);
    return () => fundingRefetchers.current.delete(marketId);
  }, []);

  useEffect(() => {
    const activeIds = new Set((positions || []).map((position) => position.marketId));
    setFundingSnapshots((current) => {
      const next = Object.fromEntries(Object.entries(current).filter(([marketId]) => activeIds.has(marketId)));
      return Object.keys(next).length === Object.keys(current).length ? current : next;
    });
  }, [positions]);

  const fundingSummary = useMemo(() => Object.values(fundingSnapshots)
    .filter((snapshot) => snapshot.ready)
    .reduce((summary, snapshot) => {
      const funding = Number(snapshot.pendingFunding || 0);
      if (funding < 0) summary.payable += Math.abs(funding);
      if (funding > 0) summary.receivable += funding;
      summary.net += funding;
      if (snapshot.lastUpdatedAt > 0) {
        summary.lastUpdatedAt = summary.lastUpdatedAt === 0
          ? snapshot.lastUpdatedAt
          : Math.min(summary.lastUpdatedAt, snapshot.lastUpdatedAt);
      }
      return summary;
    }, { payable: 0, receivable: 0, net: 0, lastUpdatedAt: 0 }), [fundingSnapshots]);

  const handleApprove = async () => {
    const amountToApprove = amount && parseFloat(amount) > 0 ? amount : "1000000";
    try {
      approveToken({
        address: selectedToken.address, abi: ERC20_ABI, functionName: "approve",
        args: [SEPOLIA_CONTRACTS.collateralVault, parseUnits(amountToApprove, selectedToken.decimals)],
        chainId: 11155111,
      });
      toast.loading("Approving…", { id: "approve" });
    } catch { toast.error("Failed to approve"); }
  };

  const confirmWithdrawal = async () => {
    try {
      withdraw(selectedToken.address, amount);
      toast.loading("Withdrawing…", { id: "withdraw" });
    } catch {
      toast.error("Withdrawal failed");
    }
  };

  const handleAction = async () => {
    if (!amount || parseFloat(amount) <= 0) return toast.error("Enter valid amount");
    try {
      if (isDepositing) {
        if (needsApproval) return toast.error("Insufficient allowance — approve first");
        deposit(selectedToken.address, amount);
        toast.loading("Depositing…", { id: "deposit" });
      } else {
        if (parseFloat(amount) > vaultBalanceNum) return toast.error("Amount exceeds deposited collateral");
        setIsRefreshingPreview(true);
        await refetchPositions?.();
        await Promise.allSettled([...fundingRefetchers.current.values()].map((refetch) => refetch?.()));
        setShowWithdrawConfirm(true);
      }
    } catch { toast.error("Action failed"); }
    finally { setIsRefreshingPreview(false); }
  };

  useEffect(() => { if (isApproveSuccess) { toast.success("Approved", { id: "approve" }); refetchAllowance(); } }, [isApproveSuccess, refetchAllowance]);
  useEffect(() => { if (isDepositSuccess) { toast.success("Deposited", { id: "deposit" }); setAmount(""); refetchVaultBalance(); } }, [isDepositSuccess, refetchVaultBalance]);
  useEffect(() => { if (isWithdrawSuccess) { toast.success("Withdrawn", { id: "withdraw" }); setAmount(""); setShowWithdrawConfirm(false); refetchVaultBalance(); } }, [isWithdrawSuccess, refetchVaultBalance]);

  if (!isConnected) return null;

  const isProcessing = isDepositPending || isWithdrawPending || isApproving || isApprovingTx || isRefreshingPreview;

  return (
    <>
      {(!isDepositing || showWithdrawConfirm) && (positions || []).map((position) => (
        <PositionFundingCollector
          key={position.marketId}
          position={position}
          onUpdate={recordFundingSnapshot}
          onRegisterRefetch={registerFundingRefetch}
        />
      ))}
      <div className="rounded-xl border border-zinc-800/60 bg-[#0a0a10] overflow-hidden">

      {/* ── Balance row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 divide-x divide-zinc-800/60 border-b border-zinc-800/60">
        {[
          { label: "Wallet",    value: walletBalanceNum.toFixed(2),  sub: "USDC",         dim: false },
          { label: "Deposited", value: vaultBalanceNum,              sub: "USDC in Vault", dim: false },
        ].map(({ label, value, sub }) => (
          <div key={label} className="px-3 py-2.5">
            <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-1">{label}</div>
            <div className="text-sm font-mono font-bold text-white">{value}</div>
            <div className="text-[9px] text-zinc-600 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Allowance status ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/60 bg-zinc-900/20">
        <div className="flex items-center gap-1.5">
          {allowanceNum > 0
            ? <CheckCircle2 size={11} className="text-emerald-500" />
            : <AlertCircle  size={11} className="text-zinc-600"    />
          }
          <span className="text-[10px] text-zinc-500">Allowance</span>
        </div>
        <span className={`text-[10px] font-mono font-semibold ${allowanceNum > 0 ? "text-emerald-400" : "text-zinc-600"}`}>
          {allowanceNum > 1_000_000 ? "Unlimited" : allowanceNum > 1000 ? "1,000+ USDC" : `${allowanceNum.toFixed(0)} USDC`}
        </span>
      </div>

      {/* ── Deposit / Withdraw ──────────────────────────────────────────── */}
      <div className="p-3 space-y-2.5">
        {/* Tab toggle */}
        <div className="flex bg-zinc-900/60 border border-zinc-800/60 rounded-lg p-0.5 gap-0.5">
          {[
            { key: true,  label: "Deposit",  icon: <ArrowDownToLine  size={11} /> },
            { key: false, label: "Withdraw", icon: <ArrowUpFromLine  size={11} /> },
          ].map(({ key, label, icon }) => (
            <button
              key={label}
              onClick={() => setIsDepositing(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                isDepositing === key
                  ? key
                    ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/25"
                    : "bg-red-600/20 text-red-400 border border-red-500/25"
                  : "text-zinc-600 hover:text-zinc-400"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* Amount input */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Amount</span>
            <span className="text-[9px] text-zinc-600 font-mono">
              Avail: {isDepositing ? walletBalanceNum.toFixed(2) : vaultBalanceNum} USDC
            </span>
          </div>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg pl-3 pr-20 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/20 transition-all font-mono placeholder-zinc-700"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              <span className="text-[9px] font-bold text-zinc-600">USDC</span>
              <button
                onClick={() => setAmount(isDepositing ? formattedBalance : vaultBalance ? formatUnits(vaultBalance, 6) : "0")}
                className="text-[9px] font-bold text-blue-500 hover:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded transition-colors"
              >
                MAX
              </button>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {isDepositing && (
            <button
              onClick={handleApprove}
              disabled={isProcessing || (allowanceNum >= parseFloat(amount || "0") && parseFloat(amount || "0") > 0)}
              className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                needsApproval
                  ? "bg-blue-600 hover:bg-blue-500 text-white"
                  : "bg-zinc-800 text-zinc-500 border border-zinc-700/60"
              }`}
            >
              {isApproving || isApprovingTx ? "Approving…" : "Approve"}
            </button>
          )}
          <button
            onClick={handleAction}
            disabled={isProcessing || !amount || (isDepositing && needsApproval)}
            className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              !needsApproval && amount
                ? isDepositing
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                  : "bg-red-600 hover:bg-red-500 text-white"
                : "bg-zinc-800 text-zinc-500 border border-zinc-700/60"
            }`}
          >
            {isRefreshingPreview ? "Refreshing funding…" : isProcessing ? "Processing…" : isDepositing ? "Deposit" : "Review withdrawal"}
          </button>
        </div>
      </div>
      </div>

      <ConfirmationModal
        isOpen={showWithdrawConfirm}
        onClose={() => { if (!isWithdrawPending) setShowWithdrawConfirm(false); }}
        onConfirm={confirmWithdrawal}
        title="Confirm Collateral Withdrawal"
        message="Withdrawing collateral settles funding across all open positions first. The contract will reject the withdrawal if the remaining collateral is unsafe."
        confirmText="Withdraw Collateral"
        cancelText="Cancel"
        variant="danger"
        isLoading={isWithdrawPending}
        details={
          <div className="space-y-2.5">
            {[
              { label: "Withdrawal", value: `${Number(amount || 0).toFixed(2)} USDC`, cls: "text-ink" },
              { label: "Funding to pay", value: fundingSummary.payable > 0 ? `-$${fundingSummary.payable.toFixed(3)}` : "$0.000", cls: fundingSummary.payable > 0 ? "text-down" : "text-ink-muted" },
              { label: "Funding to receive", value: fundingSummary.receivable > 0 ? `+$${fundingSummary.receivable.toFixed(3)}` : "$0.000", cls: fundingSummary.receivable > 0 ? "text-up" : "text-ink-muted" },
              { label: "Net funding settlement", value: formatSignedMoney(fundingSummary.net), cls: fundingSummary.net < 0 ? "text-down" : fundingSummary.net > 0 ? "text-up" : "text-ink" },
            ].map(({ label, value, cls }) => (
              <div key={label} className="flex items-center justify-between gap-4">
                <span className="text-[11px] text-ink-faint uppercase tracking-[0.1em]">{label}</span>
                <span className={`text-[12px] font-medium font-mono text-right ${cls}`}>{value}</span>
              </div>
            ))}
            <div className="pt-1 text-[9px] text-ink-ghost text-right">
              Live values refreshed {formatUpdatedTime(fundingSummary.lastUpdatedAt)}
            </div>
          </div>
        }
      />
    </>
  );
}

export default CollateralManager;
