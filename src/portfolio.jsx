import React, { useState, useEffect } from "react";
import { supabase } from "./creatclient";
import { useAccount } from "wagmi";
import {
  useAllPositions,
  useAccountValue,
  useVaultBalance,
} from "./hooks/useClearingHouse";
import { useMarkPrice, useFundingRate } from "./hooks/useVAMM";
import { useReadContract } from "wagmi";
import { SEPOLIA_CONTRACTS } from "./contracts/addresses";
import MarketRegistryABI from "./contracts/abis/MarketRegistry.json";
import PageTransition from "./components/PageTransition";
import EmptyState from "./components/EmptyState";
import { TableSkeleton } from "./components/Skeleton";
import PnLChart from "./components/PnLChart";
import "./portfolio.css";

import {
  HiOutlineWallet,
  HiArrowTrendingUp,
  HiArrowTrendingDown,
  HiOutlineShieldCheck,
  HiOutlineBolt,
  HiOutlineBanknotes,
  HiOutlineRectangleStack,
  HiOutlineArrowsRightLeft,
  HiArrowUp,
  HiArrowDown,
} from "react-icons/hi2";

// --- UI SUB-COMPONENTS ---

// Position Row Component - calculates Net P&L (unrealized)
const PositionRow = ({ pos }) => {
  const { price: markPrice } = useMarkPrice(pos.vammAddress);
  const { cumulativeFunding: currentFundingIndex } = useFundingRate(
    pos.vammAddress
  );

  const { data: marketConfig } = useReadContract({
    address: SEPOLIA_CONTRACTS.marketRegistry,
    abi: MarketRegistryABI.abi,
    functionName: "getMarket",
    args: [pos.marketId],
    chainId: 11155111,
  });

  const entryPrice = parseFloat(pos.entryPriceX18);
  const size = parseFloat(pos.size);
  const absSize = Math.abs(size);
  const currentPrice = markPrice ? parseFloat(markPrice) : 0;
  const isLong = pos.isLong;

  // Trading P&L
  const tradingPnL =
    currentPrice > 0
      ? isLong
        ? (currentPrice - entryPrice) * absSize
        : (entryPrice - currentPrice) * absSize
      : 0;

  // Funding earned/paid
  const currentIndex = parseFloat(currentFundingIndex || 0);
  const lastIndex = parseFloat(pos.lastFundingIndex || 0);
  const fundingPayment = (currentIndex - lastIndex) * size;
  const fundingEarned = -fundingPayment;

  // Fees paid
  const feeBps = marketConfig?.feeBps || 10;
  const openNotional = entryPrice * absSize;
  const feesPaid = (openNotional * feeBps) / 10000;

  // Net P&L (this is what shows in position card)
  const netPnL = tradingPnL + fundingEarned - feesPaid;

  return (
    <tr className="hover:bg-zinc-800/30 transition-colors">
      <td className="px-6 py-4 font-medium text-white">{pos.marketName}</td>
      <td className="px-6 py-4">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
            isLong
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}
        >
          {isLong ? (
            <HiArrowUp className="w-3 h-3" />
          ) : (
            <HiArrowDown className="w-3 h-3" />
          )}
          {isLong ? "Long" : "Short"}
        </span>
      </td>
      <td className="px-6 py-4 text-right font-mono text-zinc-300">
        {absSize.toFixed(4)}
      </td>
      <td className="px-6 py-4 text-right font-mono text-zinc-300">
        ${entryPrice.toFixed(2)}
      </td>
      <td className="px-6 py-4 text-right font-mono text-zinc-300">
        ${parseFloat(pos.margin).toFixed(2)}
      </td>
      <td
        className={`px-6 py-4 text-right font-mono font-bold ${
          netPnL >= 0 ? "text-emerald-400" : "text-red-400"
        }`}
      >
        {netPnL >= 0 ? "+" : ""}${netPnL.toFixed(2)}
      </td>
    </tr>
  );
};

