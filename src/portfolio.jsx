import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./creatclient";
import { useAccount, useReadContract } from "wagmi";
import {
  calculatePendingFunding,
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
  getCanonicalPnlEvents,
  subscribeToCanonicalPnl,
  PNL_TYPES_SET,
  marketDisplayName,
} from "./services/canonicalPnl";
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
const fmt3 = (n) => Number(n).toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const mono  = (n, sign = false) => `${sign && n >= 0 ? "+" : ""}$${fmt(Math.abs(n))}`;
const mono3 = (n, sign = false) => `${sign && n >= 0 ? "+" : ""}$${fmt3(Math.abs(n))}`;

const TYPE_STYLES = {
  open:               "text-blue-400    bg-blue-500/10    border-blue-500/20",
  increase:           "text-blue-400    bg-blue-500/10    border-blue-500/20",
  reduce:             "text-warn  bg-warn/10  border-warn/20",
  close:              "text-down     bg-down/10     border-down/20",
  flip:               "text-purple-400  bg-purple-500/10  border-purple-500/20",
  liquidation:        "text-down     bg-down/10     border-down/20",
  funding_settlement: "text-up bg-up/10 border-up/20",
  margin_added:       "text-ink-muted    bg-surface-3       border-line",
  margin_removed:     "text-ink-muted    bg-surface-3       border-line",
};
const typeStyle = (t) => TYPE_STYLES[t] || "text-ink-muted bg-surface-3 border-line";

const SideBadge = ({ isLong }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
    isLong
      ? "bg-up/10 text-up"
      : "bg-down/10 text-down"
  }`}>
    {isLong ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
    {isLong ? "Long" : "Short"}
  </span>
);

const Th = ({ children, right }) => (
  <th className={`px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-ink-faint ${right ? "text-right" : ""}`}>
    {children}
  </th>
);

// ─────────────────────────────────────────────────────────────────────────────
// PositionRow — live unrealized P&L from on-chain reads
// ─────────────────────────────────────────────────────────────────────────────
const PositionRow = ({ pos }) => {
  const { price: markPrice } = useMarkPrice(pos.vammAddress);
  const { longPay, longReceive, shortPay, shortReceive } = useFundingRate(pos.vammAddress);

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

  const tradingPnL    = currentPrice > 0
    ? isLong ? (currentPrice - entryPrice) * absSize : (entryPrice - currentPrice) * absSize
    : 0;
  const fundingEarned = calculatePendingFunding(pos, { longPay, longReceive, shortPay, shortReceive });
  const feeBps        = marketConfig?.feeBps || 10;
  const openNotional  = entryPrice * absSize;
  const feesPaid      = (openNotional * feeBps) / 10000;
  const netPnL        = tradingPnL + fundingEarned - feesPaid;
  const roe           = margin > 0 ? (netPnL / margin) * 100 : 0;

  return (
    <tr className="hover:bg-surface-2/50 transition-colors group">
      <td className="px-4 py-3">
        <span className="text-xs font-bold text-ink">{pos.marketName?.replace("-PERP", "")}</span>
        <span className="text-[10px] text-ink-faint ml-1">PERP</span>
      </td>
      <td className="px-4 py-3"><SideBadge isLong={isLong} /></td>
      <td className="px-4 py-3 text-right num text-xs text-ink-muted">{absSize.toFixed(4)}</td>
      <td className="px-4 py-3 text-right num text-xs text-ink-muted">${entryPrice.toFixed(2)}</td>
      <td className="px-4 py-3 text-right num text-xs text-ink-muted">
        {currentPrice > 0 ? `$${currentPrice.toFixed(2)}` : "—"}
      </td>
      <td className="px-4 py-3 text-right num text-xs text-ink-muted">${margin.toFixed(2)}</td>
      <td className="px-4 py-3 text-right">
        <div className={`text-xs num font-bold ${netPnL >= 0 ? "text-up" : "text-down"}`}>
          {mono(netPnL, true)}
        </div>
        <div className={`text-[10px] num ${netPnL >= 0 ? "text-up/60" : "text-down/60"}`}>
          {netPnL >= 0 ? "+" : ""}{roe.toFixed(2)}% ROE
        </div>
      </td>
    </tr>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// StatBar
// ─────────────────────────────────────────────────────────────────────────────
const StatBar = ({ username, totalCollateral, realizedPnL, availableMargin, buyingPower, positionCount }) => {
  const stats = [
    { label: "Total Collateral", value: `$${fmt(totalCollateral)}`, icon: <ShieldCheck size={12} />, sub: null },
    { label: "Available Margin", value: `$${fmt(availableMargin)}`, icon: <Banknote size={12} />,    sub: null },
    { label: "Order Collateral", value: `$${fmt(buyingPower)}`,     icon: <Zap size={12} />,         sub: "Max size uses IMR + fees" },
    {
      label: "Realized P&L",
      value: mono(realizedPnL, true),
      icon: realizedPnL >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />,
      valueClass: realizedPnL >= 0 ? "text-up" : "text-down",
      sub: null,
    },
    { label: "Open Positions", value: positionCount, icon: <Activity size={12} />, sub: null },
  ];

  return (
    <div className="mb-8">
      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-ink-faint mb-1">Portfolio</p>
        <h1 className="text-2xl font-bold text-ink tracking-tight">
          {username ? username.toUpperCase() : "TRADER"}
        </h1>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {stats.map(({ label, value, icon, sub, valueClass }) => (
          <div key={label} className="bg-surface-1 border border-line-subtle rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-ink-faint mb-2.5">
              {icon}
              <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
            </div>
            <div className={`stat-hero text-[18px] ${valueClass || "text-ink"}`}>{value}</div>
            {sub && <div className="text-[9px] text-ink-ghost mt-1">{sub}</div>}
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
  <div className="flex gap-0 bg-surface-1 border border-line-subtle rounded-lg p-1 w-fit mb-4">
    {[
      { id: "positions", icon: <LayoutList size={12} />,     label: "Open Positions" },
      { id: "trades",    icon: <ArrowLeftRight size={12} />, label: "Trade History"  },
    ].map(({ id, icon, label }) => (
      <button
        key={id}
        onClick={() => setActive(id)}
        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md text-[11px] font-bold transition-all ${
          active === id ? "bg-surface-3 text-ink" : "text-ink-faint hover:text-ink-muted"
        }`}
      >
        {icon}{label}
      </button>
    ))}
  </div>
);

