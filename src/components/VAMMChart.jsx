import React, { useState, useEffect } from "react";
import Chart from "react-apexcharts";
import { supabase } from "../creatclient";

const VAMMChart = ({ market = "H100-GPU-PERP" }) => {
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [priceChange, setPriceChange] = useState(null);
  const [priceChangePercent, setPriceChangePercent] = useState(null);
  const [hasEnoughData, setHasEnoughData] = useState(false);
  const [timeRange, setTimeRange] = useState("7d");

  const isPriceUp = priceChange !== null && priceChange >= 0;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let minutesAgo;
        if (timeRange === "max") minutesAgo = null; // No time filter for max
        else if (timeRange === "1m") minutesAgo = 30 * 24 * 60; // 30 days
        else if (timeRange === "7d") minutesAgo = 7 * 24 * 60;
        else minutesAgo = 7 * 24 * 60; // Default to 7d

        let query = supabase
          .from("vamm_price_history")
          .select("price, twap, timestamp")
          .eq("market", market)
          .order("timestamp", { ascending: true });

        // Only apply time filter if not "max"
        if (minutesAgo !== null) {
          const startTime = new Date(
            Date.now() - minutesAgo * 60 * 1000
          ).toISOString();
          query = query.gte("timestamp", startTime);
        }

        const { data, error } = await query;

        if (error) throw error;
        if (!data || data.length < 2) throw new Error("Not enough data");

        setHasEnoughData(true);

        const latestEntry = data[data.length - 1];
        const livePrice = parseFloat(latestEntry.price);
        setCurrentPrice(livePrice);

        const openingEntry = data[0];
        const openingPrice = parseFloat(openingEntry.price);
        const absoluteChange = livePrice - openingPrice;
        setPriceChange(absoluteChange);
        setPriceChangePercent(
          openingPrice !== 0 ? (absoluteChange / openingPrice) * 100 : 0
        );

        const candleData = convertToCandlesticks(data, timeRange);
        setChartData(candleData);
      } catch (error) {
        console.error("Error fetching vAMM data:", error.message);
        setCurrentPrice(null);
        setHasEnoughData(false);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const subscription = supabase
      .channel("vamm_price_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "vamm_price_history",
          filter: `market=eq.${market}`,
        },
        (payload) => setCurrentPrice(parseFloat(payload.new.price))
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [timeRange, market]);

  const convertToCandlesticks = (data, range) => {
    if (!data || data.length === 0) return [];
    let intervalSeconds;
    switch (range) {
      case "7d":
        intervalSeconds = 4 * 60 * 60;
        break;
      case "1m":
        intervalSeconds = 8 * 60 * 60;
        break; // 8 hour candles for 1 month
      case "max":
        intervalSeconds = 12 * 60 * 60;
        break; // 12 hour candles for all time
      default:
        intervalSeconds = 4 * 60 * 60;
    }

    const candles = [];
    let currentCandle = null;

    data.forEach((point) => {
      const timestamp = new Date(point.timestamp);
      const price = parseFloat(point.price);
      const intervalMs = intervalSeconds * 1000;
      const candleTime = new Date(
        Math.floor(timestamp.getTime() / intervalMs) * intervalMs
      );

      if (
        !currentCandle ||
        currentCandle.x.getTime() !== candleTime.getTime()
      ) {
        if (currentCandle) candles.push(currentCandle);
        currentCandle = { x: candleTime, y: [price, price, price, price] };
      } else {
        currentCandle.y[1] = Math.max(currentCandle.y[1], price);
        currentCandle.y[2] = Math.min(currentCandle.y[2], price);
        currentCandle.y[3] = price;
      }
    });

    if (currentCandle) candles.push(currentCandle);
    return candles;
  };

  const chartOptions = {
    chart: {
      type: "candlestick",
      height: "100%",
      fontFamily: "Inter, sans-serif",
      background: "transparent",
      toolbar: { show: false },
      zoom: { enabled: true },
      animations: { enabled: false },
    },
    theme: { mode: "dark" },
    plotOptions: {
      candlestick: {
        colors: { upward: "#22c55e", downward: "#ef4444" },
        wick: { useFillColor: true },
      },
    },
    grid: {
      show: true,
      borderColor: "#1e293b",
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: { top: 0, right: 0, bottom: 0, left: 10 },
    },
    xaxis: {
      type: "datetime",
      tooltip: { enabled: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { colors: "#94a3b8", fontSize: "11px" },
        format:
          timeRange === "max" || timeRange === "1m" ? "MMM dd" : "MMM dd HH:mm",
      },
    },
    yaxis: {
      opposite: true,
      labels: {
        style: { colors: "#94a3b8", fontSize: "11px" },
        formatter: (val) => `$${val.toFixed(2)}`,
      },
    },
    tooltip: {
      theme: "dark",
      style: { fontSize: "12px" },
      x: { format: "MMM dd, HH:mm" },
    },
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950/50">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-slate-800/50">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-sm font-medium text-slate-400">
              vAMM Mark Price
            </h2>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
              PERP
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {loading
                ? "..."
                : currentPrice !== null
                ? `$${currentPrice.toFixed(2)}`
                : "N/A"}
            </h1>
            {hasEnoughData && priceChange !== null && (
              <div
                className={`flex items-center text-xs font-medium ${
                  isPriceUp ? "text-green-400" : "text-red-400"
                }`}
              >
                <span>
                  {isPriceUp ? "+" : ""}
                  {priceChange.toFixed(2)}
                </span>
                <span className="ml-1">
                  ({isPriceUp ? "+" : ""}
                  {priceChangePercent.toFixed(2)}%)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Time Range Toggles */}
        <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800">
          {["7d", "1m", "max"].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-all ${
                timeRange === range
                  ? "bg-slate-700 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
              }`}
            >
              {range === "max" ? "Max" : range === "1m" ? "1M" : range}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex-1 min-h-0 w-full relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
            Loading vAMM Data...
          </div>
        ) : hasEnoughData ? (
          <Chart
            options={chartOptions}
            series={[{ name: "Price", data: chartData }]}
            type="candlestick"
            height="100%"
            width="100%"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs">
            Not enough vAMM data yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default VAMMChart;
