/**
 * Step 0 — frozen dataset for the protocol validation report.
 * Pulls the full canonical_pnl_events history + surveillance alerts, computes
 * every figure the report will quote, and writes a single snapshot file so all
 * sections reconcile against one "data as of" timestamp.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import * as dotenv from "dotenv";
dotenv.config();

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const fleet = JSON.parse(readFileSync("../agentic-trading/_fleetmap.json", "utf8"));
const byAddr = Object.fromEntries(fleet.agents.map((a) => [a.address, a]));
const TRADE = ["open", "increase", "reduce", "close", "flip"];
const CUTOFF = new Date();

const rows = [];
for (let p = 0; ; p++) {
  const { data, error } = await sb
    .from("canonical_pnl_events")
    .select("user_address, market_name, accounting_type, notional, execution_price, net_pnl, realized_pnl, fee, funding_payment, block_timestamp")
    .order("block_timestamp", { ascending: true })
    .range(p * 1000, p * 1000 + 999);
  if (error) throw error;
  rows.push(...data);
  if (data.length < 1000) break;
}

const isAgent = (r) => !!byAddr[r.user_address?.toLowerCase()];
const agentRows = rows.filter(isAgent);
const trades = rows.filter((r) => TRADE.includes(r.accounting_type));
const agentTrades = trades.filter(isAgent);
const notional = (r) => Math.abs(Number(r.notional || 0));
const volOf = (rs) => rs.reduce((s, r) => s + notional(r), 0);
const sumOf = (rs, f) => rs.reduce((s, r) => s + Number(r[f] || 0), 0);
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

const snap = { cutoff: CUTOFF.toISOString(), config: { markets: fleet.markets.length, marketNames: fleet.markets } };

// ── Coverage / windows ──
snap.window = { first: trades[0]?.block_timestamp, last: trades[trades.length - 1]?.block_timestamp };
snap.totals = {
  events: rows.length, trades: trades.length,
  agentTrades: agentTrades.length, nonAgentTrades: trades.length - agentTrades.length,
  agentVolume: volOf(agentTrades), nonAgentVolume: volOf(trades) - volOf(agentTrades),
  distinctAgentWallets: new Set(agentTrades.map((r) => r.user_address)).size,
};
snap.windows = {};
for (const [k, ms] of [["24h", 864e5], ["7d", 7 * 864e5], ["30d", 30 * 864e5]]) {
  const w = agentTrades.filter((r) => Date.parse(r.block_timestamp) >= CUTOFF - ms);
  snap.windows[k] = { trades: w.length, volume: volOf(w) };
}

// ── Event type mix ──
snap.eventMix = {};
for (const r of rows) snap.eventMix[r.accounting_type] = (snap.eventMix[r.accounting_type] || 0) + 1;

// ── Per market ──
snap.perMarket = {};
for (const r of agentTrades) {
  const m = (snap.perMarket[r.market_name] ||= { trades: 0, volume: 0, wallets: new Set(), prices: [] });
  m.trades++; m.volume += notional(r); m.wallets.add(r.user_address);
  const px = Number(r.execution_price); if (px > 0) m.prices.push(px);
}
for (const [k, m] of Object.entries(snap.perMarket)) {
  snap.perMarket[k] = { trades: m.trades, volume: m.volume, wallets: m.wallets.size,
    priceLow: m.prices.length ? Math.min(...m.prices) : null,
    priceHigh: m.prices.length ? Math.max(...m.prices) : null };
}
snap.untradedMarkets = fleet.markets.filter((m) => !snap.perMarket[m]);

// ── Per agent / archetype ──
snap.perAgent = {}; snap.perArchetype = {};
for (const r of agentTrades) {
  const a = byAddr[r.user_address.toLowerCase()];
  const ag = (snap.perAgent[a.label] ||= { archetype: a.archetype, rate: a.ratePerHour, clip: a.clipUsd, leverage: a.leverage, trades: 0, volume: 0, opens: 0, closes: 0, markets: new Set() });
  ag.trades++; ag.volume += notional(r); ag.markets.add(r.market_name);
  if (r.accounting_type === "open" || r.accounting_type === "increase") ag.opens++; else ag.closes++;
  const ar = (snap.perArchetype[a.archetype] ||= { agents: new Set(), trades: 0, volume: 0 });
  ar.agents.add(a.label); ar.trades++; ar.volume += notional(r);
}
for (const [k, v] of Object.entries(snap.perAgent)) snap.perAgent[k] = { ...v, markets: [...v.markets] };
for (const [k, v] of Object.entries(snap.perArchetype)) snap.perArchetype[k] = { agents: v.agents.size, trades: v.trades, volume: v.volume };

// ── Round trips ──
const seq = {};
for (const r of agentTrades) (seq[`${r.user_address.toLowerCase()}|${r.market_name}`] ||= []).push(r);
snap.roundTrips = {};
for (const [k, list] of Object.entries(seq)) {
  const a = byAddr[k.split("|")[0]];
  list.sort((x, y) => Date.parse(x.block_timestamp) - Date.parse(y.block_timestamp));
  let open = null;
  for (const r of list) {
    const isOpen = r.accounting_type === "open" || r.accounting_type === "increase";
    if (isOpen) { if (!open) open = r; }
    else if (open) {
      const t = (snap.roundTrips[a.label] ||= { n: 0, holds: [], ratios: [] });
      t.n++; t.holds.push((Date.parse(r.block_timestamp) - Date.parse(open.block_timestamp)) / 1000);
      t.ratios.push(notional(open) > 0 ? notional(r) / notional(open) : 0);
      open = null;
    }
  }
}
for (const [k, v] of Object.entries(snap.roundTrips)) snap.roundTrips[k] = { n: v.n, medHoldSec: med(v.holds), medRatio: med(v.ratios) };

// ── Economics + integrity ──
snap.economics = {
  fees: sumOf(agentRows, "fee"), funding: sumOf(agentRows, "funding_payment"),
  realizedPnl: sumOf(agentRows, "realized_pnl"), netPnl: sumOf(agentRows, "net_pnl"),
  feeRateImplied: sumOf(agentRows, "fee") / volOf(agentTrades),
  fundingSettlements: rows.filter((r) => r.accounting_type === "funding_settlement").length,
};
const liq = rows.filter((r) => r.accounting_type === "liquidation");
snap.liquidations = { total: liq.length, agents: liq.filter(isAgent).length,
  byAgent: [...new Set(liq.filter(isAgent).map((r) => byAddr[r.user_address.toLowerCase()].label))],
  markets: [...new Set(liq.map((r) => r.market_name))] };

// ── Uptime: distinct active hours per day, last 10 days ──
snap.uptime = {};
for (const r of agentTrades.filter((x) => Date.parse(x.block_timestamp) >= CUTOFF - 10 * 864e5)) {
  const d = new Date(r.block_timestamp);
  const day = d.toISOString().slice(0, 10);
  (snap.uptime[day] ||= new Set()).add(d.getUTCHours());
}
for (const [k, v] of Object.entries(snap.uptime)) snap.uptime[k] = v.size;

// ── Throughput peaks ──
const perHour = {};
for (const r of agentTrades) { const h = r.block_timestamp.slice(0, 13); perHour[h] = (perHour[h] || 0) + 1; }
const hourVals = Object.values(perHour);
snap.throughput = { peakTradesPerHour: Math.max(...hourVals), medianActiveHour: med(hourVals), activeHours: hourVals.length };

// ── Surveillance ──
const { data: alerts } = await sb.from("manipulation_alerts").select("*").order("detected_at", { ascending: false });
snap.surveillance = { alerts: (alerts || []).length, rows: (alerts || []).map((a) => ({ sev: a.severity, kind: a.kind, label: a.agent_label, market: a.market, dev: a.dev_bps, impact: a.impact_bps, widened: a.widened_bps, notional: a.notional_usd, detail: a.detail })) };

writeFileSync("_report_snapshot.json", JSON.stringify(snap, null, 2));
console.log(JSON.stringify(snap, null, 2).slice(0, 4000));
console.log("\n... full snapshot written to _report_snapshot.json");
