import React, { useState, useEffect } from "react";
import { supabase } from "./creatclient";
import { useAccount, useReadContract } from "wagmi";
import {
  useAllPositions,
  useAccountValue,
  useVaultBalance,
} from "./hooks/useClearingHouse";
import { useMarkPrice, useFundingRate } from "./hooks/useVAMM";
import { SEPOLIA_CONTRACTS } from "./contracts/addresses";
import MarketRegistryABI from "./contracts/abis/MarketRegistry.json";
import PageTransition from "./components/PageTransition";
import EmptyState from "./components/EmptyState";
import PnLChart from "./components/PnLChart";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Zap,
  Banknote,
  LayoutList,
  ArrowLeftRight,
  ExternalLink,
  Activity,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const fmt  = (n, d = 2) => Number(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
const mono = (n, sign = false) => `${sign && n >= 0 ? "+" : ""}$${fmt(Math.abs(n))}`;

const SideBadge = ({ isLong }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
    isLong
      ? "bg-emerald-500/8 text-emerald-400 border-emerald-500/20"
      : "bg-red-500/8 text-red-400 border-red-500/20"
  }`}>
    {isLong ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
    {isLong ? "Long" : "Short"}
  </span>
);

const Th = ({ children, right }) => (
  <th className={`px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-zinc-600 ${right ? "text-right" : ""}`}>
    {children}
  </th>
);

// ─────────────────────────────────────────────────────────────────────────────
// PositionRow
// ─────────────────────────────────────────────────────────────────────────────
const PositionRow = ({ pos }) => {
  const { price: markPrice }                       = useMarkPrice(pos.vammAddress);
  const { cumulativeFunding: currentFundingIndex } = useFundingRate(pos.vammAddress);

  const { data: marketConfig } = useReadContract({
    address: SEPOLIA_CONTRACTS.marketRegistry,
    abi: MarketRegistryABI.abi,
    functionName: "getMarket",
    args: [pos.marketId],
    chainId: 11155111,
  });

  const entryPrice   = parseFloat(pos.entryPriceX18);
  const absSize      = Math.abs(parseFloat(pos.size));
  const currentPrice = markPrice ? parseFloat(markPrice) : 0;
  const isLong       = pos.isLong;
  const margin       = parseFloat(pos.margin);

  const tradingPnL = currentPrice > 0
    ? isLong ? (currentPrice - entryPrice) * absSize : (entryPrice - currentPrice) * absSize
    : 0;

  const currentIndex   = parseFloat(currentFundingIndex || 0);
  const lastIndex      = parseFloat(pos.lastFundingIndex || 0);
  const fundingEarned  = -((currentIndex - lastIndex) * parseFloat(pos.size));

  const feeBps       = marketConfig?.feeBps || 10;
  const openNotional = entryPrice * absSize;
  const feesPaid     = (openNotional * feeBps) / 10000;
  const netPnL       = tradingPnL + fundingEarned - feesPaid;
  const roe          = margin > 0 ? (netPnL / margin) * 100 : 0;

  return (
    <tr className="hover:bg-zinc-800/20 transition-colors group">
      <td className="px-4 py-3">
        <span className="text-xs font-bold text-white">{pos.marketName?.replace("-PERP", "")}</span>
        <span className="text-[10px] text-zinc-600 ml-1">PERP</span>
      </td>
      <td className="px-4 py-3"><SideBadge isLong={isLong} /></td>
      <td className="px-4 py-3 text-right font-mono text-xs text-zinc-300">{absSize.toFixed(4)}</td>
      <td className="px-4 py-3 text-right font-mono text-xs text-zinc-300">${entryPrice.toFixed(2)}</td>
      <td className="px-4 py-3 text-right font-mono text-xs text-zinc-300">
        {currentPrice > 0 ? `$${currentPrice.toFixed(2)}` : "—"}
      </td>
      <td className="px-4 py-3 text-right font-mono text-xs text-zinc-400">${margin.toFixed(2)}</td>
      <td className="px-4 py-3 text-right">
        <div className={`text-xs font-mono font-bold ${netPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {mono(netPnL, true)}
        </div>
        <div className={`text-[10px] font-mono ${netPnL >= 0 ? "text-emerald-500/50" : "text-red-500/50"}`}>
          {netPnL >= 0 ? "+" : ""}{roe.toFixed(2)}% ROE
        </div>
      </td>
    </tr>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// StatBar — top header strip
// ─────────────────────────────────────────────────────────────────────────────
const StatBar = ({ username, totalCollateral, realizedPnL, availableMargin, buyingPower, positionCount }) => {
  const stats = [
    { label: "Total Collateral",  value: `$${fmt(totalCollateral)}`,  icon: <ShieldCheck size={12} />,  sub: null },
    { label: "Available Margin",  value: `$${fmt(availableMargin)}`,  icon: <Banknote size={12} />,     sub: null },
    { label: "Buying Power",      value: `$${fmt(buyingPower)}`,      icon: <Zap size={12} />,          sub: "10× leverage" },
    {
      label: "Realized P&L",
      value: mono(realizedPnL, true),
      icon: realizedPnL >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />,
      valueClass: realizedPnL >= 0 ? "text-emerald-400" : "text-red-400",
      sub: null,
    },
    { label: "Open Positions",    value: positionCount,               icon: <Activity size={12} />,     sub: null },
  ];

  return (
    <div className="mb-8">
      {/* Greeting */}
      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1">Portfolio</p>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          {username ? username.toUpperCase() : "TRADER"}
        </h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {stats.map(({ label, value, icon, sub, valueClass }) => (
          <div
            key={label}
            className="relative bg-[#0a0a10] border border-zinc-800/80 rounded-xl p-4 overflow-hidden"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent" />
            <div className="flex items-center gap-1.5 text-zinc-600 mb-2">
              {icon}
              <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
            </div>
            <div className={`text-base font-mono font-bold ${valueClass || "text-white"}`}>{value}</div>
            {sub && <div className="text-[9px] text-zinc-700 mt-0.5">{sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Tabs
// ─────────────────────────────────────────────────────────────────────────────
const Tabs = ({ active, setActive }) => (
  <div className="flex gap-0 bg-[#0a0a10] border border-zinc-800/80 rounded-lg p-1 w-fit mb-4">
    {[
      { id: "positions", icon: <LayoutList size={12} />,     label: "Open Positions"  },
      { id: "trades",    icon: <ArrowLeftRight size={12} />, label: "Trade History"   },
    ].map(({ id, icon, label }) => (
      <button
        key={id}
        onClick={() => setActive(id)}
        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md text-[11px] font-bold transition-all ${
          active === id
            ? "bg-zinc-800 text-white"
            : "text-zinc-500 hover:text-zinc-300"
        }`}
      >
        {icon}{label}
      </button>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// TableWrap
// ─────────────────────────────────────────────────────────────────────────────
const TableWrap = ({ children }) => (
  <div className="bg-[#0a0a10] border border-zinc-800/80 rounded-xl overflow-hidden">
    {children}
  </div>
);

const TableHead = ({ children }) => (
  <thead>
    <tr className="border-b border-zinc-800/80 bg-zinc-900/30">
      {children}
    </tr>
  </thead>
);

// ─────────────────────────────────────────────────────────────────────────────
// PortfolioPage
// ─────────────────────────────────────────────────────────────────────────────
const PortfolioPage = () => {
  const [session, setSession]               = useState(null);
  const [profile, setProfile]               = useState(null);
  const [activeTab, setActiveTab]           = useState("positions");
  const [tradeHistory, setTradeHistory]     = useState([]);
  const [tradesLoading, setTradesLoading]   = useState(false);
  const [timeFilter, setTimeFilter]         = useState("all");

  const { address, isConnected }            = useAccount();
  const { positions, isLoading: posLoading }= useAllPositions();
  const { accountValue }                    = useAccountValue();
  const { totalCollateralValue }            = useVaultBalance();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      supabase.from("profiles").select("username").eq("id", session.user.id).single()
        .then(({ data }) => { if (data) setProfile(data); });
    }
  }, [session]);

  useEffect(() => {
    if (!address) return;
    setTradesLoading(true);
    supabase.from("trade_history").select("*")
      .eq("user_address", address.toLowerCase())
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => { setTradeHistory(data || []); setTradesLoading(false); })
      .catch(() => setTradesLoading(false));
  }, [address]);

  const availableMargin  = parseFloat(accountValue) || 0;
  const totalCollateral  = parseFloat(totalCollateralValue) || 0;
  const buyingPower      = availableMargin * 10;
  const realizedPnL      = (positions || []).reduce((s, p) => s + parseFloat(p.realizedPnL || 0), 0);

  const filteredTrades = tradeHistory.filter((t) => {
    if (timeFilter === "all") return true;
    const ms = { "24h": 864e5, "7d": 6048e5, "30d": 2592e6 }[timeFilter];
    return ms ? Date.now() - new Date(t.created_at) <= ms : true;
  });

  if (!isConnected) {
    return (
      <PageTransition className="min-h-screen bg-[#06060a] pt-24 pb-12 px-4 flex items-center justify-center">
        <EmptyState
          type="wallet"
          title="Connect Your Wallet"
          description="Connect your wallet to view your portfolio and trade history."
          secondaryActionLabel="Learn More"
          secondaryActionHref="/guide"
        />
      </PageTransition>
    );
  }

  return (
    <PageTransition className="min-h-screen bg-[#06060a] pt-16 pb-12 px-4 md:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto">

        <StatBar
          username={profile?.username}
          totalCollateral={totalCollateral}
          realizedPnL={realizedPnL}
          availableMargin={availableMargin}
          buyingPower={buyingPower}
          positionCount={positions?.length ?? 0}
        />

        {/* PnL Chart */}
        {tradeHistory.length > 0 && (
          <div className="mb-6">
            <PnLChart tradeHistory={tradeHistory} />
          </div>
        )}

        <Tabs active={activeTab} setActive={setActiveTab} />

        {/* ── Open Positions ──────────────────────────────────────────── */}
        {activeTab === "positions" && (
          <TableWrap>
            {posLoading ? (
              <div className="py-16 flex flex-col items-center gap-2 text-zinc-600">
                <div className="w-4 h-4 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-xs">Loading positions…</span>
              </div>
            ) : !positions?.length ? (
              <EmptyState type="positions" title="No Open Positions" description="Open a position on the Trade page to see it here." actionLabel="Go to Trade" actionHref="/trade" tips={[]} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <TableHead>
                    <Th>Market</Th>
                    <Th>Side</Th>
                    <Th right>Size</Th>
                    <Th right>Entry</Th>
                    <Th right>Mark</Th>
                    <Th right>Margin</Th>
                    <Th right>Unrealized P&L</Th>
                  </TableHead>
                  <tbody className="divide-y divide-zinc-800/40">
                    {positions.map((pos) => <PositionRow key={pos.marketId} pos={pos} />)}
                  </tbody>
                </table>
              </div>
            )}
          </TableWrap>
        )}

        {/* ── Trade History ────────────────────────────────────────────── */}
        {activeTab === "trades" && (
          <TableWrap>
            {tradesLoading ? (
              <div className="py-16 flex flex-col items-center gap-2 text-zinc-600">
                <div className="w-4 h-4 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-xs">Loading history…</span>
              </div>
            ) : !tradeHistory.length ? (
              <EmptyState type="trades" title="No Trade History" description="Your trade history will appear here after your first trade." actionLabel="Start Trading" actionHref="/trade" tips={[]} />
            ) : (
              <>
                {/* Time filters */}
                <div className="flex items-center gap-1.5 px-4 py-3 border-b border-zinc-800/60">
                  {[
                    { id: "all", label: "All" },
                    { id: "30d", label: "30d" },
                    { id: "7d",  label: "7d"  },
                    { id: "24h", label: "24h" },
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setTimeFilter(id)}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded border transition-all ${
                        timeFilter === id
                          ? "bg-zinc-800 border-zinc-700 text-white"
                          : "bg-transparent border-zinc-800/60 text-zinc-600 hover:text-zinc-300 hover:border-zinc-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  <span className="ml-auto text-[10px] text-zinc-700 font-mono">{filteredTrades.length} trades</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <TableHead>
                      <Th>Date</Th>
                      <Th>Market</Th>
                      <Th>Side</Th>
                      <Th right>Size</Th>
                      <Th right>Price</Th>
                      <Th right>P&L</Th>
                      <Th right>Funding</Th>
                      <Th right>Fees</Th>
                      <Th right>Tx</Th>
                    </TableHead>
                    <tbody className="divide-y divide-zinc-800/40">
                      {filteredTrades.map((trade, i) => {
                        const pnl     = trade.pnl     != null ? parseFloat(trade.pnl)             : null;
                        const funding = trade.funding_earned != null ? parseFloat(trade.funding_earned) : null;
                        const fees    = trade.fees_paid     != null ? parseFloat(trade.fees_paid)       : null;

                        return (
                          <tr key={trade.id || i} className="hover:bg-zinc-800/20 transition-colors">
                            <td className="px-4 py-3 text-[10px] font-mono text-zinc-600 whitespace-nowrap">
                              {new Date(trade.created_at).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-bold text-white">{trade.market?.replace("-PERP", "")}</span>
                              <span className="text-[10px] text-zinc-600 ml-1">PERP</span>
                            </td>
                            <td className="px-4 py-3">
                              <SideBadge isLong={trade.side === "Long"} />
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-xs text-zinc-300">
                              {parseFloat(trade.size).toFixed(4)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-xs text-zinc-300">
                              ${parseFloat(trade.price).toFixed(2)}
                            </td>
                            <td className={`px-4 py-3 text-right font-mono text-xs font-bold ${
                              pnl == null ? "" : pnl >= 0 ? "text-emerald-400" : "text-red-400"
                            }`}>
                              {pnl != null ? mono(pnl, true) : (
                                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-zinc-800 text-zinc-500 rounded">OPEN</span>
                              )}
                            </td>
                            <td className={`px-4 py-3 text-right font-mono text-xs ${
                              funding == null ? "text-zinc-700" : funding >= 0 ? "text-emerald-400" : "text-red-400"
                            }`}>
                              {funding != null ? mono(funding, true) : "·"}
                            </td>
                            <td className={`px-4 py-3 text-right font-mono text-xs ${fees != null ? "text-red-400" : "text-zinc-700"}`}>
                              {fees != null ? `-$${fmt(fees)}` : "·"}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {trade.tx_hash ? (
                                <a
                                  href={`https://sepolia.etherscan.io/tx/${trade.tx_hash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] font-mono text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                  {trade.tx_hash.slice(0, 6)}…{trade.tx_hash.slice(-4)}
                                  <ExternalLink size={9} />
                                </a>
                              ) : "·"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </TableWrap>
        )}
      </div>
    </PageTransition>
  );
};

export default PortfolioPage;
