import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePublicClient } from "wagmi";
import { formatUnits } from "ethers";
import { supabase } from "./creatclient";
import { agentName } from "./utils/agentLabels";
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

// ── Surveillance-alert formatting ────────────────────────────────────────────
const SEV_STYLE = {
  high:   "text-down bg-down/10 border border-down/30",
  medium: "text-warn bg-warn/10 border border-warn/30",
  low:    "text-ink-muted bg-surface-3 border border-line",
};
const sevStyle = (s) => SEV_STYLE[s] || SEV_STYLE.low;
const KIND_LABEL = { peg_push: "Peg push", manipulation_round_trip: "Round-trip" };
const kindLabel = (k) => KIND_LABEL[k] || (k || "—").replace(/_/g, " ");
const bps = (v) => (v == null ? "—" : `${Math.round(n(v))} bps`);

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

// ── CSV export helpers ──────────────────────────────────────────────────────
function toCsv(rows, columns) {
  const esc = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map((c) => esc(c.label)).join(",");
  const body = (rows || []).map((r) => columns.map((c) => esc(c.get(r))).join(",")).join("\n");
  return `${header}\n${body}`;
}

function downloadCsv(filename, csv) {
  // Prepend BOM so Excel reads UTF-8 correctly.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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

const ExportButton = ({ onClick, label = "Export CSV" }) => (
  <button
    onClick={onClick}
    className="px-2.5 py-1 rounded-md bg-surface-2 border border-line text-[10px] font-medium text-ink-muted hover:text-ink hover:bg-surface-3 transition-colors"
  >
    {label}
  </button>
);

const Page = ({ children, contentRef }) => (
  <div className="min-h-screen bg-surface-0 pt-16 pb-12 px-4 md:px-8 lg:px-12">
    <div ref={contentRef} className="max-w-7xl mx-auto">{children}</div>
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
  const [pdfBusy, setPdfBusy]       = useState(false);
  const contentRef = useRef(null);
  const actionsRef = useRef(null);
  const [kpis, setKpis]           = useState(null);
  const [markets, setMarkets]     = useState([]);
  const [series, setSeries]       = useState([]);
  const [traders, setTraders]     = useState([]);
  const [events, setEvents]       = useState([]);
  const [alerts, setAlerts]       = useState([]);
  const [alertBusyId, setAlertBusyId] = useState(null);
  const [onchainPositions, setOnchainPositions] = useState([]);
  const [posError, setPosError]   = useState("");
  const publicClient = usePublicClient({ chainId: 11155111 });

  const fetchData = useCallback(async () => {
    const [k, m, s, t, e, a] = await Promise.all([
      supabase.rpc("admin_platform_kpis"),
      supabase.rpc("admin_market_breakdown"),
      supabase.rpc("admin_pnl_timeseries", { p_days: 30 }),
      supabase.rpc("admin_top_traders", { p_limit: 200 }),
      supabase.rpc("admin_recent_events", { p_limit: 50 }),
      supabase.rpc("admin_manipulation_alerts", { p_limit: 100 }),
    ]);
    const firstErr = [k, m, s, t, e, a].find((r) => r.error)?.error;
    if (firstErr) throw firstErr;
    setKpis(k.data || null);
    setMarkets(m.data || []);
    setSeries(s.data || []);
    setTraders(t.data || []);
    setEvents(e.data || []);
    setAlerts(a.data || []);

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

  // Surveillance alerts refresh on their own light cadence (the manipulation_alerts
  // table has RLS fully locked, so a realtime channel can't deliver — we poll the
  // admin RPC instead). Only while the dashboard is live.
  useEffect(() => {
    if (status !== "ready") return undefined;
    const id = setInterval(async () => {
      const { data, error } = await supabase.rpc("admin_manipulation_alerts", { p_limit: 100 });
      if (!error) setAlerts(data || []);
    }, 60_000);
    return () => clearInterval(id);
  }, [status]);

  // Acknowledge / dismiss an alert (optimistic; reverts on RPC error).
  const setAlertStatus = async (id, nextStatus) => {
    setAlertBusyId(id);
    const prev = alerts;
    setAlerts((rows) => rows.map((r) => (r.id === id ? { ...r, status: nextStatus } : r)));
    const { error } = await supabase.rpc("admin_set_alert_status", { p_id: id, p_status: nextStatus });
    if (error) { setAlerts(prev); alert(`Could not update alert: ${error.message}`); }
    setAlertBusyId(null);
  };

  const openAlerts = useMemo(() => alerts.filter((a) => a.status === "open"), [alerts]);

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

  // ── CSV exports (raw table data) ────────────────────────────────────────────
  const exportMarkets = () => downloadCsv("market_breakdown.csv", toCsv(markets, [
    { label: "Market", get: (r) => r.market_name },
    { label: "Market ID", get: (r) => r.market_id },
    { label: "Volume (USD)", get: (r) => n(r.volume) },
    { label: "Trades", get: (r) => n(r.trade_count) },
    { label: "Unique Traders", get: (r) => n(r.unique_traders) },
    { label: "Fees (USD)", get: (r) => n(r.fees) },
    { label: "Funding (USD)", get: (r) => n(r.funding) },
    { label: "Net PnL (USD)", get: (r) => n(r.net_pnl) },
    { label: "Liquidations", get: (r) => n(r.liquidations) },
  ]));

  const exportTraders = () => downloadCsv("traders.csv", toCsv(traders, [
    { label: "Wallet", get: (r) => r.user_address },
    { label: "Username", get: (r) => r.username || "" },
    { label: "Volume (USD)", get: (r) => n(r.volume) },
    { label: "Trades", get: (r) => n(r.trade_count) },
    { label: "Realized PnL (USD)", get: (r) => n(r.realized_pnl) },
    { label: "Funding (USD)", get: (r) => n(r.funding) },
    { label: "Fees (USD)", get: (r) => n(r.fees) },
    { label: "Net PnL (USD)", get: (r) => n(r.net_pnl) },
  ]));

  const exportEvents = () => downloadCsv("recent_activity.csv", toCsv(events, [
    { label: "Time", get: (r) => r.block_timestamp },
    { label: "Wallet", get: (r) => r.user_address },
    { label: "Username", get: (r) => r.username || "" },
    { label: "Market", get: (r) => r.market_name },
    { label: "Type", get: (r) => r.accounting_type },
    { label: "Side", get: (r) => r.side || "" },
    { label: "Notional (USD)", get: (r) => (r.notional == null ? "" : n(r.notional)) },
    { label: "Realized PnL (USD)", get: (r) => n(r.realized_pnl) },
    { label: "Fee (USD)", get: (r) => n(r.fee) },
    { label: "Net PnL (USD)", get: (r) => n(r.net_pnl) },
    { label: "Tx Hash", get: (r) => r.tx_hash },
  ]));

  const exportPositions = () => downloadCsv("open_positions.csv", toCsv(onchainPositions, [
    { label: "Wallet", get: (r) => r.trader },
    { label: "Username", get: (r) => r.username || "" },
    { label: "Market", get: (r) => r.marketName },
    { label: "Side", get: (r) => (r.isLong ? "Long" : "Short") },
    { label: "Size", get: (r) => r.size },
    { label: "Entry (USD)", get: (r) => r.entryPrice },
    { label: "Notional (USD)", get: (r) => r.notional },
    { label: "Margin (USD)", get: (r) => r.margin },
    { label: "Leverage", get: (r) => (r.margin > 0 ? Number((r.notional / r.margin).toFixed(2)) : "") },
  ]));

  const exportAlerts = () => downloadCsv("manipulation_alerts.csv", toCsv(alerts, [
    { label: "Detected", get: (r) => r.detected_at },
    { label: "Severity", get: (r) => r.severity },
    { label: "Type", get: (r) => r.kind },
    { label: "Agent", get: (r) => r.agent_label || "" },
    { label: "Wallet", get: (r) => r.wallet },
    { label: "Market", get: (r) => r.market },
    { label: "Impact (bps)", get: (r) => n(r.impact_bps) },
    { label: "Widened (bps)", get: (r) => n(r.widened_bps) },
    { label: "Gap (bps)", get: (r) => n(r.dev_bps) },
    { label: "Notional (USD)", get: (r) => n(r.notional_usd) },
    { label: "Status", get: (r) => r.status },
    { label: "Detail", get: (r) => r.detail },
    { label: "Tx Hashes", get: (r) => (r.tx_hashes || []).join(" ") },
  ]));

  const exportKpis = () => {
    if (!kpis) return;
    downloadCsv("platform_kpis.csv", toCsv([kpis], Object.keys(kpis).map((k) => ({ label: k, get: (r) => r[k] }))));
  };

  const exportAll = () => {
    [exportKpis, exportMarkets, exportTraders, exportEvents, exportPositions, exportAlerts]
      .forEach((fn, i) => setTimeout(fn, i * 300));
  };

  // ── PDF export — captures the dashboard exactly as rendered (dark theme kept) ─
  const exportPdf = async () => {
    if (!contentRef.current || pdfBusy) return;
    setPdfBusy(true);
    const actions = actionsRef.current;
    if (actions) actions.style.visibility = "hidden"; // hide buttons in the capture
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(contentRef.current, {
        backgroundColor: "#050507", // surface-0, so gaps match the page
        scale: 2,
        useCORS: true,
      });
      const w = canvas.width / 2;
      const h = canvas.height / 2;
      const pdf = new jsPDF({ orientation: w >= h ? "landscape" : "portrait", unit: "px", format: [w, h] });
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, w, h);
      pdf.save(`admin-dashboard-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("PDF export failed", err);
      alert(`PDF export failed: ${err?.message || "unknown error"}`);
    } finally {
      if (actions) actions.style.visibility = "";
      setPdfBusy(false);
    }
  };

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
    <Page contentRef={contentRef}>
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
        <div ref={actionsRef} className="shrink-0 flex items-center gap-2">
          <button
            onClick={exportPdf}
            disabled={pdfBusy}
            className="px-3 py-2 rounded-md bg-surface-2 border border-line text-[12px] font-medium text-ink-muted hover:text-ink hover:bg-surface-3 transition-colors disabled:opacity-50"
          >
            {pdfBusy ? "Exporting…" : "Export PDF"}
          </button>
          <button
            onClick={exportAll}
            className="px-3 py-2 rounded-md bg-surface-2 border border-line text-[12px] font-medium text-ink-muted hover:text-ink hover:bg-surface-3 transition-colors"
          >
            Export all CSV
          </button>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-surface-2 border border-line text-[12px] font-medium text-ink-muted hover:text-ink hover:bg-surface-3 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
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

      {/* Surveillance — market-manipulation alerts from the behavioral monitor */}
      <Section
        title="Surveillance — Manipulation Alerts"
        right={
          <div className="flex items-center gap-3">
            {openAlerts.length > 0
              ? <span className="px-2 py-0.5 rounded-full bg-down/10 text-down text-[10px] font-bold border border-down/30">{openAlerts.length} open</span>
              : <span className="text-[10px] text-up">All clear</span>}
            <ExportButton onClick={exportAlerts} />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="border-b border-line-subtle">
              <Th>Detected</Th><Th>Severity</Th><Th>Type</Th><Th>Wallet</Th><Th>Market</Th>
              <Th right>Impact</Th><Th right>Widened</Th><Th right>Gap</Th><Th right>Notional</Th>
              <Th right>Tx</Th><Th right>Status</Th>
            </tr></thead>
            <tbody className="divide-y divide-line-subtle">
              {alerts.length === 0 ? <EmptyRow colSpan={11} label="No manipulation alerts detected." /> : alerts.map((a) => (
                <tr
                  key={a.id}
                  title={a.detail || ""}
                  className={`hover:bg-surface-2/50 ${a.status === "open" && a.severity === "high" ? "bg-down/[0.05]" : ""} ${a.status === "dismissed" ? "opacity-45" : ""}`}
                >
                  <td className="px-4 py-2.5 text-[10px] num text-ink-faint whitespace-nowrap">{fmtTime(a.detected_at)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${sevStyle(a.severity)}`}>{a.severity}</span>
                  </td>
                  <td className="px-4 py-2.5 text-[11px] text-ink whitespace-nowrap">{kindLabel(a.kind)}</td>
                  <td className="px-4 py-2.5 text-[11px]">
                    {a.agent_label
                      ? <span className="inline-flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-semibold">{a.agent_label}</span>
                          <span className="num text-[10px] text-ink-faint">{shortAddr(a.wallet)}</span>
                        </span>
                      : <span className="num text-[10px] text-ink-muted">{shortAddr(a.wallet)}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-[11px] text-ink">{cleanMarket(a.market)}</td>
                  <td className="px-4 py-2.5 text-right num text-[11px] text-ink">{bps(a.impact_bps)}</td>
                  <td className="px-4 py-2.5 text-right num text-[11px] text-warn">{bps(a.widened_bps)}</td>
                  <td className="px-4 py-2.5 text-right num text-[11px] text-ink-muted">{bps(a.dev_bps)}</td>
                  <td className="px-4 py-2.5 text-right num text-[11px] text-ink-muted">{a.notional_usd != null ? usd(a.notional_usd) : "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1.5 justify-end">
                      {(a.tx_hashes || []).map((h) => (
                        <a key={h} href={txUrl(h)} target="_blank" rel="noopener noreferrer" className="inline-flex text-ink-faint hover:text-blue-400"><ExternalLink size={12} /></a>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    {a.status === "open" ? (
                      <div className="inline-flex items-center gap-1.5">
                        <button disabled={alertBusyId === a.id} onClick={() => setAlertStatus(a.id, "ack")}
                          className="px-2 py-0.5 rounded bg-surface-2 border border-line text-[10px] text-ink-muted hover:text-ink hover:bg-surface-3 disabled:opacity-50">Ack</button>
                        <button disabled={alertBusyId === a.id} onClick={() => setAlertStatus(a.id, "dismissed")}
                          className="px-2 py-0.5 rounded bg-surface-2 border border-line text-[10px] text-ink-muted hover:text-ink hover:bg-surface-3 disabled:opacity-50">Dismiss</button>
                      </div>
                    ) : a.status === "ack" ? (
                      <div className="inline-flex items-center gap-1.5">
                        <span className="text-[10px] text-up font-semibold">Acked</span>
                        <button disabled={alertBusyId === a.id} onClick={() => setAlertStatus(a.id, "dismissed")}
                          className="px-2 py-0.5 rounded bg-surface-2 border border-line text-[10px] text-ink-muted hover:text-ink hover:bg-surface-3 disabled:opacity-50">Dismiss</button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-ink-ghost">Dismissed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-line-subtle text-[10px] text-ink-ghost">
          Behavioral monitor flags trades that push the vAMM mark away from the index oracle (peg pushes) and manipulative push-then-unwind round-trips. Hover a row for detail.
        </div>
      </Section>

      {/* Chart */}
      <Section title="Daily Volume & Cumulative Net PnL (30d)">
        <div className="p-3">
          {chart
            ? <ReactApexChart options={chart.options} series={chart.series} height={300} />
            : <div className="py-16 text-center text-[12px] text-ink-faint">No time-series data in the last 30 days.</div>}
        </div>
      </Section>

      {/* Per-market breakdown */}
      <Section title="Market Breakdown" right={<ExportButton onClick={exportMarkets} />}>
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
      <Section title="Top Traders (by Net PnL)" right={<ExportButton onClick={exportTraders} />}>
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
                    <div className={`text-[12px] font-semibold ${agentName(t.user_address) ? "text-blue-400" : "text-ink"}`}>{agentName(t.user_address) || t.username || shortAddr(t.user_address)}</div>
                    {(agentName(t.user_address) || t.username) && <div className="text-[10px] num text-ink-ghost">{shortAddr(t.user_address)}</div>}
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
      <Section title="Recent Activity" right={<ExportButton onClick={exportEvents} />}>
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
                  <td className="px-4 py-2.5 text-[11px]">
                    {agentName(e.user_address)
                      ? <span className="inline-flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-semibold">{agentName(e.user_address)}</span>
                          <span className="num text-[10px] text-ink-faint">{shortAddr(e.user_address)}</span>
                        </span>
                      : <span className="text-ink-muted">{e.username || shortAddr(e.user_address)}</span>}
                  </td>
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
        right={
          <div className="flex items-center gap-3">
            {posError
              ? <span className="text-[10px] text-down">{posError}</span>
              : <span className="text-[10px] text-ink-ghost">{onchainPositions.length} open</span>}
            <ExportButton onClick={exportPositions} />
          </div>
        }
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
                            <span className={`text-[12px] font-semibold ${agentName(g.trader) ? "text-blue-400" : "text-ink"}`}>{agentName(g.trader) || g.username || shortAddr(g.trader)}</span>
                            {(agentName(g.trader) || g.username) && <span className="text-[10px] num text-ink-ghost">{shortAddr(g.trader)}</span>}
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
