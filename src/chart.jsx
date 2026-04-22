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
  
  // Persist time range selection to localStorage
  const [timeRange, setTimeRange] = useState(() => {
    const saved = localStorage.getItem("chart_time_range");
    return saved || "3d";
  });

  // Save time range to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("chart_time_range", timeRange);
  }, [timeRange]);

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
    "H100-non-HyperScalers-PERP": {
      displayName: "Neocloud",
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
    "H200-PERP": {
      displayName: "H200 GPU",
      tableName: "h200_index_prices",
      fallbackTable: null,
      priceField: "index_price", // H200 uses index_price field (from push_to_supabase.py)
    },
    // Provider-specific B200 markets - query b200_provider_prices with provider filter
    "ORACLE-B200-PERP": {
      displayName: "Oracle B200",
      tableName: "b200_provider_prices",
      fallbackTable: null,
      priceField: "effective_price",
      providerFilter: "Oracle", // Filter by provider_name
    },
    "AWS-B200-PERP": {
      displayName: "AWS B200",
      tableName: "b200_provider_prices",
      fallbackTable: null,
      priceField: "effective_price",
      providerFilter: "AWS", // Filter by provider_name
    },
    "COREWEAVE-B200-PERP": {
      displayName: "CoreWeave B200",
      tableName: "b200_provider_prices",
      fallbackTable: null,
      priceField: "effective_price",
      providerFilter: "CoreWeave", // Filter by provider_name
    },
    "GCP-B200-PERP": {
      displayName: "GCP B200",
      tableName: "b200_provider_prices",
      fallbackTable: null,
      priceField: "effective_price",
      providerFilter: "Google Cloud", // Filter by provider_name (stored as "Google Cloud" in DB)
    },
    // Provider-specific H200 markets - query h200_provider_prices with provider filter
    "ORACLE-H200-PERP": {
      displayName: "Oracle H200",
      tableName: "h200_provider_prices",
      fallbackTable: null,
      priceField: "effective_price",
      providerFilter: "Oracle", // Filter by provider_name
    },
    "AWS-H200-PERP": {
      displayName: "AWS H200",
      tableName: "h200_provider_prices",
      fallbackTable: null,
      priceField: "effective_price",
      providerFilter: "AWS", // Filter by provider_name
    },
    "COREWEAVE-H200-PERP": {
      displayName: "CoreWeave H200",
      tableName: "h200_provider_prices",
      fallbackTable: null,
      priceField: "effective_price",
      providerFilter: "CoreWeave", // Filter by provider_name
    },
    "GCP-H200-PERP": {
      displayName: "GCP H200",
      tableName: "h200_provider_prices",
      fallbackTable: null,
      priceField: "effective_price",
      providerFilter: "Google Cloud", // Filter by provider_name (stored as "Google Cloud" in DB)
    },
    "AZURE-H200-PERP": {
      displayName: "Azure H200",
      tableName: "h200_provider_prices",
      fallbackTable: null,
      priceField: "effective_price",
      providerFilter: "Azure", // Filter by provider_name
    },
    // Provider-specific H100 markets - query h100_hyperscaler_prices with provider filter
    "AWS-H100-PERP": {
      displayName: "AWS H100",
      tableName: "h100_hyperscaler_prices",
      fallbackTable: null,
      priceField: "effective_price",
      providerFilter: "Amazon Web Services", // Filter by provider_name as stored in DB
    },
    "AZURE-H100-PERP": {
      displayName: "Azure H100",
      tableName: "h100_hyperscaler_prices",
      fallbackTable: null,
      priceField: "effective_price",
      providerFilter: "Microsoft Azure", // Filter by provider_name as stored in DB
    },
    "GCP-H100-PERP": {
      displayName: "GCP H100",
      tableName: "h100_hyperscaler_prices",
      fallbackTable: null,
      priceField: "effective_price",
      providerFilter: "Google Cloud", // Filter by provider_name (stored as "Google Cloud" in DB)
    },
    // A100 market
    "A100-PERP": {
      displayName: "A100 GPU",
      tableName: "a100_index_prices",
      fallbackTable: null,
      priceField: "index_price",
      timestampField: "recorded_at",
    },
    // T4 market
    "T4-PERP": {
      displayName: "T4 GPU",
      tableName: "t4_index_prices",
      fallbackTable: null,
      priceField: "index_price",
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
          else if (timeRange === "3d") hoursAgo = 3 * 24;
          else hoursAgo = 24;
        }

        // Strategy 1: Try market-specific table (primary source)
        const timestampField = config.timestampField || "timestamp";
        let query = supabase
          .from(config.tableName)
          .select(`${config.priceField}, ${timestampField}`);

        // Apply provider filter for provider-specific markets
        if (config.providerFilter) {
          query = query.eq("provider_name", config.providerFilter);
        }

        if (hoursAgo !== null) {
          const startTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
          query = query.gte(timestampField, startTime);
        }

        // Order DESC so Supabase's row cap always returns the most recent rows,
        // then reverse client-side to restore chronological order for the chart.
        const rowLimit = timeRange === "max" ? 10000 :
                         timeRange === "15d" ? 10000 :
                         timeRange === "5d"  ? 8000  :
                         timeRange === "3d"  ? 5000  : 2000;
        const result = await query.order(timestampField, { ascending: false }).limit(rowLimit);

        if (!result.error && result.data && result.data.length >= 2) {
          // Transform data to standard format (normalize price field and timestamp field)
          // Reverse to restore ascending (chronological) order for the chart.
          data = result.data.reverse().map(record => ({
            price: record[config.priceField] || record.price,
            timestamp: record[timestampField] || record.timestamp
          }));
          console.log(`Loaded ${data.length} records from ${config.tableName}${config.providerFilter ? ` (provider: ${config.providerFilter})` : ''}`);
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

  const accentColor    = isPriceUp ? "#00d4aa" : "#f23645";
  const accentColorDim = isPriceUp ? "rgba(0,212,170,0.12)" : "rgba(242,54,69,0.12)";
  const accentBorder   = isPriceUp ? "rgba(0,212,170,0.22)" : "rgba(242,54,69,0.22)";

  const chartOptions = {
    chart: {
      type: "area",
      height: "100%",
      fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
      background: "transparent",
      toolbar: { show: false },
      zoom: { enabled: false },
      selection: { enabled: false },
      animations: { enabled: true, easing: "easeinout", speed: 500 },
    },
    stroke: {
      curve: "straight",
      width: 1.8,
      colors: [accentColor],
      lineCap: "round",
    },
    markers: {
      size: 0,
      hover: {
        size: 4,
        fillColor: accentColor,
        strokeColor: "#0a0a12",
        strokeWidth: 2,
      },
    },
    fill: {
      type: "gradient",
      gradient: {
        type: "vertical",
        shadeIntensity: 0,
        opacityFrom: 0.13,
        opacityTo: 0,
        stops: [0, 75, 100],
        colorStops: [
          { offset: 0,   color: accentColor, opacity: 0.13 },
          { offset: 75,  color: accentColor, opacity: 0.02 },
          { offset: 100, color: accentColor, opacity: 0 },
        ],
      },
    },
    dataLabels: { enabled: false },
    grid: {
      show: false,
      padding: { top: 20, right: 2, bottom: 6, left: 8 },
    },
    xaxis: {
      type: "datetime",
      min: chartData.length > 0 ? chartData[0].x.getTime() : undefined,
      max: chartData.length > 0 ? chartData[chartData.length - 1].x.getTime() : undefined,
      tickAmount: timeRange === "24h" ? 6 : timeRange === "3d" ? 6 : timeRange === "5d" ? 5 : timeRange === "15d" ? 5 : 6,
      tooltip: { enabled: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
      crosshairs: {
        show: true,
        width: 1,
        position: "back",
        opacity: 1,
        stroke: { color: "rgba(255,255,255,0.1)", width: 1, dashArray: 4 },
        fill: { type: "solid", color: "transparent" },
        dropShadow: { enabled: false },
      },
      labels: {
        show: true,
        style: {
          colors: "#71717a",
          fontSize: "10px",
          fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
          fontWeight: 400,
        },
        format: timeRange === "24h" ? "HH:mm" : "MMM dd",
        offsetY: 4,
        datetimeUTC: false,
        hideOverlappingLabels: true,
        rotate: 0,
      },
    },
    yaxis: {
      opposite: true,
      tickAmount: 4,
      min: (min) => min * 0.998,
      crosshairs: {
        show: true,
        position: "back",
        stroke: { color: "rgba(255,255,255,0.07)", width: 1, dashArray: 4 },
      },
      labels: {
        show: true,
        style: {
          colors: "#71717a",
          fontSize: "10px",
          fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
          fontWeight: 400,
        },
        formatter: (val) => `$${val.toFixed(2)}`,
        offsetX: -4,
      },
    },
    annotations: {
      yaxis: currentPrice
        ? [{
            y: currentPrice,
            borderColor: accentColor,
            borderWidth: 1,
            strokeDashArray: 3,
            opacity: 0.45,
            label: { show: false },
          }]
        : [],
    },
    tooltip: {
      shared: false,
      intersect: false,
      followCursor: false,
      custom: function ({ series, seriesIndex, dataPointIndex, w }) {
        const value = series[seriesIndex][dataPointIndex];
        const timestamp = w.globals.seriesX[seriesIndex][dataPointIndex];
        const date = new Date(timestamp);
        const formattedDate = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        const formattedTime = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
        const openPrice = chartData.length > 0 ? chartData[0].y : null;
        const delta    = openPrice !== null ? value - openPrice : null;
        const deltaPct = openPrice !== null && openPrice !== 0 ? (delta / openPrice) * 100 : null;
        const isUp     = delta !== null && delta >= 0;
        const tc       = isUp ? "#00d4aa" : "#f23645";
        const sign     = isUp ? "+" : "";
        return `
          <div style="
            background: #0c0c14;
            border: 1px solid rgba(255,255,255,0.09);
            border-radius: 8px;
            padding: 12px 14px;
            min-width: 190px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.95), 0 0 0 1px rgba(255,255,255,0.025);
            font-family: 'IBM Plex Mono', ui-monospace, monospace;
          ">
            <div style="font-size: 9px; color: #3f3f46; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 9px;">
              ${formattedDate}&nbsp;&nbsp;${formattedTime}
            </div>
            <div style="font-size: 23px; font-weight: 700; color: #fff; letter-spacing: -0.04em; line-height: 1; margin-bottom: 9px; font-variant-numeric: tabular-nums;">
              $${value.toFixed(3)}
            </div>
            ${delta !== null ? `
            <div style="
              display: inline-flex; align-items: center;
              background: ${isUp ? "rgba(0,212,170,0.08)" : "rgba(242,54,69,0.08)"};
              border: 1px solid ${isUp ? "rgba(0,212,170,0.18)" : "rgba(242,54,69,0.18)"};
              border-radius: 4px; padding: 2px 8px;
            ">
              <span style="font-size: 10px; font-weight: 600; color: ${tc}; font-variant-numeric: tabular-nums;">
                ${sign}${delta.toFixed(3)}&nbsp;&nbsp;${sign}${deltaPct.toFixed(2)}%
              </span>
            </div>` : ""}
          </div>
        `;
      },
    },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>

      {/* ── Header ── */}
      <div style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        padding: "16px 20px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        gap: "12px",
        flexWrap: "wrap",
      }}>
        {/* Left block */}
        <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
          {/* Symbol row */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "10px", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, letterSpacing: "0.12em", color: "#a1a1aa", textTransform: "uppercase" }}>
              {config.displayName}
            </span>
            <span style={{ fontSize: "10px", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.08em", color: "#3f3f46", textTransform: "uppercase" }}>
              · Perp Index
            </span>
            {/* LIVE badge */}
            <span style={{
              display: "inline-flex", alignItems: "center", gap: "4px",
              background: "rgba(0,212,170,0.07)", border: "1px solid rgba(0,212,170,0.18)",
              borderRadius: "4px", padding: "1px 7px",
            }}>
              <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#00d4aa", boxShadow: "0 0 6px rgba(0,212,170,0.8)", display: "inline-block" }} />
              <span style={{ fontSize: "9px", color: "#00d4aa", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.1em", fontWeight: 600 }}>LIVE</span>
            </span>
          </div>

          {/* Price row */}
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
            <span style={{
              fontSize: "30px", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700,
              color: loading ? "#3f3f46" : "#ffffff", letterSpacing: "-0.04em", lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}>
              {loading
                ? "—"
                : typeof currentPrice === "number"
                  ? `$${currentPrice.toFixed(2)}`
                  : "N/A"}
            </span>
            {hasEnoughData && priceChange !== null && (
              <span style={{
                display: "inline-flex", alignItems: "center",
                background: accentColorDim, border: `1px solid ${accentBorder}`,
                borderRadius: "5px", padding: "3px 9px",
              }}>
                <span style={{
                  fontSize: "11px", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600,
                  color: accentColor, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em",
                }}>
                  {isPriceUp ? "▲" : "▼"}&nbsp;
                  {isPriceUp ? "+" : ""}{priceChange.toFixed(3)}&nbsp;&nbsp;
                  <span style={{ opacity: 0.7, fontWeight: 500 }}>
                    ({isPriceUp ? "+" : ""}{priceChangePercent.toFixed(2)}%)
                  </span>
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Right: time range pill selector */}
        <div style={{
          display: "flex", alignItems: "center", gap: "2px",
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "8px", padding: "3px",
        }}>
          {["24h", "3d", "5d", "15d", "max"].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              style={{
                padding: "5px 11px", fontSize: "10px",
                fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600,
                letterSpacing: "0.08em", textTransform: "uppercase",
                borderRadius: "5px", border: "none", cursor: "pointer",
                transition: "all 0.15s ease",
                background: timeRange === range ? "rgba(255,255,255,0.09)" : "transparent",
                color: timeRange === range ? "#e4e4e7" : "#52525b",
                outline: timeRange === range ? "1px solid rgba(255,255,255,0.1)" : "none",
              }}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* ── Chart area ── */}
      <div style={{ flex: 1, minHeight: 0, width: "100%", position: "relative" }}>
        {loading ? (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "18px", height: "18px", borderRadius: "50%",
                border: "1.5px solid rgba(255,255,255,0.06)", borderTopColor: "rgba(255,255,255,0.3)",
                animation: "chart-spin 0.8s linear infinite",
              }} />
              <span style={{ fontSize: "9px", fontFamily: "'IBM Plex Mono', monospace", color: "#3f3f46", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                Loading
              </span>
            </div>
          </div>
        ) : hasEnoughData ? (
          <Chart
            options={chartOptions}
            series={[{ name: "Index Price", data: chartData }]}
            type="area"
            height="100%"
            width="100%"
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <span style={{ fontSize: "9px", fontFamily: "'IBM Plex Mono', monospace", color: "#3f3f46", letterSpacing: "0.15em", textTransform: "uppercase" }}>
              No data for selected range
            </span>
          </div>
        )}
        <style>{`@keyframes chart-spin { to { transform: rotate(360deg); } }`}</style>
      </div>

    </div>
  );
};

export default PriceIndexChart;


