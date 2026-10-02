import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion as Motion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  ChartNoAxesCombined,
  Check,
  Layers3,
  ShieldCheck,
} from "lucide-react";
import PriceIndexChart from "../chart";

const MARKETS = [
  { id: "H100-GPU-PERP", model: "H100", name: "NVIDIA H100", fallback: 3.77 },
  { id: "B200-PERP-V2", model: "B200", name: "NVIDIA B200", fallback: 5.84 },
  { id: "T4-PERP", model: "T4", name: "NVIDIA T4", fallback: 0.52 },
];

const MODES = [
  {
    id: "trade",
    number: "01",
    label: "Trade",
    title: "Move from an index to a position",
    description: "Explore GPU markets, choose direction and preview margin before entering the trading application.",
    icon: ChartNoAxesCombined,
  },
  {
    id: "risk",
    number: "02",
    label: "Risk",
    title: "See the position before the threshold",
    description: "Keep margin health, unsettled funding and maintenance requirements visible while markets move.",
    icon: ShieldCheck,
  },
  {
    id: "portfolio",
    number: "03",
    label: "Portfolio",
    title: "One view across compute exposure",
    description: "Review open positions, effective margin and performance across the GPU index suite.",
    icon: Layers3,
  },
];

const LEVERAGE_OPTIONS = [2, 3, 5, 10];
const ORDER_NOTIONAL = 1250;

const formatUsd = (value, digits = 2) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);

