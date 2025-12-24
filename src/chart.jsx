import React, { useState, useEffect, useRef } from "react";
import Chart from "react-apexcharts";
import { supabase } from "./creatclient";

const PriceIndexChart = ({ market = "H100-PERP", initialPrice = null }) => {
  const [loading, setLoading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState(initialPrice);
  const [priceChange, setPriceChange] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [hasEnoughData, setHasEnoughData] = useState(false);
  const [priceChangePercent, setPriceChangePercent] = useState(null);
  const [timeRange, setTimeRange] = useState("24h");

  const isPriceUp = priceChange !== null && priceChange >= 0;

  // Update current price when initialPrice changes (e.g. from parent real-time hook)
  useEffect(() => {
    if (initialPrice !== null && !hasEnoughData) {
      setCurrentPrice(initialPrice);
    }
  }, [initialPrice, hasEnoughData]);

  // Market configuration: display names and database tables
  const marketConfig = {
    "H100-PERP": {
      displayName: "H100 GPU",
      tableName: "price_data",  // Existing H100 table
      fallbackTable: null,
      priceField: "price", // Field name for price in the table
    },
    "H100-HyperScalers-PERP": {
      displayName: "H100 HyperScalers",
      tableName: "h100_hyperscalers_perp_prices",
      fallbackTable: null,
      priceField: "price",
    },
    "H100-non-HyperScalers-PERP": {
      displayName: "H100 non-HyperScalers",
      tableName: "h100_non_hyperscalers_perp_prices",
      fallbackTable: null,
      priceField: "price",
    },
    "B200-PERP": {
      displayName: "B200 GPU",
      tableName: "b200_index_prices",
      fallbackTable: null,
      priceField: "index_price", // B200 uses index_price field
    },
  };
  
  const config = marketConfig[market] || {
    displayName: market,
    tableName: "price_data",
    fallbackTable: null,
    priceField: "price",
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let data = null;
        let error = null;

        // Calculate time range
        let hoursAgo = null;
        if (timeRange !== "max") {
          if (timeRange === "15d") hoursAgo = 15 * 24;
          else if (timeRange === "5d") hoursAgo = 5 * 24;
          else hoursAgo = 24;
        }

        // Strategy 1: Try market-specific table (primary source)
        let query = supabase
          .from(config.tableName)
          .select(`${config.priceField}, timestamp`);

        if (hoursAgo !== null) {
          const startTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
          query = query.gte("timestamp", startTime);
        }

        const result = await query.order("timestamp", { ascending: true });

        if (!result.error && result.data && result.data.length >= 2) {
          // Transform data to standard format (normalize price field)
          data = result.data.map(record => ({
            price: record[config.priceField] || record.price,
            timestamp: record.timestamp
          }));
          console.log(`Loaded ${data.length} records from ${config.tableName}`);
        } else if (result.error) {
          error = result.error;
        }

        // Strategy 2: Try fallback table (for backward compatibility)
        if ((!data || data.length < 2) && config.fallbackTable) {
            // ... (fallback logic unchanged, implied)
            // But since I can't put "..." in replacementContent, I need to include it or construct the replacement block carefully.
            // Since the user didn't ask to change the fetching logic itself, just the error handling.
            
            // Re-pasting the fallback logic to be safe:
             console.log(`No data in ${config.tableName}, trying fallback table ${config.fallbackTable}...`);

          let fallbackQuery = supabase
            .from(config.fallbackTable)
            .select("price, timestamp");

          if (hoursAgo !== null) {
            const startTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
            fallbackQuery = fallbackQuery.gte("timestamp", startTime);
          }

          const fallbackResult = await fallbackQuery.order("timestamp", { ascending: true });

          if (!fallbackResult.error && fallbackResult.data && fallbackResult.data.length >= 2) {
            data = fallbackResult.data;
            console.log(`Loaded ${data.length} records from fallback table ${config.fallbackTable}`);
          } else if (fallbackResult.error) {
            error = fallbackResult.error;
          }
        }

        if (error) throw error;
        if (!data || data.length < 2) throw new Error("Not enough historical data.");

        setHasEnoughData(true);

        const latestEntry = data[data.length - 1];
        const livePrice = parseFloat(latestEntry.price);
        setCurrentPrice(livePrice);

        const openingEntry = data[0];
        const openingPrice = parseFloat(openingEntry.price);
        const absoluteChange = livePrice - openingPrice;
        setPriceChange(absoluteChange);
        setPriceChangePercent(openingPrice !== 0 ? (absoluteChange / openingPrice) * 100 : 0);

        const formattedChartData = data.map((d) => ({
          x: new Date(d.timestamp),
          y: parseFloat(d.price),
        }));
        setChartData(formattedChartData);
      } catch (error) {
        console.error("Error fetching oracle price data:", error.message);
        // Fallback
        if (initialPrice !== null) {
            setCurrentPrice(initialPrice);
        } else {
            setCurrentPrice(null);
        }
        setHasEnoughData(false);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Subscribe to real-time updates for market-specific table
    const subscription = supabase
      .channel(`oracle_price_${market}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: config.tableName,
        },
        (payload) => {
          const priceValue = payload.new[config.priceField] || payload.new.price;
          if (priceValue) {
            setCurrentPrice(parseFloat(priceValue));
          }
        }
      );

    // Add fallback table subscription if exists
    if (config.fallbackTable) {
      subscription.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: config.fallbackTable,
        },
        (payload) => {
          const priceValue = payload.new[config.priceField] || payload.new.price;
          if (priceValue) {
            setCurrentPrice(parseFloat(priceValue));
          }
        }
      );
    }

    subscription.subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [timeRange, market, config.tableName, config.fallbackTable]);

  const chartOptions = {
    chart: {
      type: "area",
      height: "100%",
      fontFamily: "Inter, sans-serif",
      background: "transparent",
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: true, easing: "easeinout", speed: 800 },
    },
    theme: { mode: "dark" },
    stroke: {
      curve: "smooth",
      width: 2,
      colors: ["#3b82f6"], // blue-500
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.05,
        stops: [0, 100],
        colorStops: [
          { offset: 0, color: "#3b82f6", opacity: 0.4 },
          { offset: 100, color: "#3b82f6", opacity: 0 },
        ],
      },
    },
    dataLabels: { enabled: false },
    grid: {
      show: true,
      borderColor: "#1e293b", // slate-800
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
        style: { colors: "#94a3b8", fontSize: "11px" }, // slate-400
        format: timeRange === "24h" ? "HH:mm" : "MMM dd",
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
      y: { formatter: (val) => `$${val.toFixed(3)}` },
      marker: { show: false },
    },
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950/50">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-slate-800/50">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-sm font-medium text-slate-400">{config.displayName} Index Price</h2>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">ORACLE</span>
          </div>
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {loading ? "..." : typeof currentPrice === "number" ? `$${currentPrice.toFixed(2)}` : "N/A"}
            </h1>
            {hasEnoughData && priceChange !== null && (
              <div className={`flex items-center text-xs font-medium ${isPriceUp ? "text-green-400" : "text-red-400"}`}>
                <span>{isPriceUp ? "+" : ""}{priceChange.toFixed(2)}</span>
                <span className="ml-1">({isPriceUp ? "+" : ""}{priceChangePercent.toFixed(2)}%)</span>
              </div>
            )}
          </div>
        </div>

        {/* Time Range Toggles */}
        <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800">
          {["24h", "5d", "15d", "max"].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-all ${
                timeRange === range
                  ? "bg-slate-700 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex-1 min-h-0 w-full relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
            Loading Chart Data...
          </div>
        ) : hasEnoughData ? (
          <Chart options={chartOptions} series={[{ name: "Price", data: chartData }]} type="area" height="100%" width="100%" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs">
            Not enough data for this time range.
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceIndexChart;
