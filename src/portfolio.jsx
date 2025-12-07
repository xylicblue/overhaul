import React, { useState, useEffect } from "react";
import { supabase } from "./creatclient";
import { useAccount } from "wagmi";
import { useAllPositions, useAccountValue, useVaultBalance } from "./hooks/useClearingHouse";
import { useMarkPrice } from "./hooks/useVAMM";
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

const PortfolioHeader = ({
  username,
  portfolioValue,
  unrealizedPnl,
  unrealizedPnlPercent,
}) => (
  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
    <div>
      <span className="text-slate-400 text-sm font-medium">Welcome back,</span>
      <h1 className="text-3xl font-bold text-white mt-1 tracking-tight">
        {username?.toUpperCase() || "TRADER"}
      </h1>
    </div>
    <div className="flex gap-4 w-full md:w-auto">
      <div className="flex-1 md:flex-none bg-slate-900/50 border border-slate-800 rounded-xl p-4 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
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
      <div className="flex-1 md:flex-none bg-slate-900/50 border border-slate-800 rounded-xl p-4 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
          {unrealizedPnl >= 0 ? (
            <HiArrowTrendingUp className="w-4 h-4 text-green-400" />
          ) : (
            <HiArrowTrendingDown className="w-4 h-4 text-red-400" />
          )}
          <span>Unrealized P&L</span>
        </div>
        <div
          className={`flex items-baseline gap-2 font-mono font-bold ${
            unrealizedPnl >= 0 ? "text-green-400" : "text-red-400"
          }`}
        >
          <span className="text-xl">
            {unrealizedPnl >= 0 ? "+" : ""}$
            {Math.abs(unrealizedPnl).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
          <span className="text-xs opacity-80">({unrealizedPnlPercent}%)</span>
        </div>
      </div>
    </div>
  </div>
);

const IconSummaryCard = ({ icon, label, value }) => (
  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 flex items-center gap-4 hover:border-slate-700 transition-colors backdrop-blur-sm group">
    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-white group-hover:bg-slate-700 transition-colors">
      <div className="text-xl">{icon}</div>
    </div>
    <div>
      <div className="text-slate-400 text-xs font-medium mb-0.5">{label}</div>
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
  <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg border border-slate-800 w-fit mb-6">
    <button
      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
        activeTab === "positions"
          ? "bg-slate-800 text-white shadow-sm"
          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
      }`}
      onClick={() => setActiveTab("positions")}
    >
      <HiOutlineRectangleStack className="w-4 h-4" />
      Open Positions
    </button>
    <button
      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
        activeTab === "trades"
          ? "bg-slate-800 text-white shadow-sm"
          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
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
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm">
            {positionsLoading ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                Loading positions...
              </div>
            ) : positions.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-600">
                  <HiOutlineRectangleStack className="w-6 h-6" />
                </div>
                <div className="text-slate-400 text-sm">
                  No open positions found
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 font-medium">
                      <th className="px-6 py-4">Market</th>
                      <th className="px-6 py-4">Side</th>
                      <th className="px-6 py-4 text-right">Size</th>
                      <th className="px-6 py-4 text-right">Entry Price</th>
                      <th className="px-6 py-4 text-right">Margin</th>
                      <th className="px-6 py-4 text-right">Realized P&L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {positions.map((pos) => (
                      <tr
                        key={pos.marketId}
                        className="hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-6 py-4 font-medium text-white">
                          {pos.marketName}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                              pos.isLong
                                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/20"
                            }`}
                          >
                            {pos.isLong ? (
                              <HiArrowUp className="w-3 h-3" />
                            ) : (
                              <HiArrowDown className="w-3 h-3" />
                            )}
                            {pos.isLong ? "Long" : "Short"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-slate-300">
                          {Math.abs(parseFloat(pos.size)).toFixed(4)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-slate-300">
                          ${parseFloat(pos.entryPriceX18).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-slate-300">
                          ${parseFloat(pos.margin).toFixed(2)}
                        </td>
                        <td
                          className={`px-6 py-4 text-right font-mono font-bold ${
                            parseFloat(pos.realizedPnL) >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          ${parseFloat(pos.realizedPnL).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      case "trades":
        return (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm">
            {tradesLoading ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                Loading trade history...
              </div>
            ) : tradeHistory.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-600">
                  <HiOutlineArrowsRightLeft className="w-6 h-6" />
                </div>
                <div className="text-slate-400 text-sm">
                  No trade history available
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 font-medium">
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Market</th>
                      <th className="px-6 py-4">Side</th>
                      <th className="px-6 py-4 text-right">Size</th>
                      <th className="px-6 py-4 text-right">Price</th>
                      <th className="px-6 py-4 text-right">Notional</th>
                      <th className="px-6 py-4 text-right">Tx Hash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {tradeHistory.map((trade, index) => (
                      <tr
                        key={trade.id || index}
                        className="hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-6 py-4 text-slate-400 text-xs">
                          {new Date(trade.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 font-medium text-white">
                          {trade.market}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                              trade.side === "Long"
                                ? "bg-green-500/10 text-green-400 border border-green-500/20"
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
                        <td className="px-6 py-4 text-right font-mono text-slate-300">
                          {parseFloat(trade.size).toFixed(4)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-slate-300">
                          ${parseFloat(trade.price).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-slate-300">
                          ${parseFloat(trade.notional).toFixed(2)}
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
                    ))}
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

  // Calculate realized P&L percentage relative to total margin used
  const realizedPnlPercent =
    totalMarginUsed > 0 ? ((totalRealizedPnL / totalMarginUsed) * 100).toFixed(2) : "0.00";

  if (!isConnected) {
    return (
      <main className="min-h-screen bg-slate-950 pt-24 pb-12 px-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto border border-slate-800">
            <HiOutlineWallet className="w-8 h-8 text-slate-500" />
          </div>
          <h2 className="text-xl font-bold text-white">Connect Wallet</h2>
          <p className="text-slate-400 text-sm max-w-xs mx-auto">
            Please connect your wallet to view your portfolio, positions, and
            trade history.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 pt-24 pb-12 px-4 md:px-8 lg:px-12">
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
      </div>
    </main>
  );
};

export default PortfolioPage;