const TableWrap = ({ children }) => (
  <div className="bg-surface-1 border border-line-subtle rounded-xl overflow-hidden">{children}</div>
);

const TableHead = ({ children }) => (
  <thead>
    <tr className="border-b border-line bg-surface-2/40">{children}</tr>
  </thead>
);

// ─────────────────────────────────────────────────────────────────────────────
// PortfolioPage
// ─────────────────────────────────────────────────────────────────────────────
const PortfolioPage = () => {
  const [session, setSession]                 = useState(null);
  const [profile, setProfile]                 = useState(null);
  const [activeTab, setActiveTab]             = useState("positions");
  const [canonicalEvents, setCanonicalEvents] = useState([]);
  const [eventsLoading, setEventsLoading]     = useState(false);
  const [timeFilter, setTimeFilter]           = useState("all");
  const [pendingCloses, setPendingCloses]     = useState([]);

  const { address, isConnected }             = useAccount();
  const { positions, isLoading: posLoading } = useAllPositions();
  const { accountValue }                     = useAccountValue();
  const { totalCollateralValue }             = useVaultBalance();

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

  // Fetch canonical events once wallet connects
  useEffect(() => {
    if (!address) return;
    setEventsLoading(true);
    getCanonicalPnlEvents(address)
      .then(data => { setCanonicalEvents(data); setEventsLoading(false); })
      .catch(() => setEventsLoading(false));
  }, [address]);

  // Read pending closes from localStorage, drop any older than 10 minutes.
  // Also re-reads whenever PositionPanel fires the custom event after a close confirms.
  useEffect(() => {
    if (!address) return;

    const readPending = () => {
      try {
        const MAX_AGE = 10 * 60 * 1000;
        const stored  = JSON.parse(localStorage.getItem("bs_pending_closes") || "[]");
        const fresh   = stored.filter(p => p.tx_hash && Date.now() - p.timestamp < MAX_AGE);
        if (fresh.length !== stored.length) {
          localStorage.setItem("bs_pending_closes", JSON.stringify(fresh));
        }
        setPendingCloses(fresh);
      } catch {
        setPendingCloses([]);
      }
    };

    readPending();
    window.addEventListener("bs_pending_closes_updated", readPending);
    return () => window.removeEventListener("bs_pending_closes_updated", readPending);
  }, [address]);

  // Realtime: prepend new canonical rows and clear matching pending close
  useEffect(() => {
    if (!address) return;
    const unsub = subscribeToCanonicalPnl(address, (newRow) => {
      setCanonicalEvents(prev => [newRow, ...prev]);
      setPendingCloses(prev => {
        const next = prev.filter(p => p.tx_hash !== newRow.tx_hash);
        try {
          const stored = JSON.parse(localStorage.getItem("bs_pending_closes") || "[]");
          localStorage.setItem("bs_pending_closes",
            JSON.stringify(stored.filter(p => p.tx_hash !== newRow.tx_hash))
          );
        } catch {}
        return next;
      });
    });
    return unsub;
  }, [address]);

  const availableMargin = parseFloat(accountValue) || 0;
  const totalCollateral = parseFloat(totalCollateralValue) || 0;
  const buyingPower     = availableMargin;

  // Realized P&L = sum of net_pnl for PnL-impacting rows only
  const realizedPnL = useMemo(() =>
    canonicalEvents
      .filter(row => PNL_TYPES_SET.has(row.accounting_type))
      .reduce((sum, row) => sum + Number(row.net_pnl || 0), 0),
    [canonicalEvents]
  );

  const filteredEvents = useMemo(() => {
    if (timeFilter === "all") return canonicalEvents;
    const ms = { "24h": 864e5, "7d": 6048e5, "30d": 2592e6 }[timeFilter];
    return canonicalEvents.filter(row =>
      ms ? Date.now() - new Date(row.block_timestamp) <= ms : true
    );
  }, [canonicalEvents, timeFilter]);

  // Only show pending closes that don't already have a canonical row
  const visiblePending = useMemo(() => {
    const canonicalHashes = new Set(canonicalEvents.map(e => e.tx_hash));
    return pendingCloses.filter(p => !canonicalHashes.has(p.tx_hash));
  }, [pendingCloses, canonicalEvents]);

  if (!isConnected) {
    return (
      <PageTransition className="min-h-screen bg-surface-0 pt-24 pb-12 px-4 flex items-center justify-center">
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
    <PageTransition className="min-h-screen bg-surface-0 pt-16 pb-12 px-4 md:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto">

        <StatBar
          username={profile?.username}
          totalCollateral={totalCollateral}
          realizedPnL={realizedPnL}
          availableMargin={availableMargin}
          buyingPower={buyingPower}
          positionCount={positions?.length ?? 0}
        />

        {canonicalEvents.length > 0 && (
          <div className="mb-6">
            <PnLChart canonicalEvents={canonicalEvents} />
          </div>
        )}

        <Tabs active={activeTab} setActive={setActiveTab} />

        {/* ── Open Positions ──────────────────────────────────────────── */}
        {activeTab === "positions" && (
          <TableWrap>
            {posLoading ? (
              <div className="py-16 flex flex-col items-center gap-2 text-ink-faint">
                <div className="w-4 h-4 border-2 border-line border-t-blue-500 rounded-full animate-spin" />
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
                  <tbody className="divide-y divide-line-subtle">
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
            {eventsLoading ? (
              <div className="py-16 flex flex-col items-center gap-2 text-ink-faint">
                <div className="w-4 h-4 border-2 border-line border-t-blue-500 rounded-full animate-spin" />
                <span className="text-xs">Loading history…</span>
              </div>
            ) : !canonicalEvents.length && !visiblePending.length ? (
              <EmptyState type="trades" title="No Trade History" description="Your trade history will appear here after your first trade." actionLabel="Start Trading" actionHref="/trade" tips={[]} />
            ) : (
              <>
                <div className="flex items-center gap-1.5 px-4 py-3 border-b border-line-subtle">
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
                          ? "bg-surface-3 border-line text-ink"
                          : "bg-transparent border-line-subtle text-ink-faint hover:text-ink-muted hover:border-line"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  <span className="ml-auto text-[10px] text-ink-ghost num">{filteredEvents.length} events</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <TableHead>
                      <Th>Date</Th>
                      <Th>Market</Th>
                      <Th>Type</Th>
                      <Th>Side</Th>
                      <Th right>Size</Th>
                      <Th right>Price</Th>
                      <Th right>Realized P&L</Th>
                      <Th right>Funding</Th>
                      <Th right>Fee</Th>
                      <Th right>Net P&L</Th>
                      <Th right>Tx</Th>
                    </TableHead>
                    <tbody className="divide-y divide-line-subtle">
                      {/* Pending indexer rows — show immediately after close confirms */}
                      {visiblePending.map(pending => (
                        <tr key={`pending-${pending.tx_hash}`} className="hover:bg-surface-2/50 transition-colors">
                          <td className="px-4 py-3 text-[10px] num text-ink-faint whitespace-nowrap">Just now</td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-bold text-ink">{pending.market_name?.replace(/-PERP.*/, "") || "—"}</span>
                            {pending.market_name?.includes("PERP") && <span className="text-[10px] text-ink-faint ml-1">PERP</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded text-blue-400 bg-blue-500/10">
                              <span className="w-2 h-2 rounded-full border border-blue-400 border-t-transparent animate-spin inline-block" />
                              indexing
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {pending.side ? <SideBadge isLong={pending.side === "Long"} /> : <span className="text-ink-ghost text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right num text-xs text-ink-muted">
                            {pending.size != null ? Number(pending.size).toFixed(4) : "—"}
                          </td>
                          <td className="px-4 py-3 text-right num text-xs text-ink-muted">
                            {pending.price != null ? `$${Number(pending.price).toFixed(2)}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-right num text-xs text-ink-ghost">—</td>
                          <td className="px-4 py-3 text-right num text-xs text-ink-ghost">·</td>
                          <td className="px-4 py-3 text-right num text-xs text-ink-ghost">·</td>
                          <td className="px-4 py-3 text-right num text-xs text-ink-faint italic text-[10px]">Indexing…</td>
                          <td className="px-4 py-3 text-right">
                            {pending.tx_hash ? (
                              <a href={`https://sepolia.etherscan.io/tx/${pending.tx_hash}`} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] num text-blue-400 hover:text-blue-300 transition-colors">
                                {pending.tx_hash.slice(0, 6)}…{pending.tx_hash.slice(-4)}
                                <ExternalLink size={9} />
                              </a>
                            ) : "·"}
                          </td>
                        </tr>
                      ))}
                      {filteredEvents.map((row, i) => {
                        const isPnlRow = PNL_TYPES_SET.has(row.accounting_type);
                        const netPnl   = Number(row.net_pnl        || 0);
                        const realPnl  = Number(row.realized_pnl   || 0);
                        const funding  = Number(row.funding_payment || 0);
                        const fee      = Number(row.fee             || 0);
                        const size     = row.closed_size ?? row.size_delta;
                        const price    = row.execution_price ?? row.exit_price;
                        const name     = marketDisplayName(row);

                        return (
                          <tr key={row.id || i} className="hover:bg-surface-2/50 transition-colors">
                            <td className="px-4 py-3 text-[10px] num text-ink-faint whitespace-nowrap">
                              {new Date(row.block_timestamp).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-bold text-ink">{name.replace(/-PERP.*/, "")}</span>
                              {name.includes("PERP") && <span className="text-[10px] text-ink-faint ml-1">PERP</span>}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${typeStyle(row.accounting_type)}`}>
                                {row.accounting_type?.replace(/_/g, " ")}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {row.side
                                ? <SideBadge isLong={row.side === "Long"} />
                                : <span className="text-ink-ghost text-xs">—</span>}
                            </td>
                            <td className="px-4 py-3 text-right num text-xs text-ink-muted">
                              {size != null ? Number(size).toFixed(4) : "—"}
                            </td>
                            <td className="px-4 py-3 text-right num text-xs text-ink-muted">
                              {price != null ? `$${Number(price).toFixed(2)}` : "—"}
                            </td>
                            <td className={`px-4 py-3 text-right num text-xs font-bold ${
                              !isPnlRow ? "text-ink-ghost" : realPnl >= 0 ? "text-up" : "text-down"
                            }`}>
                              {isPnlRow ? mono3(realPnl, true) : "—"}
                            </td>
                            <td className={`px-4 py-3 text-right num text-xs ${
                              funding === 0 ? "text-ink-ghost" : funding > 0 ? "text-up" : "text-down"
                            }`}>
                              {funding !== 0 ? mono3(funding, true) : "·"}
                            </td>
                            <td className={`px-4 py-3 text-right num text-xs ${fee > 0 ? "text-down" : "text-ink-ghost"}`}>
                              {fee > 0 ? `-$${fmt3(fee)}` : "·"}
                            </td>
                            <td className={`px-4 py-3 text-right num text-xs font-bold ${
                              netPnl === 0 ? "text-ink-faint" : netPnl > 0 ? "text-up" : "text-down"
                            }`}>
                              {mono3(netPnl, true)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {row.tx_hash ? (
                                <a
                                  href={`https://sepolia.etherscan.io/tx/${row.tx_hash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] num text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                  {row.tx_hash.slice(0, 6)}…{row.tx_hash.slice(-4)}
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
