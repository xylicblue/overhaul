import React, { useState, useMemo } from "react";
import Chart from "react-apexcharts";
import { HiArrowTrendingUp, HiArrowTrendingDown } from "react-icons/hi2";
import { PNL_TYPES_SET } from "../services/canonicalPnl";

const PnLChart = ({ canonicalEvents = [] }) => {
  const [timeRange, setTimeRange] = useState("all");

  // Filter to PnL-impacting rows, sorted ascending by chain order for cumulative calc
  const pnlEvents = useMemo(() => {
    return canonicalEvents
      .filter(row => PNL_TYPES_SET.has(row.accounting_type))
      .sort((a, b) => {
        if (a.block_number !== b.block_number) return a.block_number - b.block_number;
        if (a.transaction_index !== b.transaction_index) return a.transaction_index - b.transaction_index;
        return a.primary_log_index - b.primary_log_index;
      });
  }, [canonicalEvents]);

  const filteredEvents = useMemo(() => {
    if (timeRange === "all") return pnlEvents;
    const now    = new Date();
    const cutoff = new Date();
    if (timeRange === "24h") cutoff.setHours(now.getHours() - 24);
    else if (timeRange === "7d")  cutoff.setDate(now.getDate() - 7);
    else if (timeRange === "30d") cutoff.setDate(now.getDate() - 30);
    return pnlEvents.filter(row => new Date(row.block_timestamp) >= cutoff);
  }, [pnlEvents, timeRange]);

  // Build cumulative P&L data points using pre-computed net_pnl
  const chartData = useMemo(() => {
    if (filteredEvents.length === 0) return [];
    const firstTime = new Date(filteredEvents[0].block_timestamp).getTime();
    const points    = [{ x: firstTime - 60000, y: 0 }];
    let cumulative  = 0;
    filteredEvents.forEach(row => {
      cumulative += Number(row.net_pnl || 0);
      points.push({
        x: new Date(row.block_timestamp).getTime(),
        y: parseFloat(cumulative.toFixed(4)),
      });
    });
    return points;
  }, [filteredEvents]);

  const stats = useMemo(() => {
    if (chartData.length === 0) return { totalPnL: 0, winCount: 0, lossCount: 0, winRate: 0 };
    const totalPnL  = chartData[chartData.length - 1]?.y || 0;
    const winCount  = filteredEvents.filter(r => Number(r.net_pnl || 0) > 0).length;
    const lossCount = filteredEvents.filter(r => Number(r.net_pnl || 0) < 0).length;
    const total     = winCount + lossCount;
    return { totalPnL, winCount, lossCount, winRate: total > 0 ? ((winCount / total) * 100).toFixed(0) : 0 };
  }, [chartData, filteredEvents]);

  const isProfitable = stats.totalPnL >= 0;
  const chartColor   = isProfitable ? "#10b981" : "#ef4444";

  const options = {
    chart: {
      type: "area",
      height: 180,
      toolbar: { show: false },
      zoom: { enabled: false },
      background: "transparent",
      fontFamily: "inherit",
    },
    colors: [chartColor],
    stroke: { curve: "smooth", width: 2 },
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.05, stops: [0, 100] },
    },
    grid: {
      show: true,
      borderColor: "rgba(255,255,255,0.06)",
      strokeDashArray: 4,
      padding: { left: 15, right: 10, top: 10, bottom: 0 },
    },
    xaxis: {
      type: "datetime",
      labels: { show: true, style: { colors: "#71717a", fontSize: "10px" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        show: true,
        style: { colors: "#71717a", fontSize: "10px" },
        formatter: (val) => `$${val.toFixed(0)}`,
        offsetX: 0,
      },
    },
    tooltip: {
      enabled: true,
      theme: "dark",
      x: { format: "MMM dd, HH:mm" },
      y: { formatter: (val) => `$${val?.toFixed(2) || "0.00"}` },
    },
    dataLabels: { enabled: false },
    markers: { size: 0, hover: { size: 0 } },
  };

  const series = [{ name: "Cumulative P&L", data: chartData }];

  if (pnlEvents.length === 0) {
    return (
      <div className="bg-[#0A0A0A]/50 border border-zinc-800 rounded-xl p-6 backdrop-blur-sm">
        <h3 className="text-sm font-semibold text-white mb-4">P&L Performance</h3>
        <div className="h-[180px] flex items-center justify-center text-zinc-500 text-sm">
          No closed positions yet. P&L chart appears after your first close is indexed.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0A0A0A]/50 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-white">P&L Performance</h3>
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
            isProfitable ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
          }`}>
            {isProfitable ? <HiArrowTrendingUp className="w-3 h-3" /> : <HiArrowTrendingDown className="w-3 h-3" />}
            <span>{isProfitable ? "+" : ""}${stats.totalPnL.toFixed(2)}</span>
          </div>
        </div>
        <div className="flex gap-1 bg-zinc-900/50 rounded-lg p-0.5">
          {["24h", "7d", "30d", "all"].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                timeRange === range ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {chartData.length > 0 ? (
        <div className="-mx-2">
          <Chart options={options} series={series} type="area" height={180} />
        </div>
      ) : (
        <div className="h-[180px] flex items-center justify-center text-zinc-500 text-sm">
          No trades in selected time period
        </div>
      )}
    </div>
  );
};

export default PnLChart;
