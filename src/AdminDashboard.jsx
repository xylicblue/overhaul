import React, { useCallback, useEffect, useMemo, useState } from "react";
import { usePublicClient } from "wagmi";
import { formatUnits } from "ethers";
import { supabase } from "./creatclient";
import { MARKETS, SEPOLIA_CONTRACTS } from "./contracts/addresses";
import ClearingHouseABI from "./contracts/abis/ClearingHouse.json";
import ReactApexChart from "react-apexcharts";
import {
  RefreshCw, TrendingUp, TrendingDown, ExternalLink, Lock,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────────────────────
const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const usd = (v, d = 2) => `$${n(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`;
const compactUsd = (v) => {
  const num = n(v);
  return `${num < 0 ? "-" : ""}$${new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(Math.abs(num))}`;
};
const signedUsd = (v) => `${n(v) >= 0 ? "+" : ""}${usd(v)}`;
const intFmt = (v) => n(v).toLocaleString("en-US");
const shortAddr = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—");
const fmtTime = (ts) => (ts ? new Date(ts).toLocaleString() : "—");
const txUrl = (h) => `https://sepolia.etherscan.io/tx/${h}`;

const TYPE_STYLE = {
  open:               "text-blue-400   bg-blue-500/10",
  increase:           "text-blue-400   bg-blue-500/10",
  reduce:             "text-warn       bg-warn/10",
  close:              "text-down       bg-down/10",
  flip:               "text-purple-400 bg-purple-500/10",
  liquidation:        "text-down       bg-down/10",
  funding_settlement: "text-up         bg-up/10",
  margin_added:       "text-ink-muted  bg-surface-3",
  margin_removed:     "text-ink-muted  bg-surface-3",
};
const typeStyle = (t) => TYPE_STYLE[t] || "text-ink-muted bg-surface-3";
const cleanMarket = (m) => (m || "—").replace("-PERP", "");

// Unique tradable markets (exclude aliases) — used to scan on-chain positions.
const POSITION_MARKETS = (() => {
  const seen = new Set();
  return Object.values(MARKETS).filter((m) => {
    if (m.isAlias || !m.id || seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
})();

// Read every known trader's open positions straight from the ClearingHouse
// contract — the same getPosition(account, marketId) the app uses — batched via
// multicall. There is no positions DB table in use; positions live on-chain.
async function readOpenPositions(publicClient, tradersList, activeMarketIds) {
  if (!publicClient || !tradersList?.length) return [];
  const addrs = [...new Set(tradersList.map((t) => (t.user_address || "").toLowerCase()).filter(Boolean))];
  if (!addrs.length) return [];
  const nameByAddr = Object.fromEntries(tradersList.map((t) => [(t.user_address || "").toLowerCase(), t.username]));

  const markets = (activeMarketIds && activeMarketIds.size)
    ? POSITION_MARKETS.filter((mk) => activeMarketIds.has(String(mk.id).toLowerCase()))
    : POSITION_MARKETS;
  if (!markets.length) return [];

  const contracts = [];
  const meta = [];
  for (const addr of addrs) {
    for (const mk of markets) {
      contracts.push({
        address: SEPOLIA_CONTRACTS.clearingHouse,
        abi: ClearingHouseABI.abi,
        functionName: "getPosition",
        args: [addr, mk.id],
      });
      meta.push({ addr, market: mk });
    }
  }

  const results = await publicClient.multicall({ contracts, allowFailure: true, batchSize: 4096 });
  const rows = [];
  results.forEach((r, i) => {
    if (r.status !== "success" || !r.result) return;
    const p = r.result;
    const sizeRaw = p.size ?? p[0] ?? 0n;
    if (!sizeRaw || sizeRaw === 0n) return;
    const marginRaw = p.margin ?? p[1] ?? 0n;
    const entryRaw = p.entryPriceX18 ?? p[2] ?? 0n;
    const { addr, market } = meta[i];
    const size = Math.abs(Number(formatUnits(sizeRaw, 18)));
    const entryPrice = Number(formatUnits(entryRaw, 18));
    const margin = Number(formatUnits(marginRaw, 18));
    rows.push({
      trader: addr,
      username: nameByAddr[addr],
      marketName: market.displayName || market.name,
      isLong: sizeRaw > 0n,
      size,
      entryPrice,
      margin,
      notional: size * entryPrice,
    });
  });
  rows.sort((a, b) => b.notional - a.notional);
  return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// Small building blocks
// ─────────────────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, accent }) => (
  <div className="bg-surface-1 border border-line-subtle rounded-xl p-4">
    <div className="text-[10px] font-bold uppercase tracking-widest text-ink-faint mb-2">{label}</div>
    <div className={`stat-hero text-[20px] ${accent || "text-ink"}`}>{value}</div>
    {sub && <div className="text-[10px] text-ink-ghost mt-1">{sub}</div>}
  </div>
);

const Section = ({ title, right, children }) => (
  <div className="bg-surface-1 border border-line-subtle rounded-xl overflow-hidden mb-6">
    <div className="px-4 py-3 border-b border-line-subtle flex items-center justify-between">
      <div className="text-[11px] font-bold uppercase tracking-widest text-ink-faint">
        {title}
      </div>
      {right}
    </div>
    {children}
  </div>
);

const Th = ({ children, right }) => (
  <th className={`px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest text-ink-faint whitespace-nowrap ${right ? "text-right" : ""}`}>
    {children}
  </th>
);

const EmptyRow = ({ colSpan, label }) => (
  <tr><td colSpan={colSpan} className="px-4 py-10 text-center text-[12px] text-ink-faint">{label}</td></tr>
);

const Page = ({ children }) => (
  <div className="min-h-screen bg-surface-0 pt-16 pb-12 px-4 md:px-8 lg:px-12">
    <div className="max-w-7xl mx-auto">{children}</div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// AdminDashboard
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  // status: loading | unauth | forbidden | error | ready
  const [status, setStatus]       = useState("loading");
  const [errorMsg, setErrorMsg]   = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [kpis, setKpis]           = useState(null);
  const [markets, setMarkets]     = useState([]);
  const [series, setSeries]       = useState([]);
  const [traders, setTraders]     = useState([]);
  const [events, setEvents]       = useState([]);
  const [onchainPositions, setOnchainPositions] = useState([]);
  const [posError, setPosError]   = useState("");
  const publicClient = usePublicClient({ chainId: 11155111 });

  const fetchData = useCallback(async () => {
    const [k, m, s, t, e] = await Promise.all([
      supabase.rpc("admin_platform_kpis"),
      supabase.rpc("admin_market_breakdown"),
      supabase.rpc("admin_pnl_timeseries", { p_days: 30 }),
      supabase.rpc("admin_top_traders", { p_limit: 200 }),
      supabase.rpc("admin_recent_events", { p_limit: 50 }),
    ]);
    const firstErr = [k, m, s, t, e].find((r) => r.error)?.error;
    if (firstErr) throw firstErr;
    setKpis(k.data || null);
    setMarkets(m.data || []);
    setSeries(s.data || []);
    setTraders(t.data || []);
    setEvents(e.data || []);

    // Open positions are read live from the ClearingHouse contract for every
    // known trader (no positions table is maintained — they live on-chain),
    // restricted to markets that have on-chain activity.
    try {
      const activeMarketIds = new Set((m.data || []).map((row) => String(row.market_id).toLowerCase()));
      const rows = await readOpenPositions(publicClient, t.data || [], activeMarketIds);
      setOnchainPositions(rows);
      setPosError("");
    } catch (err) {
      setOnchainPositions([]);
      setPosError(err?.shortMessage || err?.message || "Could not read on-chain positions.");
    }
  }, [publicClient]);

  const load = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setStatus("unauth"); return; }

      const { data: profile, error: profErr } = await supabase
        .from("profiles").select("is_admin").eq("id", session.user.id).single();
      if (profErr) throw profErr;
      if (!profile?.is_admin) { setStatus("forbidden"); return; }

      await fetchData();
      setStatus("ready");
    } catch (err) {
      setErrorMsg(err?.message || "Failed to load dashboard.");
      setStatus("error");
    }
  }, [fetchData]);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    try { await fetchData(); } catch (err) { setErrorMsg(err?.message || "Refresh failed."); }
    finally { setRefreshing(false); }
  };

  // ── Chart series: daily volume (bars) + cumulative net PnL (line) ──────────
  const chart = useMemo(() => {
    if (!series.length) return null;
    let cum = 0;
    const cumPnl = series.map((r) => { cum += n(r.net_pnl); return Number(cum.toFixed(2)); });
    return {
      series: [
        { name: "Volume", type: "column", data: series.map((r) => Number(n(r.volume).toFixed(2))) },
        { name: "Cumulative Net PnL", type: "line", data: cumPnl },
      ],
      options: {
        chart: { background: "transparent", toolbar: { show: false }, fontFamily: "inherit", animations: { enabled: false } },
        theme: { mode: "dark" },
        colors: ["#3b82f6", "#29d28b"],
        stroke: { width: [0, 2], curve: "smooth" },
        plotOptions: { bar: { columnWidth: "55%", borderRadius: 3 } },
        dataLabels: { enabled: false },
        grid: { borderColor: "rgba(255,255,255,0.06)", strokeDashArray: 4 },
        xaxis: {
          categories: series.map((r) => r.day),
          labels: { style: { colors: "#7c7c87", fontSize: "10px" } },
          axisBorder: { show: false }, axisTicks: { show: false },
        },
        yaxis: [
          { labels: { formatter: (v) => compactUsd(v), style: { colors: "#7c7c87", fontSize: "10px" } } },
          { opposite: true, labels: { formatter: (v) => compactUsd(v), style: { colors: "#7c7c87", fontSize: "10px" } } },
        ],
        legend: { labels: { colors: "#adadb8" }, fontSize: "11px" },
        tooltip: { theme: "dark", y: { formatter: (v) => usd(v) } },
      },
    };
  }, [series]);

  // Open positions grouped by trader, for readability
  const groupedPositions = useMemo(() => {
    const map = new Map();
    for (const p of onchainPositions) {
      if (!map.has(p.trader)) {
        map.set(p.trader, { trader: p.trader, username: p.username, rows: [], totalNotional: 0, totalMargin: 0 });
      }
      const g = map.get(p.trader);
      g.rows.push(p);
      g.totalNotional += p.notional;
      g.totalMargin += p.margin;
    }
    return [...map.values()].sort((a, b) => b.totalNotional - a.totalNotional);
  }, [onchainPositions]);

  // ── Guard / status screens ─────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <Page>
        <div className="flex flex-col items-center justify-center py-32 gap-3 text-ink-faint">
          <div className="w-5 h-5 rounded-full border-2 border-line border-t-blue-500 animate-spin" />
          <span className="text-[12px]">Loading admin dashboard…</span>
        </div>
      </Page>
    );
  }
  if (status === "unauth" || status === "forbidden") {
    const forbidden = status === "forbidden";
    return (
      <Page>
        <div className="flex flex-col items-center justify-center py-32 gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-surface-2 border border-line flex items-center justify-center">
            <Lock size={18} className="text-ink-faint" />
          </div>
          <p className="text-[14px] font-semibold text-white">{forbidden ? "Not authorized" : "Sign in required"}</p>
          <p className="text-[12px] text-ink-faint max-w-xs">
            {forbidden
              ? "This area is restricted to admin accounts."
              : "You need to be signed in with an admin account to view this page."}
          </p>
        </div>
      </Page>
    );
  }
  if (status === "error") {
    return (
      <Page>
        <div className="flex flex-col items-center justify-center py-32 gap-3 text-center">
          <p className="text-[14px] font-semibold text-down">Couldn’t load dashboard</p>
          <p className="text-[12px] text-ink-faint max-w-md break-words">{errorMsg}</p>
          <button onClick={load} className="mt-2 px-4 py-2 rounded-md bg-surface-2 border border-line text-[12px] text-ink hover:bg-surface-3">
            Retry
          </button>
        </div>
      </Page>
    );
  }

  const isEmpty = kpis && n(kpis.event_count) === 0;

  return (
    <Page>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-faint mb-1">
            Admin
          </p>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Platform Overview</h1>
          <p className="text-[11px] text-ink-ghost mt-1">
            Source: <span className="text-ink-faint">canonical_pnl_events</span>
            {kpis?.latest_event_at && <> · latest event {fmtTime(kpis.latest_event_at)}</>}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-md bg-surface-2 border border-line text-[12px] font-medium text-ink-muted hover:text-ink hover:bg-surface-3 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {isEmpty && (
        <div className="mb-6 rounded-xl border border-blue-500/20 bg-blue-500/[0.06] px-4 py-3 text-[12px] text-blue-300">
          No trading activity recorded yet. The canonical indexer is live — metrics will populate as trades settle on-chain.
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Volume"  value={compactUsd(kpis?.total_volume)} sub={`${intFmt(kpis?.trade_count)} trades`} />
        <StatCard label="24h Volume"    value={compactUsd(kpis?.volume_24h)}   sub={`${intFmt(kpis?.traders_24h)} traders (24h)`} />
        <StatCard label="Total Fees"    value={usd(kpis?.total_fees)}          sub="protocol fees" accent="text-up" />
        <StatCard label="Net Funding"   value={signedUsd(kpis?.total_funding)} sub="settled funding" />
        <StatCard label="Trader Net PnL" value={signedUsd(kpis?.total_net_pnl)} accent={n(kpis?.total_net_pnl) >= 0 ? "text-up" : "text-down"} sub={`realized ${signedUsd(kpis?.total_realized_pnl)}`} />
        <StatCard label="Liquidations"  value={intFmt(kpis?.liquidation_count)} sub={`${usd(kpis?.liquidation_penalty)} penalties`} accent="text-warn" />
        <StatCard label="Unique Traders" value={intFmt(kpis?.unique_traders)}  sub={`${intFmt(kpis?.event_count)} events`} />
        <StatCard label="Open Positions" value={intFmt(onchainPositions.length)} sub="live on-chain" />
      </div>

      {/* Chart */}
      <Section title="Daily Volume & Cumulative Net PnL (30d)">
        <div className="p-3">
          {chart
            ? <ReactApexChart options={chart.options} series={chart.series} height={300} />
            : <div className="py-16 text-center text-[12px] text-ink-faint">No time-series data in the last 30 days.</div>}
        </div>
      </Section>

      {/* Per-market breakdown */}
      <Section title="Market Breakdown">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="border-b border-line-subtle">
              <Th>Market</Th><Th right>Volume</Th><Th right>Trades</Th><Th right>Traders</Th>
              <Th right>Fees</Th><Th right>Funding</Th><Th right>Net PnL</Th><Th right>Liqs</Th>
            </tr></thead>
            <tbody className="divide-y divide-line-subtle">
              {markets.length === 0 ? <EmptyRow colSpan={8} label="No market activity yet." /> : markets.map((m) => (
                <tr key={m.market_id} className="hover:bg-surface-2/50">
                  <td className="px-4 py-2.5 text-[12px] font-semibold text-ink">{cleanMarket(m.market_name)}</td>
                  <td className="px-4 py-2.5 text-right num text-[12px] text-ink">{usd(m.volume)}</td>
                  <td className="px-4 py-2.5 text-right num text-[12px] text-ink-muted">{intFmt(m.trade_count)}</td>
                  <td className="px-4 py-2.5 text-right num text-[12px] text-ink-muted">{intFmt(m.unique_traders)}</td>
                  <td className="px-4 py-2.5 text-right num text-[12px] text-up">{usd(m.fees)}</td>
                  <td className="px-4 py-2.5 text-right num text-[12px] text-ink-muted">{signedUsd(m.funding)}</td>
                  <td className={`px-4 py-2.5 text-right num text-[12px] ${n(m.net_pnl) >= 0 ? "text-up" : "text-down"}`}>{signedUsd(m.net_pnl)}</td>
                  <td className="px-4 py-2.5 text-right num text-[12px] text-warn">{intFmt(m.liquidations)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Top traders */}
      <Section title="Top Traders (by Net PnL)">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="border-b border-line-subtle">
              <Th>Trader</Th><Th right>Volume</Th><Th right>Trades</Th>
              <Th right>Realized</Th><Th right>Funding</Th><Th right>Fees</Th><Th right>Net PnL</Th>
            </tr></thead>
            <tbody className="divide-y divide-line-subtle">
              {traders.length === 0 ? <EmptyRow colSpan={7} label="No traders yet." /> : traders.slice(0, 25).map((t) => (
                <tr key={t.user_address} className="hover:bg-surface-2/50">
                  <td className="px-4 py-2.5">
                    <div className="text-[12px] font-semibold text-ink">{t.username || shortAddr(t.user_address)}</div>
                    {t.username && <div className="text-[10px] num text-ink-ghost">{shortAddr(t.user_address)}</div>}
                  </td>
                  <td className="px-4 py-2.5 text-right num text-[12px] text-ink-muted">{usd(t.volume)}</td>
                  <td className="px-4 py-2.5 text-right num text-[12px] text-ink-muted">{intFmt(t.trade_count)}</td>
                  <td className={`px-4 py-2.5 text-right num text-[12px] ${n(t.realized_pnl) >= 0 ? "text-up" : "text-down"}`}>{signedUsd(t.realized_pnl)}</td>
                  <td className="px-4 py-2.5 text-right num text-[12px] text-ink-muted">{signedUsd(t.funding)}</td>
                  <td className="px-4 py-2.5 text-right num text-[12px] text-up">{usd(t.fees)}</td>
                  <td className={`px-4 py-2.5 text-right num text-[12px] font-bold ${n(t.net_pnl) >= 0 ? "text-up" : "text-down"}`}>{signedUsd(t.net_pnl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Recent activity */}
      <Section title="Recent Activity">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="border-b border-line-subtle">
              <Th>Time</Th><Th>Trader</Th><Th>Market</Th><Th>Type</Th><Th>Side</Th>
              <Th right>Notional</Th><Th right>Net PnL</Th><Th right>Tx</Th>
            </tr></thead>
            <tbody className="divide-y divide-line-subtle">
              {events.length === 0 ? <EmptyRow colSpan={8} label="No events yet." /> : events.map((e, i) => (
                <tr key={`${e.tx_hash}-${i}`} className="hover:bg-surface-2/50">
                  <td className="px-4 py-2.5 text-[10px] num text-ink-faint whitespace-nowrap">{fmtTime(e.block_timestamp)}</td>
                  <td className="px-4 py-2.5 text-[11px] text-ink-muted">{e.username || shortAddr(e.user_address)}</td>
                  <td className="px-4 py-2.5 text-[11px] text-ink">{cleanMarket(e.market_name)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${typeStyle(e.accounting_type)}`}>
                      {(e.accounting_type || "—").replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[11px]">
                    {e.side
                      ? <span className={`inline-flex items-center gap-0.5 ${e.side?.toLowerCase() === "long" ? "text-up" : "text-down"}`}>
                          {e.side?.toLowerCase() === "long" ? <TrendingUp size={10} /> : <TrendingDown size={10} />}{e.side}
                        </span>
                      : <span className="text-ink-ghost">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right num text-[11px] text-ink-muted">{e.notional != null ? usd(e.notional) : "—"}</td>
                  <td className={`px-4 py-2.5 text-right num text-[11px] ${n(e.net_pnl) >= 0 ? "text-up" : "text-down"}`}>{signedUsd(e.net_pnl)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <a href={txUrl(e.tx_hash)} target="_blank" rel="noopener noreferrer" className="inline-flex text-ink-faint hover:text-blue-400">
                      <ExternalLink size={12} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Open positions — read live from the ClearingHouse contract (no DB table) */}
      <Section
        title="Open Positions (live on-chain)"
        right={posError
          ? <span className="text-[10px] text-down">{posError}</span>
          : <span className="text-[10px] text-ink-ghost">{onchainPositions.length} open</span>}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="border-b border-line-subtle">
              <Th>Market</Th><Th>Side</Th>
              <Th right>Size</Th><Th right>Entry</Th><Th right>Notional</Th><Th right>Margin</Th><Th right>Lev</Th>
            </tr></thead>
            <tbody>
              {onchainPositions.length === 0
                ? <EmptyRow colSpan={7} label={posError ? "Couldn’t read on-chain positions." : "No open positions across known traders."} />
                : groupedPositions.map((g) => (
                  <React.Fragment key={g.trader}>
                    {/* Per-trader group header */}
                    <tr className="bg-surface-2/40 border-t border-line">
                      <td colSpan={7} className="px-4 py-2">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-baseline gap-2">
                            <span className="text-[12px] font-semibold text-ink">{g.username || shortAddr(g.trader)}</span>
                            {g.username && <span className="text-[10px] num text-ink-ghost">{shortAddr(g.trader)}</span>}
                          </div>
                          <div className="flex items-center gap-4 text-[10px] text-ink-faint">
                            <span>{g.rows.length} position{g.rows.length > 1 ? "s" : ""}</span>
                            <span>Notional <span className="num text-ink-muted">{usd(g.totalNotional)}</span></span>
                            <span>Margin <span className="num text-ink-muted">{usd(g.totalMargin)}</span></span>
                          </div>
                        </div>
                      </td>
                    </tr>
                    {g.rows.map((p, i) => (
                      <tr key={`${g.trader}-${p.marketName}-${i}`} className="hover:bg-surface-2/50 border-b border-line-subtle">
                        <td className="px-4 py-2.5 pl-8 text-[12px] text-ink-muted">{cleanMarket(p.marketName)}</td>
                        <td className={`px-4 py-2.5 text-[11px] ${p.isLong ? "text-up" : "text-down"}`}>{p.isLong ? "Long" : "Short"}</td>
                        <td className="px-4 py-2.5 text-right num text-[12px] text-ink-muted">{p.size.toFixed(4)}</td>
                        <td className="px-4 py-2.5 text-right num text-[12px] text-ink-muted">{usd(p.entryPrice)}</td>
                        <td className="px-4 py-2.5 text-right num text-[12px] text-ink">{usd(p.notional)}</td>
                        <td className="px-4 py-2.5 text-right num text-[12px] text-ink-muted">{usd(p.margin)}</td>
                        <td className="px-4 py-2.5 text-right num text-[12px] text-ink-muted">{p.margin > 0 ? `${(p.notional / p.margin).toFixed(2)}×` : "—"}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
            </tbody>
          </table>
        </div>
      </Section>
    </Page>
  );
}
