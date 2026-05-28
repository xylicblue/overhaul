import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./creatclient";
import PageTransition from "./components/PageTransition";
import { TableSkeleton } from "./components/Skeleton";

// Leaderboard Header Component
const LeaderboardHeader = ({ totalTraders, topPnL }) => (
  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
    <div>
      <span className="text-zinc-400 text-sm font-medium">Global Rankings</span>
      <h1 className="text-3xl font-bold text-white mt-1 tracking-tight">
        LEADERBOARD
      </h1>
    </div>
    <div className="flex gap-4 w-full md:w-auto">
      <div className="flex-1 md:flex-none bg-[#0A0A0A]/50 border border-zinc-800 rounded-xl p-4 backdrop-blur-sm">
        <div className="text-zinc-400 text-xs font-medium mb-1">
          Total Traders
        </div>
        <span className="text-xl font-mono font-bold text-white">
          {totalTraders}
        </span>
      </div>
      <div className="flex-1 md:flex-none bg-[#0A0A0A]/50 border border-zinc-800 rounded-xl p-4 backdrop-blur-sm">
        <div className="text-zinc-400 text-xs font-medium mb-1">
          Top P&L
        </div>
        <span
          className={`text-xl font-mono font-bold ${
            topPnL >= 0 ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {topPnL >= 0 ? "+" : ""}${topPnL.toFixed(2)}
        </span>
      </div>
    </div>
  </div>
);

// Time Filter Tabs
const TimeFilterTabs = ({ activeFilter, setActiveFilter }) => {
  const filters = [
    { id: "all", label: "All Time" },
    { id: "30d", label: "30 Days" },
    { id: "7d", label: "7 Days" },
    { id: "24h", label: "24 Hours" },
  ];

  return (
    <div className="flex gap-2 mb-6">
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => setActiveFilter(filter.id)}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeFilter === filter.id
              ? "bg-white/10 text-white border border-zinc-600"
              : "bg-zinc-800/50 text-zinc-400 border border-transparent hover:text-white hover:bg-zinc-800"
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
};

// Rank Badge Component - Clean monochrome design
const RankBadge = ({ rank }) => {
  if (rank <= 3) {
    return (
      <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
        <span className="text-xs font-bold text-black">{rank}</span>
      </div>
    );
  }
  return (
    <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center">
      <span className="text-xs font-medium text-zinc-400">{rank}</span>
    </div>
  );
};

// Main Leaderboard Page Component
const LeaderboardPage = () => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        // Calculate the time filter
        let timeFilter = null;
        const now = new Date();

        if (activeFilter === "24h") {
          timeFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        } else if (activeFilter === "7d") {
          timeFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (activeFilter === "30d") {
          timeFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        // Fetch trade history with P&L data
        let query = supabase
          .from("trade_history")
          .select("user_address, pnl, funding_earned, fees_paid, created_at")
          .not("pnl", "is", null);

        if (timeFilter) {
          query = query.gte("created_at", timeFilter.toISOString());
        }

        const { data: trades, error } = await query;

        if (error) {
          console.error("Error fetching leaderboard:", error);
          setLeaderboardData([]);
          return;
        }

        // Aggregate P&L by user
        const userPnLMap = {};
        trades?.forEach((trade) => {
          const address = trade.user_address;
          const netPnL =
            parseFloat(trade.pnl || 0) +
            parseFloat(trade.funding_earned || 0) -
            parseFloat(trade.fees_paid || 0);

          if (!userPnLMap[address]) {
            userPnLMap[address] = {
              address,
              totalPnL: 0,
              tradeCount: 0,
            };
          }

          userPnLMap[address].totalPnL += netPnL;
          userPnLMap[address].tradeCount += 1;
        });

        // Convert to array and sort by P&L
        const sortedUsers = Object.values(userPnLMap)
          .sort((a, b) => b.totalPnL - a.totalPnL)
          .map((user, index) => ({
            ...user,
            rank: index + 1,
          }));

        setLeaderboardData(sortedUsers);
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
        setLeaderboardData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [activeFilter]);

  // Filter data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return leaderboardData;
    const query = searchQuery.toLowerCase();
    return leaderboardData.filter((user) =>
      user.address.toLowerCase().includes(query)
    );
  }, [leaderboardData, searchQuery]);

  const stats = useMemo(() => {
    return {
      totalTraders: leaderboardData.length,
      topPnL: leaderboardData[0]?.totalPnL || 0,
    };
  }, [leaderboardData]);

  return (
    <PageTransition className="min-h-screen bg-[#050505] pt-16 pb-12 px-4 md:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto">
        <LeaderboardHeader
          totalTraders={stats.totalTraders}
          topPnL={stats.topPnL}
        />

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <TimeFilterTabs
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
          />
          <div className="flex-1 sm:max-w-xs">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by wallet address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 pl-10 text-sm bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-[#0A0A0A]/50 border border-zinc-800 rounded-xl overflow-hidden backdrop-blur-sm">
          {loading ? (
            <div className="p-6">
              <TableSkeleton rows={10} />
            </div>
          ) : filteredData.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-zinc-800 mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl font-bold text-zinc-600">#</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {searchQuery ? "No Results Found" : "No Rankings Yet"}
              </h3>
              <p className="text-zinc-500 text-sm max-w-md mx-auto">
                {searchQuery
                  ? "No traders match your search query."
                  : "Be the first to close a trade and claim your spot on the leaderboard!"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider w-20">
                      Rank
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Trader
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider w-40">
                      Total P&L
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider w-28">
                      Trades
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filteredData.map((user, index) => {
                    const isProfitable = user.totalPnL >= 0;
                    return (
                      <tr
                        key={user.address}
                        className={`hover:bg-zinc-800/30 transition-all duration-300 ${
                          user.rank <= 3 ? "bg-zinc-800/20" : ""
                        }`}
                        style={{
                          animation: `fadeSlideIn 0.3s ease-out ${index * 0.03}s both`,
                        }}
                      >
                        <td className="px-6 py-4">
                          <RankBadge rank={user.rank} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-white text-xs font-bold">
                              {user.address.slice(2, 4).toUpperCase()}
                            </div>
                            <a
                              href={`https://sepolia.etherscan.io/address/${user.address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-sm text-white hover:text-zinc-300 transition-colors"
                            >
                              {user.address.slice(0, 6)}...
                              {user.address.slice(-4)}
                            </a>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`font-mono font-bold ${
                              isProfitable ? "text-emerald-400" : "text-red-400"
                            }`}
                          >
                            {isProfitable ? "+" : ""}$
                            {Math.abs(user.totalPnL).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-zinc-300">
                          {user.tradeCount}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default LeaderboardPage;