const Stat = ({ label, value, tone = "default" }) => {
  const toneClass = tone === "positive"
    ? "text-emerald-400"
    : tone === "negative"
      ? "text-rose-400"
      : "text-zinc-100";

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3.5">
      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-600">{label}</p>
      <p className={`mt-2 font-mono text-sm font-medium tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
};

const TradePanel = ({ side, setSide, leverage, setLeverage, currentPrice, selectedMarket }) => {
  const isLong = side === "long";
  const margin = ORDER_NOTIONAL / leverage;
  const fee = ORDER_NOTIONAL * 0.0005;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Order preview</span>
        <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-zinc-600">Market · Cross</span>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/[0.06] bg-black/20 p-1">
          {["long", "short"].map((direction) => {
            const active = side === direction;
            const longDirection = direction === "long";
            return (
              <button
                key={direction}
                type="button"
                onClick={() => setSide(direction)}
                aria-pressed={active}
                className={`rounded-lg py-2 text-[11px] font-semibold capitalize transition-all ${
                  active
                    ? longDirection
                      ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                      : "border border-rose-500/20 bg-rose-500/10 text-rose-400"
                    : "border border-transparent text-zinc-600 hover:text-zinc-300"
                }`}
              >
                {direction}
              </button>
            );
          })}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-600">Position size</span>
            <span className="font-mono text-[9px] text-zinc-600">USDC</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-2.5">
            <span className="font-mono text-[13px] font-medium tabular-nums text-zinc-100">1,250.00</span>
            <span className="text-[10px] text-zinc-600">Notional</span>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-600">Target leverage</span>
            <span className="font-mono text-[11px] text-zinc-300">{leverage}×</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {LEVERAGE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setLeverage(option)}
                aria-pressed={leverage === option}
                className={`rounded-lg border py-1.5 font-mono text-[10px] transition-colors ${
                  leverage === option
                    ? "border-blue-400/25 bg-blue-500/10 text-blue-300"
                    : "border-white/[0.06] bg-white/[0.02] text-zinc-600 hover:text-zinc-300"
                }`}
              >
                {option}×
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 border-t border-white/[0.06] pt-4">
          {[
            ["Index price", formatUsd(currentPrice)],
            ["Required margin", formatUsd(margin)],
            ["Estimated fee", formatUsd(fee, 3)],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-600">{label}</span>
              <span className="font-mono tabular-nums text-zinc-300">{value}</span>
            </div>
          ))}
        </div>

        <Link
          to={`/trade?market=${selectedMarket}`}
          className={`mt-auto flex h-10 items-center justify-center rounded-xl border text-[11px] font-semibold transition-all hover:-translate-y-px ${
            isLong
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/[0.14]"
              : "border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/[0.14]"
          }`}
        >
          Continue to {isLong ? "long" : "short"} {MARKETS.find((market) => market.id === selectedMarket)?.model}
        </Link>
      </div>
    </div>
  );
};

const RiskPanel = () => (
  <div className="flex h-full flex-col">
    <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Position health</span>
      <span className="inline-flex items-center gap-1.5 text-[9px] font-medium text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Healthy
      </span>
    </div>

    <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-600">Margin ratio</p>
            <p className="mt-2 font-mono text-xl font-semibold tracking-tight text-zinc-100">34.8%</p>
          </div>
          <span className="text-[9px] text-zinc-600">Maintenance 6.25%</span>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-blue-500 to-emerald-400" />
        </div>
        <div className="mt-2 flex justify-between text-[8px] uppercase tracking-[0.1em] text-zinc-700">
          <span>Maintenance</span><span>Current</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Effective margin" value="$1,412.64" />
        <Stat label="Unsettled funding" value="−$12.36" tone="negative" />
        <Stat label="Unrealized P&L" value="+$184.20" tone="positive" />
        <Stat label="Buffer to maintenance" value="28.55%" />
      </div>

      <div className="mt-auto rounded-xl border border-white/[0.06] bg-black/20 p-3.5">
        {[
          "Index and mark prices current",
          "Funding included in effective margin",
          "Maintenance threshold monitored",
        ].map((item) => (
          <div key={item} className="flex items-center gap-2.5 py-1.5 text-[10px] text-zinc-500">
            <span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-500/10 text-emerald-400"><Check size={10} /></span>
            {item}
          </div>
        ))}
      </div>
    </div>
  </div>
);

const PortfolioPanel = ({ indexPrices }) => {
  const positions = [
    { market: "H100-GPU-PERP", model: "H100", side: "Long", size: "$4,200.00", margin: "$840.00", funding: "−$12.36", pnl: "+$184.20", positive: true },
    { market: "B200-PERP-V2", model: "B200", side: "Long", size: "$2,800.00", margin: "$700.00", funding: "+$4.18", pnl: "+$72.40", positive: true },
    { market: "T4-PERP", model: "T4", side: "Short", size: "$1,100.00", margin: "$366.67", funding: "−$1.24", pnl: "−$18.60", positive: false },
  ];

  return (
    <div className="min-h-[420px] p-4 sm:p-6">
      <div className="mb-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Stat label="Account equity" value="$12,486.34" />
        <Stat label="Open interest" value="$8,100.00" />
        <Stat label="Net unsettled funding" value="−$9.42" tone="negative" />
        <Stat label="Unrealized P&L" value="+$238.00" tone="positive" />
      </div>

      <div className="overflow-hidden rounded-xl border border-white/[0.06]">
        <div className="hidden grid-cols-[1.35fr_0.7fr_1fr_1fr_1fr_1fr] gap-4 border-b border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-zinc-700 sm:grid">
          <span>Market</span><span>Side</span><span>Mark</span><span>Margin</span><span>Funding</span><span className="text-right">P&L</span>
        </div>
        {positions.map((position) => {
          const fallback = MARKETS.find((market) => market.id === position.market)?.fallback ?? 0;
          const mark = Number(indexPrices?.[position.market] ?? fallback);
          return (
            <div key={position.market} className="grid gap-3 border-b border-white/[0.05] px-4 py-4 last:border-b-0 sm:grid-cols-[1.35fr_0.7fr_1fr_1fr_1fr_1fr] sm:items-center sm:gap-4">
              <div>
                <p className="text-xs font-semibold text-zinc-200">{position.model}-PERP</p>
                <p className="mt-1 font-mono text-[9px] text-zinc-700">{position.size}</p>
              </div>
              <span className={`w-fit rounded-full px-2 py-1 text-[9px] font-medium ${position.side === "Long" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>{position.side}</span>
              <div className="flex justify-between sm:block"><span className="text-[9px] text-zinc-600 sm:hidden">Mark</span><span className="font-mono text-[10px] text-zinc-300">{formatUsd(mark)}</span></div>
              <div className="flex justify-between sm:block"><span className="text-[9px] text-zinc-600 sm:hidden">Margin</span><span className="font-mono text-[10px] text-zinc-300">{position.margin}</span></div>
              <div className="flex justify-between sm:block"><span className="text-[9px] text-zinc-600 sm:hidden">Funding</span><span className="font-mono text-[10px] text-zinc-400">{position.funding}</span></div>
              <div className="flex justify-between sm:block sm:text-right"><span className="text-[9px] text-zinc-600 sm:hidden">P&L</span><span className={`font-mono text-[10px] ${position.positive ? "text-emerald-400" : "text-rose-400"}`}>{position.pnl}</span></div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-[9px] leading-4 text-zinc-700">Illustrative portfolio values. Live account data is available after sign-in.</p>
    </div>
  );
};

export default function TradingPlatformShowcase({ indexPrices = {} }) {
  const [activeMode, setActiveMode] = useState("trade");
  const [selectedMarket, setSelectedMarket] = useState(MARKETS[0].id);
  const [side, setSide] = useState("long");
  const [leverage, setLeverage] = useState(5);

  const activeMarket = useMemo(
    () => MARKETS.find((market) => market.id === selectedMarket) ?? MARKETS[0],
    [selectedMarket],
  );
  const currentPrice = Number(indexPrices?.[selectedMarket] ?? activeMarket.fallback);
  const activeModeDetails = MODES.find((mode) => mode.id === activeMode) ?? MODES[0];

  return (
    <section className="relative z-10 overflow-hidden py-20 md:py-28">
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-[580px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/[0.035] blur-3xl" />

      <div className="container relative mx-auto max-w-6xl px-6 lg:px-12 2xl:max-w-[84rem]">
        <Motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"
        >
          <div className="max-w-2xl">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-300">Inside ByteStrike</p>
            <h2 className="text-3xl font-semibold leading-[1.08] tracking-[-0.025em] text-white md:text-[42px]">
              A clearer way to trade compute.
            </h2>
            <p className="mt-4 max-w-xl text-[15px] leading-7 text-zinc-400">
              Move from live GPU indices to positions, risk context and portfolio oversight without losing sight of what drives the market.
            </p>
          </div>
          <Link to="/trade" className="group inline-flex w-fit items-center gap-2 text-sm font-medium text-zinc-300 transition-colors hover:text-white">
            Open trading platform
            <ArrowUpRight size={15} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </Motion.div>

        <div className="mb-3 grid gap-2 md:grid-cols-3" role="tablist" aria-label="Trading platform preview">
          {MODES.map((mode) => {
            const Icon = mode.icon;
            const active = activeMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveMode(mode.id)}
                className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 ${
                  active
                    ? "border-white/[0.13] bg-white/[0.06] shadow-[0_16px_50px_rgba(0,0,0,0.22)]"
                    : "border-white/[0.055] bg-white/[0.018] hover:border-white/[0.1] hover:bg-white/[0.035]"
                }`}
              >
                {active && <Motion.span layoutId="showcase-mode" className="absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent" />}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className={`grid h-8 w-8 place-items-center rounded-lg border ${active ? "border-blue-400/20 bg-blue-500/10 text-blue-300" : "border-white/[0.06] bg-white/[0.025] text-zinc-600 group-hover:text-zinc-400"}`}>
                      <Icon size={14} />
                    </span>
                    <div>
                      <span className="block font-mono text-[8px] text-zinc-700">{mode.number}</span>
                      <span className={`mt-0.5 block text-xs font-semibold ${active ? "text-white" : "text-zinc-400"}`}>{mode.label}</span>
                    </div>
                  </div>
                  <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.8)]" : "bg-zinc-800"}`} />
                </div>
              </button>
            );
          })}
        </div>

        <Motion.div
          initial={{ opacity: 0, y: 18, scale: 0.99 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, delay: 0.08, ease: [0.25, 0.1, 0.25, 1] }}
          className="overflow-hidden rounded-[22px] border border-white/[0.09] bg-[#09090e] shadow-[0_30px_90px_rgba(0,0,0,0.35)]"
        >
          <div className="flex flex-col gap-3 border-b border-white/[0.06] bg-[#08080c] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              <span className="truncate font-mono text-[10px] font-semibold tracking-wide text-zinc-300">BYTESTRIKE / {activeMode.toUpperCase()}</span>
              <span className="hidden text-[8px] uppercase tracking-[0.14em] text-zinc-700 sm:inline">Interactive preview</span>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto">
              {MARKETS.map((market) => {
                const active = selectedMarket === market.id;
                return (
                  <button
                    key={market.id}
                    type="button"
                    onClick={() => setSelectedMarket(market.id)}
                    aria-pressed={active}
                    className={`shrink-0 rounded-lg px-2.5 py-1.5 font-mono text-[9px] transition-colors ${active ? "bg-white/[0.08] text-zinc-100" : "text-zinc-700 hover:text-zinc-400"}`}
                  >
                    {market.model}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-b border-white/[0.06] bg-white/[0.012] px-4 py-3 sm:px-5">
            <AnimatePresence mode="wait">
              <Motion.div
                key={activeMode}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-xs font-semibold text-zinc-200">{activeModeDetails.title}</p>
                  <p className="mt-1 text-[10px] leading-4 text-zinc-600">{activeModeDetails.description}</p>
                </div>
                {activeMode !== "portfolio" && (
                  <div className="mt-2 flex items-center gap-2 sm:mt-0">
                    <span className="text-[8px] uppercase tracking-[0.12em] text-zinc-700">{activeMarket.name}</span>
                    <span className="font-mono text-[11px] font-semibold text-zinc-200">{formatUsd(currentPrice)}</span>
                  </div>
                )}
              </Motion.div>
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            <Motion.div
              key={activeMode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {activeMode === "portfolio" ? (
                <PortfolioPanel indexPrices={indexPrices} />
              ) : (
                <div className="grid grid-cols-12">
                  <div className="relative col-span-12 h-[320px] border-b border-white/[0.06] lg:col-span-8 lg:h-[420px] lg:border-b-0 lg:border-r">
                    <div className="pointer-events-none absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-black/45 px-2.5 py-1.5 backdrop-blur-md">
                      <Activity size={11} className="text-blue-400" />
                      <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-zinc-500">Live index</span>
                    </div>
                    <PriceIndexChart market={selectedMarket} compact />
                  </div>
                  <div className="col-span-12 min-h-[420px] lg:col-span-4">
                    {activeMode === "trade" ? (
                      <TradePanel
                        side={side}
                        setSide={setSide}
                        leverage={leverage}
                        setLeverage={setLeverage}
                        currentPrice={currentPrice}
                        selectedMarket={selectedMarket}
                      />
                    ) : (
                      <RiskPanel />
                    )}
                  </div>
                </div>
              )}
            </Motion.div>
          </AnimatePresence>
        </Motion.div>

        <div className="mt-5 flex flex-col gap-3 text-[10px] leading-5 text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
          <p>This preview is illustrative and does not submit transactions.</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={12} /> Non-custodial controls</span>
            <span className="inline-flex items-center gap-1.5"><Activity size={12} /> Index-linked markets</span>
          </div>
        </div>
      </div>
    </section>
  );
}
