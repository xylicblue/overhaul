import React, { useState, useEffect, useRef } from "react";
import Chart from "react-apexcharts";
import { supabase } from "../creatclient";
import {
  TrendingUp,
  Minus,
  Square,
  Type,
  Eraser,
  MousePointer,
  Crosshair,
  Ruler,
  Circle,
  Triangle,
  ArrowUpRight,
  Trash2,
  ChevronDown,
  BarChart2,
  Activity,
  LineChart,
  CandlestickChart,
  AreaChart,
  Magnet,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  PenTool,
  ChevronRight,
  MessageSquare,
  Smile,
  Calendar,
  TrendingDown,
} from "lucide-react";

const AdvancedChart = ({ market = "H100-GPU-PERP" }) => {
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [priceChange, setPriceChange] = useState(null);
  const [priceChangePercent, setPriceChangePercent] = useState(null);
  const [hasEnoughData, setHasEnoughData] = useState(false);
  const [timeRange, setTimeRange] = useState("7d");
  const [chartType, setChartType] = useState("candlestick");
  const [selectedTool, setSelectedTool] = useState("cursor");
  const [showChartTypeMenu, setShowChartTypeMenu] = useState(false);
  const [drawings, setDrawings] = useState([]); // Stores annotations
  const [magnetMode, setMagnetMode] = useState(false);
  const [lockedDrawings, setLockedDrawings] = useState(false);
  const [showDrawings, setShowDrawings] = useState(true);
  const [expandedToolGroup, setExpandedToolGroup] = useState(null);
  const [submenuPosition, setSubmenuPosition] = useState({ top: 0, left: 0 });
  
  // For multi-click tools (trendline, fib, etc.)
  const [pendingDrawing, setPendingDrawing] = useState(null); // { type, startX, startY }
  const [textInput, setTextInput] = useState(""); // For text annotations
  const [showTextModal, setShowTextModal] = useState(false);
  const [pendingTextPosition, setPendingTextPosition] = useState(null);

  const isPriceUp = priceChange !== null && priceChange >= 0;

  // --- Tool Definitions ---
  const toolGroups = [
    {
      id: "cursor",
      name: "Cursor",
      icon: MousePointer,
      tools: [
        { id: "cursor", name: "Cursor", icon: MousePointer },
        { id: "crosshair", name: "Crosshair", icon: Crosshair },
        { id: "eraser", name: "Eraser", icon: Eraser },
      ],
    },
    {
      id: "trendlines",
      name: "Trend Lines",
      icon: TrendingUp,
      tools: [
        { id: "trendline", name: "Trend Line", icon: TrendingUp },
        { id: "ray", name: "Ray", icon: ArrowUpRight },
        { id: "info-line", name: "Info Line", icon: Activity },
        { id: "extended-line", name: "Extended Line", icon: Minus },
        { id: "horizontal", name: "Horizontal Line", icon: Minus },
        { id: "vertical", name: "Vertical Line", icon: Minus, rotate: true },
      ],
    },
    {
      id: "gann-fib",
      name: "Gann & Fibonacci",
      icon: Activity,
      tools: [
        { id: "fib-retracement", name: "Fib Retracement", icon: BarChart2 },
        {
          id: "trend-fib-ext",
          name: "Trend-Based Fib Extension",
          icon: TrendingUp,
        },
        { id: "pitchfork", name: "Pitchfork", icon: Activity },
      ],
    },
    {
      id: "shapes",
      name: "Geometric Shapes",
      icon: Square,
      tools: [
        { id: "brush", name: "Brush", icon: PenTool },
        { id: "highlighter", name: "Highlighter", icon: PenTool },
        { id: "rectangle", name: "Rectangle", icon: Square },
        { id: "circle", name: "Circle", icon: Circle },
      ],
    },
    {
      id: "annotation",
      name: "Annotation",
      icon: Type,
      tools: [
        { id: "text", name: "Text", icon: Type },
        { id: "note", name: "Note", icon: Type },
        { id: "callout", name: "Callout", icon: MessageSquare },
      ],
    },
    {
      id: "patterns",
      name: "Patterns",
      icon: Activity,
      tools: [{ id: "xabcd", name: "XABCD Pattern", icon: Activity }],
    },
    {
      id: "prediction",
      name: "Prediction",
      icon: Smile,
      tools: [
        { id: "long-position", name: "Long Position", icon: TrendingUp },
        { id: "short-position", name: "Short Position", icon: TrendingDown },
        { id: "date-range", name: "Date Range", icon: Calendar },
        { id: "price-range", name: "Price Range", icon: Ruler },
      ],
    },
    {
      id: "utils",
      name: "Utilities",
      icon: Trash2,
      tools: [
        { id: "point", name: "Point", icon: Circle },
        { id: "clear", name: "Clear All", icon: Trash2 },
      ],
    },
  ];

  const chartTypes = [
    { id: "candlestick", name: "Candles", icon: CandlestickChart },
    { id: "line", name: "Line", icon: LineChart },
    { id: "area", name: "Area", icon: AreaChart },
    { id: "bar", name: "Bars", icon: BarChart2 },
  ];

  // --- Data Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let minutesAgo;
        if (timeRange === "max") minutesAgo = null;
        else if (timeRange === "1m") minutesAgo = 30 * 24 * 60;
        else if (timeRange === "7d") minutesAgo = 7 * 24 * 60;
        else minutesAgo = 7 * 24 * 60;

        let query = supabase
          .from("vamm_price_history")
          .select("price, twap, timestamp")
          .eq("market", market)
          .order("timestamp", { ascending: true });

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
    // Adjust intervals based on range for better visualization
    switch (range) {
      case "7d":
        intervalSeconds = 4 * 60 * 60;
        break;
      case "1m":
        intervalSeconds = 12 * 60 * 60;
        break;
      case "max":
        intervalSeconds = 24 * 60 * 60;
        break;
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
        currentCandle.y[1] = Math.max(currentCandle.y[1], price); // High
        currentCandle.y[2] = Math.min(currentCandle.y[2], price); // Low
        currentCandle.y[3] = price; // Close
      }
    });

    if (currentCandle) candles.push(currentCandle);
    return candles;
  };

  // --- Chart Click Handler (For Tools) ---
  const handleChartClick = (event, chartContext, config) => {
    if (lockedDrawings) return;

    const dataPointIndex = config.dataPointIndex;

    if (dataPointIndex >= 0 && chartData[dataPointIndex]) {
      const point = chartData[dataPointIndex];
      const price = point.y[3]; // Close price
      const time = point.x.getTime();

      // Single-click tools
      if (selectedTool === "horizontal") {
        setDrawings((prev) => [...prev, { type: "horizontal", y: price, color: "#3b82f6" }]);
        setSelectedTool("cursor");
      } else if (selectedTool === "vertical") {
        setDrawings((prev) => [...prev, { type: "vertical", x: time, color: "#8b5cf6" }]);
        setSelectedTool("cursor");
      } else if (selectedTool === "point") {
        setDrawings((prev) => [...prev, { type: "point", x: time, y: price }]);
        setSelectedTool("cursor");
      } else if (selectedTool === "text") {
        // Open text input modal
        setPendingTextPosition({ x: time, y: price });
        setShowTextModal(true);
      } else if (selectedTool === "long-position") {
        // Add a long position marker (green arrow up)
        setDrawings((prev) => [...prev, { type: "long", x: time, y: price }]);
        setSelectedTool("cursor");
      } else if (selectedTool === "short-position") {
        // Add a short position marker (red arrow down)
        setDrawings((prev) => [...prev, { type: "short", x: time, y: price }]);
        setSelectedTool("cursor");
      } else if (selectedTool === "eraser") {
        // Remove the nearest drawing
        if (drawings.length > 0) {
          // Find and remove the closest drawing to this click
          const threshold = 5; // price threshold for horizontal, time for vertical
          let indexToRemove = -1;
          let minDistance = Infinity;
          
          drawings.forEach((d, idx) => {
            if (d.type === "horizontal") {
              const dist = Math.abs(d.y - price);
              if (dist < minDistance) {
                minDistance = dist;
                indexToRemove = idx;
              }
            } else if (d.type === "vertical") {
              const dist = Math.abs(d.x - time);
              if (dist < minDistance) {
                minDistance = dist;
                indexToRemove = idx;
              }
            } else if (d.type === "point" || d.type === "text" || d.type === "long" || d.type === "short") {
              const dist = Math.abs(d.y - price) + Math.abs(d.x - time) / 100000;
              if (dist < minDistance) {
                minDistance = dist;
                indexToRemove = idx;
              }
            } else if (d.type === "trendline" || d.type === "ray" || d.type === "fib-retracement" || d.type === "rectangle") {
              // For multi-point drawings, check proximity to either endpoint
              const dist1 = Math.abs(d.startY - price);
              const dist2 = Math.abs(d.endY - price);
              const dist = Math.min(dist1, dist2);
              if (dist < minDistance) {
                minDistance = dist;
                indexToRemove = idx;
              }
            }
          });
          
          if (indexToRemove >= 0) {
            setDrawings((prev) => prev.filter((_, idx) => idx !== indexToRemove));
          }
        }
      }
      // Multi-click tools (require 2 points)
      else if (["trendline", "ray", "extended-line", "info-line", "fib-retracement", "rectangle", "price-range", "date-range"].includes(selectedTool)) {
        if (!pendingDrawing) {
          // First click - store start point
          setPendingDrawing({ type: selectedTool, startX: time, startY: price });
        } else {
          // Second click - complete the drawing
          const newDrawing = {
            type: pendingDrawing.type,
            startX: pendingDrawing.startX,
            startY: pendingDrawing.startY,
            endX: time,
            endY: price,
          };
          
          // Add additional data for specific tools
          if (pendingDrawing.type === "fib-retracement") {
            newDrawing.levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
          } else if (pendingDrawing.type === "price-range") {
            newDrawing.priceDiff = Math.abs(price - pendingDrawing.startY);
            newDrawing.percentChange = ((price - pendingDrawing.startY) / pendingDrawing.startY * 100);
          } else if (pendingDrawing.type === "date-range") {
            newDrawing.timeDiff = Math.abs(time - pendingDrawing.startX);
          }
          
          setDrawings((prev) => [...prev, newDrawing]);
          setPendingDrawing(null);
          setSelectedTool("cursor");
        }
      }
    }
  };
  
  // Handle text input submission
  const handleTextSubmit = () => {
    if (pendingTextPosition && textInput.trim()) {
      setDrawings((prev) => [...prev, { 
        type: "text", 
        x: pendingTextPosition.x, 
        y: pendingTextPosition.y,
        text: textInput.trim()
      }]);
    }
    setShowTextModal(false);
    setTextInput("");
    setPendingTextPosition(null);
    setSelectedTool("cursor");
  };

  // --- Chart Options ---
  const getChartOptions = () => {
    // Build yaxis annotations (horizontal lines)
    const yaxisAnnotations = drawings
      .filter((d) => d.type === "horizontal")
      .map((d) => ({
        y: d.y,
        borderColor: d.color || "#3b82f6",
        strokeDashArray: 0,
        label: {
          borderColor: d.color || "#3b82f6",
          style: {
            color: "#fff",
            background: d.color || "#3b82f6",
            fontSize: "10px",
            fontWeight: 600,
          },
          text: `$${d.y.toFixed(2)}`,
          position: "left",
        },
      }));
    
    // Add Fibonacci retracement levels
    drawings.filter((d) => d.type === "fib-retracement").forEach((d) => {
      const levels = d.levels || [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
      const range = d.endY - d.startY;
      const colors = ["#ef4444", "#f59e0b", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];
      
      levels.forEach((level, idx) => {
        const price = d.startY + (range * level);
        yaxisAnnotations.push({
          y: price,
          borderColor: colors[idx % colors.length],
          strokeDashArray: 2,
          label: {
            borderColor: colors[idx % colors.length],
            style: {
              color: "#fff",
              background: colors[idx % colors.length],
              fontSize: "9px",
            },
            text: `${(level * 100).toFixed(1)}% - $${price.toFixed(2)}`,
            position: "left",
          },
        });
      });
    });
    
    // Add price range annotations
    drawings.filter((d) => d.type === "price-range").forEach((d) => {
      const isUp = d.endY >= d.startY;
      yaxisAnnotations.push({
        y: d.startY,
        y2: d.endY,
        fillColor: isUp ? "#22c55e" : "#ef4444",
        opacity: 0.1,
        label: {
          borderColor: isUp ? "#22c55e" : "#ef4444",
          style: {
            color: "#fff",
            background: isUp ? "#22c55e" : "#ef4444",
            fontSize: "10px",
          },
          text: `${isUp ? "+" : ""}${d.percentChange?.toFixed(2)}% ($${d.priceDiff?.toFixed(2)})`,
          position: "left",
        },
      });
    });

    // Build xaxis annotations (vertical lines)
    const xaxisAnnotations = drawings
      .filter((d) => d.type === "vertical")
      .map((d) => ({
        x: d.x,
        borderColor: d.color || "#8b5cf6",
        strokeDashArray: 0,
        label: {
          borderColor: d.color || "#8b5cf6",
          style: {
            color: "#fff",
            background: d.color || "#8b5cf6",
            fontSize: "10px",
          },
          text: new Date(d.x).toLocaleDateString(),
          orientation: "horizontal",
        },
      }));
    
    // Add date range annotations
    drawings.filter((d) => d.type === "date-range").forEach((d) => {
      xaxisAnnotations.push({
        x: Math.min(d.startX, d.endX),
        x2: Math.max(d.startX, d.endX),
        fillColor: "#3b82f6",
        opacity: 0.1,
        label: {
          borderColor: "#3b82f6",
          style: {
            color: "#fff",
            background: "#3b82f6",
            fontSize: "10px",
          },
          text: `${Math.round(d.timeDiff / (1000 * 60 * 60))}h`,
          orientation: "horizontal",
        },
      });
    });
    
    // Add trendline/ray as xaxis annotation (approximation - ApexCharts doesn't support true diagonal lines)
    drawings.filter((d) => ["trendline", "ray", "extended-line", "info-line"].includes(d.type)).forEach((d) => {
      // We'll mark start and end with vertical lines and a label showing the trend
      xaxisAnnotations.push({
        x: d.startX,
        borderColor: "#f59e0b",
        strokeDashArray: 2,
        label: {
          style: { color: "#fff", background: "#f59e0b", fontSize: "9px" },
          text: "Start",
          orientation: "horizontal",
        },
      });
      xaxisAnnotations.push({
        x: d.endX,
        borderColor: "#f59e0b",
        strokeDashArray: 2,
        label: {
          style: { color: "#fff", background: "#f59e0b", fontSize: "9px" },
          text: `End (${d.endY > d.startY ? "↑" : "↓"}${Math.abs(d.endY - d.startY).toFixed(2)})`,
          orientation: "horizontal",
        },
      });
      // Also add horizontal lines at start/end prices
      yaxisAnnotations.push({
        y: d.startY,
        y2: d.endY,
        fillColor: "#f59e0b",
        opacity: 0.08,
      });
    });
    
    // Add rectangle annotations
    drawings.filter((d) => d.type === "rectangle").forEach((d) => {
      xaxisAnnotations.push({
        x: Math.min(d.startX, d.endX),
        x2: Math.max(d.startX, d.endX),
        fillColor: "#6366f1",
        opacity: 0.15,
      });
      yaxisAnnotations.push({
        y: Math.min(d.startY, d.endY),
        y2: Math.max(d.startY, d.endY),
        fillColor: "#6366f1",
        opacity: 0.15,
      });
    });

    // Build point annotations
    const pointAnnotations = [];
    
    // Regular points
    drawings.filter((d) => d.type === "point").forEach((d) => {
      pointAnnotations.push({
        x: d.x,
        y: d.y,
        marker: {
          size: 6,
          fillColor: "#fff",
          strokeColor: "#3b82f6",
          strokeWidth: 2,
          radius: 2,
        },
        label: {
          borderColor: "#3b82f6",
          style: { color: "#fff", background: "#3b82f6", fontSize: "9px" },
          text: `$${d.y.toFixed(2)}`,
        },
      });
    });
    
    // Text annotations
    drawings.filter((d) => d.type === "text").forEach((d) => {
      pointAnnotations.push({
        x: d.x,
        y: d.y,
        marker: { size: 0 },
        label: {
          borderColor: "#6366f1",
          style: { 
            color: "#fff", 
            background: "#6366f1", 
            fontSize: "11px",
            fontWeight: 500,
            padding: { left: 8, right: 8, top: 4, bottom: 4 },
          },
          text: d.text,
          offsetY: 0,
        },
      });
    });
    
    // Long position markers
    drawings.filter((d) => d.type === "long").forEach((d) => {
      pointAnnotations.push({
        x: d.x,
        y: d.y,
        marker: {
          size: 8,
          fillColor: "#22c55e",
          strokeColor: "#166534",
          strokeWidth: 2,
          shape: "triangle",
        },
        label: {
          borderColor: "#22c55e",
          style: { color: "#fff", background: "#22c55e", fontSize: "9px", fontWeight: 600 },
          text: `LONG $${d.y.toFixed(2)}`,
          offsetY: -10,
        },
      });
    });
    
    // Short position markers
    drawings.filter((d) => d.type === "short").forEach((d) => {
      pointAnnotations.push({
        x: d.x,
        y: d.y,
        marker: {
          size: 8,
          fillColor: "#ef4444",
          strokeColor: "#991b1b",
          strokeWidth: 2,
          shape: "triangle",
          rotate: 180,
        },
        label: {
          borderColor: "#ef4444",
          style: { color: "#fff", background: "#ef4444", fontSize: "9px", fontWeight: 600 },
          text: `SHORT $${d.y.toFixed(2)}`,
          offsetY: 10,
        },
      });
    });

    const annotations = {
      yaxis: yaxisAnnotations,
      xaxis: xaxisAnnotations,
      points: pointAnnotations,
    };

    return {
      chart: {
        type:
          chartType === "area" || chartType === "line"
            ? chartType
            : "candlestick",
        height: "100%",
        fontFamily: "Inter, sans-serif",
        background: "transparent",
        toolbar: { show: false },
        zoom: { enabled: selectedTool === "cursor" }, // Only zoom on cursor mode
        animations: { enabled: false },
        events: {
          click: handleChartClick,
        },
      },
      theme: { mode: "dark" },
      grid: {
        show: true,
        borderColor: "#27272a", // zinc-800
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
          style: { colors: "#71717a", fontSize: "11px" }, // zinc-500
          format:
            timeRange === "max" || timeRange === "1m"
              ? "MMM dd"
              : "MMM dd HH:mm",
        },
        crosshairs: {
          show: selectedTool === "crosshair", // Only show on crosshair mode
          width: 1,
          position: "back",
          opacity: 0.9,
          stroke: {
            color: "#3b82f6", // blue-500
            width: 1,
            dashArray: 3,
          },
        },
      },
      yaxis: {
        opposite: true,
        labels: {
          style: { colors: "#71717a", fontSize: "11px" }, // zinc-500
          formatter: (val) => `$${val?.toFixed(2) || "0.00"}`,
        },
        crosshairs: {
          show: selectedTool === "crosshair", // Also show y-axis crosshair
          stroke: {
            color: "#3b82f6",
            width: 1,
            dashArray: 3,
          },
        },
      },
      tooltip: {
        theme: "dark",
        style: { fontSize: "12px" },
        x: { format: "MMM dd, HH:mm" },
        enabled: true,
        shared: false, // Standard candle tooltip behavior usually works best
        intersect: selectedTool === "cursor", // On cursor: must hover exactly. On crosshair: more lenient?
      },
      plotOptions: {
        candlestick: {
          colors: { upward: "#22c55e", downward: "#ef4444" },
          wick: { useFillColor: true },
        },
        bar: {
          colors: {
            ranges: [
              {
                from: 0,
                to: 10000000000,
                color: "#3b82f6",
              },
            ],
          },
        },
      },
      stroke: {
        width: chartType === "candlestick" ? 1 : 2,
        curve: "smooth",
      },
      fill: {
        type: chartType === "area" ? "gradient" : "solid",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.4,
          opacityTo: 0.05,
        },
      },
      colors: ["#3b82f6"], // Default for line/area
      annotations: showDrawings ? annotations : undefined,
    };
  };

  const getSeriesData = () => {
    // For candlestick/bar, expects [{ x, y: [o,h,l,c] }]
    // For line/area, expects [{ x, y: value }]
    if (chartType === "line" || chartType === "area") {
      return [
        {
          name: "Price",
          data: chartData.map((c) => ({ x: c.x, y: c.y[3] })), // Close price
        },
      ];
    }
    return [{ name: "Price", data: chartData }];
  };

  // --- UI Helpers ---
  const handleToolSelect = (toolId) => {
    if (toolId === "clear") {
      setDrawings([]);
      setPendingDrawing(null);
      return;
    }
    setSelectedTool(toolId);
    setExpandedToolGroup(null);
    setPendingDrawing(null); // Reset any pending multi-click drawing
  };

  const getCurrentToolIcon = () => {
    for (const group of toolGroups) {
      const tool = group.tools.find((t) => t.id === selectedTool);
      if (tool) return tool.icon;
    }
    return MousePointer;
  };

  const ToolButton = ({ tool, isActive, onClick, showLabel = false }) => {
    const Icon = tool.icon;
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }}
        className={`flex items-center gap-2 w-full p-2.5 rounded-lg transition-all cursor-pointer ${
          isActive
            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
            : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50"
        }`}
        title={tool.name}
      >
        <Icon size={16} className={tool.rotate ? "rotate-90" : ""} />
        {showLabel && <span className="text-xs font-medium">{tool.name}</span>}
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#050505] text-zinc-200">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-900 bg-[#050505]">
        {/* Left - Price Info */}
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
                vAMM Mark
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                PERP
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-xl font-bold text-white tracking-tight">
                {loading
                  ? "..."
                  : currentPrice !== null
                  ? `$${currentPrice.toFixed(2)}`
                  : "N/A"}
              </span>
              {hasEnoughData && priceChange !== null && (
                <span
                  className={`text-xs font-bold ${
                    isPriceUp ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {isPriceUp ? "+" : ""}
                  {priceChange.toFixed(2)}{" "}
                  <span className="opacity-70">
                    ({isPriceUp ? "+" : ""}
                    {priceChangePercent.toFixed(2)}%)
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center - Chart Type & Time Range */}
        <div className="flex items-center gap-3">
          {/* Chart Type Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowChartTypeMenu(!showChartTypeMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all"
            >
              {(() => {
                const type = chartTypes.find((t) => t.id === chartType);
                const Icon = type?.icon || CandlestickChart;
                return <Icon size={14} className="text-zinc-400" />;
              })()}
              <span className="text-xs text-zinc-300 font-medium">
                {chartTypes.find((t) => t.id === chartType)?.name}
              </span>
              <ChevronDown size={12} className="text-zinc-500" />
            </button>

            {showChartTypeMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowChartTypeMenu(false)}
                />
                <div className="absolute top-full left-0 mt-1 bg-[#0A0A0A] border border-zinc-800 rounded-xl shadow-xl z-50 py-1 min-w-[140px] overflow-hidden">
                  {chartTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        onClick={() => {
                          setChartType(type.id);
                          setShowChartTypeMenu(false);
                        }}
                        className={`flex items-center gap-2 w-full px-3 py-2 text-left transition-colors ${
                          chartType === type.id
                            ? "bg-blue-500/10 text-blue-400"
                            : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                        }`}
                      >
                        <Icon size={14} />
                        <span className="text-xs font-medium">{type.name}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="w-px h-6 bg-zinc-900" />

          {/* Time Range */}
          <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
            {["7d", "1m", "max"].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${
                  timeRange === range
                    ? "bg-zinc-700 text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                {range === "max" ? "Max" : range === "1m" ? "1M" : range}
              </button>
            ))}
          </div>
        </div>

        {/* Right - Quick Actions */}
        <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/50">
          <button
            onClick={() => setLockedDrawings(!lockedDrawings)}
            className={`p-1.5 rounded-md transition-all ${
              lockedDrawings
                ? "bg-amber-500/10 text-amber-400"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
            }`}
            title={lockedDrawings ? "Unlock Drawings" : "Lock Drawings"}
          >
            {lockedDrawings ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
          <button
            onClick={() => setShowDrawings(!showDrawings)}
            className={`p-1.5 rounded-md transition-all ${
              !showDrawings
                ? "bg-zinc-700 text-zinc-300"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
            }`}
            title={showDrawings ? "Hide Drawings" : "Show Drawings"}
          >
            {showDrawings ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
          <div className="w-px h-4 bg-zinc-800 mx-1" />
          <button
            onClick={() => setDrawings([])}
            className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Clear All Drawings"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Left Tool Sidebar */}
        <div className="w-12 bg-zinc-950 border-r border-zinc-900 flex flex-col items-center py-2 gap-1 z-20 overflow-y-auto no-scrollbar">
          {toolGroups.map((group) => {
            const isGroupActive = group.tools.some(
              (t) => t.id === selectedTool
            );
            const isExpanded = expandedToolGroup === group.id;
            const GroupIcon = group.icon;

            return (
              <div key={group.id} className="relative shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (group.tools.length === 1) {
                      handleToolSelect(group.tools[0].id);
                    } else {
                      // Toggle logic
                      if (expandedToolGroup === group.id) {
                        setExpandedToolGroup(null);
                      } else {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setSubmenuPosition({
                          top: rect.top,
                          left: rect.right + 5,
                        });
                        setExpandedToolGroup(group.id);
                      }
                    }
                  }}
                  className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all relative cursor-pointer ${
                    isGroupActive
                      ? "bg-blue-500/10 text-blue-400"
                      : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900"
                  }`}
                  title={group.name}
                >
                  <GroupIcon size={18} />
                  {group.tools.length > 1 && (
                    <div className="absolute bottom-0.5 right-0.5 w-1 h-1 rounded-full bg-zinc-600"></div>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Floating Submenu (Rendered outside the scroll container but absolute to main content or fixed) */}
        {expandedToolGroup && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setExpandedToolGroup(null)}
            />
            <div
              className="fixed bg-[#0A0A0A] border border-zinc-800 rounded-lg shadow-xl z-50 p-1 min-w-[140px] flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100"
              style={{
                top: Math.min(submenuPosition.top, window.innerHeight - 200),
                left: submenuPosition.left,
              }}
            >
              {(() => {
                const group = toolGroups.find(
                  (g) => g.id === expandedToolGroup
                );
                if (!group) return null;
                return (
                  <>
                    <div className="px-2 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-800/50 mb-1">
                      {group.name}
                    </div>
                    {group.tools.map((tool) => (
                      <ToolButton
                        key={tool.id}
                        tool={tool}
                        isActive={selectedTool === tool.id}
                        onClick={() => handleToolSelect(tool.id)}
                        showLabel={true}
                      />
                    ))}
                  </>
                );
              })()}
            </div>
          </>
        )}

        {/* Chart Area */}
        <div className="flex-1 min-h-0 w-full relative bg-[#050505]">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 text-xs gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="font-medium animate-pulse">
                Loading market data...
              </span>
            </div>
          ) : hasEnoughData ? (
            <>
              <Chart
                key={`${chartType}-${timeRange}`} // Force re-render on drastic changes
                options={getChartOptions()}
                series={getSeriesData()}
                type={
                  chartType === "area" || chartType === "line"
                    ? chartType
                    : "candlestick"
                }
                height="100%"
                width="100%"
              />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-xs font-medium">
              Not enough trading data available for this range.
            </div>
          )}

          {/* Selected Tool Indicator */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-zinc-900/90 backdrop-blur-md rounded-full border border-zinc-800/50 z-10 shadow-lg">
            {(() => {
              const Icon = getCurrentToolIcon();
              return <Icon size={12} className="text-blue-400" />;
            })()}
            <span className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider">
              {selectedTool.replace("-", " ")}
            </span>
          </div>

          {/* Pending Drawing Indicator */}
          {pendingDrawing && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-blue-600/90 backdrop-blur-md rounded-lg border border-blue-500/50 z-20 shadow-lg animate-pulse">
              <span className="text-xs text-white font-medium">
                Click to set {pendingDrawing.type === 'fib-retracement' ? 'end level' : 'second point'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Text Input Modal */}
      {showTextModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 shadow-2xl w-80">
            <h3 className="text-sm font-bold text-white mb-4">Add Text Annotation</h3>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Enter text..."
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTextSubmit();
                if (e.key === 'Escape') {
                  setShowTextModal(false);
                  setTextInput("");
                  setPendingTextPosition(null);
                }
              }}
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowTextModal(false);
                  setTextInput("");
                  setPendingTextPosition(null);
                }}
                className="flex-1 px-4 py-2 text-sm font-medium text-zinc-400 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTextSubmit}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedChart;
