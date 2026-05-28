import React, { useState, useMemo } from "react";
import Chart from "react-apexcharts";
import { HiArrowTrendingUp, HiArrowTrendingDown } from "react-icons/hi2";

const PnLChart = ({ tradeHistory = [] }) => {
  const [timeRange, setTimeRange] = useState("all");

  // Filter trades that have P&L data (close trades)
  const pnlTrades = useMemo(() => {
    return tradeHistory
      .filter((trade) => trade.pnl !== null && trade.pnl !== undefined)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }, [tradeHistory]);

  // Filter by time range
  const filteredTrades = useMemo(() => {
    if (timeRange === "all") return pnlTrades;

    const now = new Date();
    const cutoff = new Date();

    if (timeRange === "24h") cutoff.setHours(now.getHours() - 24);
    else if (timeRange === "7d") cutoff.setDate(now.getDate() - 7);
    else if (timeRange === "30d") cutoff.setDate(now.getDate() - 30);

    return pnlTrades.filter((trade) => new Date(trade.created_at) >= cutoff);
  }, [pnlTrades, timeRange]);

  // Calculate cumulative P&L over time - include starting point at $0
  const chartData = useMemo(() => {
    if (filteredTrades.length === 0) return [];
    
    // Start with $0 point (before first trade)
    const firstTradeTime = new Date(filteredTrades[0].created_at).getTime();
    const dataPoints = [{ x: firstTradeTime - 60000, y: 0 }]; // 1 minute before first trade
    
    let cumulative = 0;
    filteredTrades.forEach((trade) => {
      const netPnL =
        parseFloat(trade.pnl || 0) +
        parseFloat(trade.funding_earned || 0) -
        parseFloat(trade.fees_paid || 0);
      cumulative += netPnL;
      dataPoints.push({
        x: new Date(trade.created_at).getTime(),
        y: parseFloat(cumulative.toFixed(2)),
      });
    });
    
    return dataPoints;
  }, [filteredTrades]);

  // Calculate stats
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return { totalPnL: 0, winCount: 0, lossCount: 0, winRate: 0 };
    }

    const totalPnL = chartData[chartData.length - 1]?.y || 0;
    const winCount = filteredTrades.filter(
      (t) =>
        parseFloat(t.pnl || 0) +
          parseFloat(t.funding_earned || 0) -
          parseFloat(t.fees_paid || 0) >
        0
    ).length;
    const lossCount = filteredTrades.filter(
      (t) =>
        parseFloat(t.pnl || 0) +
          parseFloat(t.funding_earned || 0) -
          parseFloat(t.fees_paid || 0) <
        0
    ).length;
    const total = winCount + lossCount;
    const winRate = total > 0 ? ((winCount / total) * 100).toFixed(0) : 0;

    return { totalPnL, winCount, lossCount, winRate };
  }, [chartData, filteredTrades]);

  const isProfitable = stats.totalPnL >= 0;
  const chartColor = isProfitable ? "#10b981" : "#ef4444";

  // Chart options - simplified for reliability
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
    stroke: {
      curve: "smooth",
      width: 2,
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [0, 100],
      },
    },
    grid: {
      show: true,
      borderColor: "rgba(255,255,255,0.06)",
      strokeDashArray: 4,
      padding: { left: 15, right: 10, top: 10, bottom: 0 },
    },
    xaxis: {
      type: "datetime",
      labels: {
        show: true,
        style: { colors: "#71717a", fontSize: "10px" },
      },
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
      y: {
        formatter: (val) => `$${val?.toFixed(2) || "0.00"}`,
      },
    },
    dataLabels: { enabled: false },
    markers: {
      size: 0,
      hover: { size: 0 },
    },
  };

  const series = [
    {
      name: "Cumulative P&L",
      data: chartData,
    },
  ];

  if (pnlTrades.length === 0) {
    return (
      <div className="bg-[#0A0A0A]/50 border border-zinc-800 rounded-xl p-6 backdrop-blur-sm">
        <h3 className="text-sm font-semibold text-white mb-4">
          P&L Performance
        </h3>
        <div className="h-[180px] flex items-center justify-center text-zinc-500 text-sm">
          No closed trades yet. Close a position to see your P&L chart.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0A0A0A]/50 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-white">P&L Performance</h3>
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
              isProfitable
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            {isProfitable ? (
              <HiArrowTrendingUp className="w-3 h-3" />
            ) : (
              <HiArrowTrendingDown className="w-3 h-3" />
            )}
            <span>
              {isProfitable ? "+" : ""}${stats.totalPnL.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-1 bg-zinc-900/50 rounded-lg p-0.5">
          {["24h", "7d", "30d", "all"].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                timeRange === range
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
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