const PortfolioHeader = ({
  username,
  portfolioValue,
  realizedPnl,
  realizedPnlPercent,
}) => (
  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
    <div>
      <span className="text-zinc-400 text-sm font-medium">Welcome back,</span>
      <h1 className="text-3xl font-bold text-white mt-1 tracking-tight">
        {username?.toUpperCase() || "TRADER"}
      </h1>
    </div>
    <div className="flex gap-4 w-full md:w-auto">
      <div className="flex-1 md:flex-none bg-[#0A0A0A]/50 border border-zinc-800 rounded-xl p-4 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium mb-1">
          <HiOutlineWallet className="w-4 h-4" />
          <span>Total Value</span>
        </div>
        <span className="text-xl font-mono font-bold text-white">
          $
          {portfolioValue.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      </div>
      <div className="flex-1 md:flex-none bg-[#0A0A0A]/50 border border-zinc-800 rounded-xl p-4 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium mb-1">
          {realizedPnl >= 0 ? (
            <HiArrowTrendingUp className="w-4 h-4 text-emerald-400" />
          ) : (
            <HiArrowTrendingDown className="w-4 h-4 text-red-400" />
          )}
          <span>Realized P&L</span>
        </div>
        <div
          className={`flex items-baseline gap-2 font-mono font-bold ${
            realizedPnl >= 0 ? "text-emerald-400" : "text-red-400"
          }`}
        >
          <span className="text-xl">
            {realizedPnl >= 0 ? "+" : ""}$
            {Math.abs(realizedPnl).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
          <span className="text-xs opacity-80">({realizedPnlPercent}%)</span>
        </div>
      </div>
    </div>
  </div>
);

const IconSummaryCard = ({ icon, label, value }) => (
  <div className="bg-[#0A0A0A]/50 border border-zinc-800 rounded-xl p-5 flex items-center gap-4 hover:border-zinc-700 transition-colors backdrop-blur-sm group">
    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white group-hover:bg-zinc-700 transition-colors">
      <div className="text-xl">{icon}</div>
    </div>
    <div>
      <div className="text-zinc-400 text-xs font-medium mb-0.5">{label}</div>
      <div className="text-lg font-mono font-bold text-white">
        $
        {value.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </div>
    </div>
  </div>
);

const AccountSummary = ({ availableMargin, totalCollateral, buyingPower }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
    <IconSummaryCard
      icon={<HiOutlineBanknotes />}
      label="Available Margin"
      value={availableMargin}
    />
    <IconSummaryCard
      icon={<HiOutlineShieldCheck />}
      label="Total Collateral"
      value={totalCollateral}
    />
    <IconSummaryCard
      icon={<HiOutlineBolt />}
      label="Buying Power"
      value={buyingPower}
    />
  </div>
);

const HistoryTabs = ({ activeTab, setActiveTab }) => (
  <div className="flex gap-1 bg-[#0A0A0A]/50 p-1 rounded-lg border border-zinc-800 w-fit mb-6">
    <button
      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
        activeTab === "positions"
          ? "bg-zinc-800 text-white shadow-sm"
          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
      }`}
      onClick={() => setActiveTab("positions")}
    >
      <HiOutlineRectangleStack className="w-4 h-4" />
      Open Positions
    </button>
    <button
      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
        activeTab === "trades"
          ? "bg-zinc-800 text-white shadow-sm"
          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
      }`}
      onClick={() => setActiveTab("trades")}
    >
      <HiOutlineArrowsRightLeft className="w-4 h-4" />
      Trade History
    </button>
  </div>
);

// --- MAIN PORTFOLIO PAGE COMPONENT ---

const PortfolioPage = () => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState("positions");
  const [tradeHistory, setTradeHistory] = useState([]);
  const [tradesLoading, setTradesLoading] = useState(false);

  // Get wallet connection and blockchain data
  const { address, isConnected } = useAccount();
  const { positions, isLoading: positionsLoading } = useAllPositions();
  const { accountValue, isLoading: accountLoading } = useAccountValue();
  const { totalCollateralValue, isLoading: vaultLoading } = useVaultBalance();

  useEffect(() => {
    // Fetch the current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for authentication state changes (login, logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Fetch user profile when the session is available
    if (session?.user) {
      supabase
        .from("profiles")
        .select("username")
        .eq("id", session.user.id)
        .single()
        .then(({ data, error }) => {
          if (error) console.warn("Error fetching profile:", error.message);
          if (data) setProfile(data);
        });
    }
  }, [session]);

  useEffect(() => {
    // Fetch trade history from Supabase
    const fetchTradeHistory = async () => {
      if (!address) return;

      setTradesLoading(true);
      try {
        const { data, error } = await supabase
          .from("trade_history")
          .select("*")
          .eq("user_address", address.toLowerCase())
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) {
          console.warn("Error fetching trades:", error.message);
        } else {
          setTradeHistory(data || []);
        }
      } catch (err) {
        console.warn("Error fetching trades:", err);
      } finally {
        setTradesLoading(false);
      }
    };

    fetchTradeHistory();
  }, [address]);

  const renderContent = () => {
    switch (activeTab) {
      case "positions":
        return (
          <div className="bg-[#0A0A0A]/50 border border-zinc-800 rounded-xl overflow-hidden backdrop-blur-sm">
            {positionsLoading ? (
              <div className="p-12 text-center text-zinc-500 text-sm">
                Loading positions...
              </div>
            ) : positions.length === 0 ? (
              <EmptyState
                type="positions"
                title="No Open Positions"
                description="You don't have any active positions yet. Start trading to build your portfolio."
                actionLabel="Go to Trade"
                actionHref="/trade"
                tips={[]}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-[#0A0A0A]/50 text-zinc-400 font-medium">
                      <th className="px-6 py-4">Market</th>
                      <th className="px-6 py-4">Side</th>
                      <th className="px-6 py-4 text-right">Size</th>
                      <th className="px-6 py-4 text-right">Entry Price</th>
                      <th className="px-6 py-4 text-right">Margin</th>
                      <th className="px-6 py-4 text-right">Unrealized P&L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {positions.map((pos) => (
                      <PositionRow key={pos.marketId} pos={pos} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      case "trades":
        return (
          <div className="bg-[#0A0A0A]/50 border border-zinc-800 rounded-xl overflow-hidden backdrop-blur-sm">
            {tradesLoading ? (
              <div className="p-12 text-center text-zinc-500 text-sm">
                Loading trade history...
              </div>
            ) : tradeHistory.length === 0 ? (
              <EmptyState
                type="trades"
                title="No Trade History"
                description="Your trading activity will appear here once you make your first trade."
                actionLabel="Start Trading"
                actionHref="/trade"
                tips={[]}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-[#0A0A0A]/50 text-zinc-400 font-medium">
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Market</th>
                      <th className="px-6 py-4">Side</th>
                      <th className="px-6 py-4 text-right">Size</th>
                      <th className="px-6 py-4 text-right">Price</th>
                      <th className="px-6 py-4 text-right">P&L</th>
                      <th className="px-6 py-4 text-right">Funding</th>
                      <th className="px-6 py-4 text-right">Fees</th>
                      <th className="px-6 py-4 text-right">Tx Hash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {tradeHistory.map((trade, index) => {
                      const hasPnL =
                        trade.pnl !== null && trade.pnl !== undefined;
                      const pnlValue = hasPnL ? parseFloat(trade.pnl) : null;
                      const isPnLPositive = pnlValue !== null && pnlValue >= 0;

                      const hasFunding =
                        trade.funding_earned !== null &&
                        trade.funding_earned !== undefined;
                      const fundingValue = hasFunding
                        ? parseFloat(trade.funding_earned)
                        : null;
                      const isFundingPositive =
                        fundingValue !== null && fundingValue >= 0;

                      const hasFees =
                        trade.fees_paid !== null &&
                        trade.fees_paid !== undefined;
                      const feesValue = hasFees
                        ? parseFloat(trade.fees_paid)
                        : null;

                      return (
                        <tr
                          key={trade.id || index}
                          className="hover:bg-zinc-800/30 transition-colors"
                        >
                          <td className="px-6 py-4 text-zinc-400 text-xs">
                            {new Date(trade.created_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 font-medium text-white">
                            {trade.market}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                                trade.side === "Long"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-red-500/10 text-red-400 border border-red-500/20"
                              }`}
                            >
                              {trade.side === "Long" ? (
                                <HiArrowUp className="w-3 h-3" />
                              ) : (
                                <HiArrowDown className="w-3 h-3" />
                              )}
                              {trade.side}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-zinc-300">
                            {parseFloat(trade.size).toFixed(4)}
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-zinc-300">
                            ${parseFloat(trade.price).toFixed(2)}
                          </td>
                          <td
                            className={`px-6 py-4 text-right font-mono font-bold ${
                              hasPnL
                                ? isPnLPositive
                                  ? "text-emerald-400"
                                  : "text-red-400"
                                : ""
                            }`}
                          >
                            {hasPnL ? (
                              `${isPnLPositive ? "+" : ""}$${pnlValue.toFixed(2)}`
                            ) : (
                              <span className="inline-block px-2 py-0.5 text-[10px] font-semibold text-zinc-500 bg-zinc-800/50 rounded">
                                OPEN
                              </span>
                            )}
                          </td>
                          <td
                            className={`px-6 py-4 text-right font-mono ${
                              hasFunding
                                ? isFundingPositive
                                  ? "text-emerald-400"
                                  : "text-red-400"
                                : "text-zinc-600"
                            }`}
                          >
                            {hasFunding
                              ? `${isFundingPositive ? "+" : ""}$${fundingValue.toFixed(2)}`
                              : "·"}
                          </td>
                          <td className={`px-6 py-4 text-right font-mono ${hasFees ? "text-red-400" : "text-zinc-600"}`}>
                            {hasFees ? `-$${feesValue.toFixed(2)}` : "·"}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <a
                              href={`https://sepolia.etherscan.io/tx/${trade.tx_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 hover:underline font-mono text-xs"
                            >
                              {trade.tx_hash?.slice(0, 6)}...
                              {trade.tx_hash?.slice(-4)}
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // Calculate portfolio metrics from on-chain data
  // IMPORTANT: accountValue from getAccountValue() is ALREADY (collateral - reserved margin)
  // So it represents your available margin directly!
  const availableMargin = parseFloat(accountValue) || 0;

  // Total collateral is the raw vault balance
  const totalCollateral = parseFloat(totalCollateralValue) || 0;

  // Total margin locked = collateral - available
  const totalMarginUsed = totalCollateral - availableMargin;

  // Calculate total realized P&L: sum of realized P&L from all open positions
  const totalRealizedPnL = (positions || []).reduce(
    (sum, pos) => sum + parseFloat(pos.realizedPnL || 0),
    0
  );

  // Buying power = available margin × leverage (10x)
  const buyingPower = availableMargin * 10;

  // Calculate realized P&L percentage relative to total collateral
  const realizedPnlPercent =
    totalCollateral > 0
      ? ((totalRealizedPnL / totalCollateral) * 100).toFixed(2)
      : "0.00";

  if (!isConnected) {
    return (
      <PageTransition className="min-h-screen bg-[#050505] pt-24 pb-12 px-4 flex items-center justify-center">
        <EmptyState
          type="wallet"
          title="Connect Your Wallet"
          description="Connect your wallet to access your portfolio, view open positions, and track your trading history."
          secondaryActionLabel="Learn More"
          secondaryActionHref="/guide"
        />
      </PageTransition>
    );
  }

  return (
    <PageTransition className="min-h-screen bg-[#050505] pt-16 pb-12 px-4 md:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto">
        <PortfolioHeader
          username={profile?.username}
          portfolioValue={totalCollateral}
          realizedPnl={totalRealizedPnL}
          realizedPnlPercent={realizedPnlPercent}
        />
        <AccountSummary
          availableMargin={availableMargin}
          totalCollateral={totalCollateral}
          buyingPower={buyingPower}
        />
        <div className="space-y-6">
          <HistoryTabs activeTab={activeTab} setActiveTab={setActiveTab} />
          {renderContent()}
        </div>
        <div className="mt-6">
          <PnLChart tradeHistory={tradeHistory} />
        </div>
      </div>
    </PageTransition>
  );
};

export default PortfolioPage;
