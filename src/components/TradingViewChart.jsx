/**
 * TradingView Advanced Chart Component
 * Integrates TradingView charting library with the trading platform
 */

import React, { useEffect, useRef, useState, useMemo } from "react";
import { Datafeed } from "../tradingview/datafeed";
import { IndexDatafeed } from "../tradingview/indexDatafeed";

/**
 * Returns an appropriate visible time range (in seconds) for a given resolution.
 * This ensures the chart fills its width with a sensible number of bars
 * when the user switches resolutions.
 */
function getVisibleRangeForResolution(resolution) {
  const map = {
    "1": 6 * 3600,            // 6 hours  → ~360 bars
    "5": 24 * 3600,           // 1 day    → ~288 bars
    "15": 3 * 24 * 3600,      // 3 days   → ~288 bars
    "30": 5 * 24 * 3600,      // 5 days   → ~240 bars
    "60": 14 * 24 * 3600,     // 2 weeks  → ~336 bars
    "240": 60 * 24 * 3600,    // 2 months → ~360 bars
    "D": 180 * 24 * 3600,     // 6 months → ~180 bars
    "W": 365 * 24 * 3600,     // 1 year   → ~52 bars
    "M": 3 * 365 * 24 * 3600, // 3 years  → ~36 bars
  };
  return map[resolution] || 30 * 24 * 3600;
}

const TradingViewChart = ({ market = "H100-PERP", priceType = "mark" }) => {
  const containerRef = useRef(null);
  const widgetRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Memoize datafeed selection to prevent unnecessary re-initialization
  const selectedDatafeed = useMemo(() => {
    return priceType === "index" ? IndexDatafeed : Datafeed;
  }, [priceType]);

  useEffect(() => {
    // Wait for container to be available
    if (!containerRef.current) return;

    const initWidget = () => {
      // Check if TradingView is loaded
      if (typeof window.TradingView === "undefined") {
        console.error("TradingView library not loaded");
        setError("Chart library not loaded");
        setIsLoading(false);
        return;
      }

      // Clean up existing widget
      if (widgetRef.current) {
        try {
          widgetRef.current.remove();
        } catch (e) {
          console.warn("Error removing widget:", e);
        }
        widgetRef.current = null;
      }

      try {
        // Create the TradingView widget
        const widget = new window.TradingView.widget({
          symbol: market,
          interval: "15", // Default 15 minutes (shows ~5 days of data)
          container: containerRef.current,
          datafeed: selectedDatafeed,
          library_path: "/charting_library/",
          locale: "en",
          fullscreen: false,
          autosize: true,
          
          // TradingView logo link
          logo_link: "https://www.tradingview.com/",
          
          // Dark theme configuration
          theme: "dark",
          
          // Styling overrides
          custom_css_url: "",
          loading_screen: { 
            backgroundColor: "#050505",
            foregroundColor: "#3b82f6"
          },
          
          // Enable features
          enabled_features: [
            "study_templates",
            "use_localstorage_for_settings",
            "save_chart_properties_to_local_storage",
            "side_toolbar_in_fullscreen_mode",
            "header_in_fullscreen_mode",
            "items_favoriting",
            "drawing_templates",
          ],
          
          // Disable features
          disabled_features: [
            "header_symbol_search",
            "header_compare",
            "symbol_search_hot_key",
            "show_hide_button_in_legend",
            "legend_context_menu",
          ],
          
          // Overrides for dark styling
          overrides: {
            // Pane
            "paneProperties.background": "#050505",
            "paneProperties.backgroundType": "solid",
            "paneProperties.vertGridProperties.color": "#1a1a1a",
            "paneProperties.horzGridProperties.color": "#1a1a1a",
            "paneProperties.crossHairProperties.color": "#758696",
            
            // Scales
            "scalesProperties.backgroundColor": "#050505",
            "scalesProperties.lineColor": "#1e222d",
            "scalesProperties.textColor": "#787b86",
            
            // Main series (candles) — TradingView pro palette
            "mainSeriesProperties.candleStyle.upColor": "#26a69a",
            "mainSeriesProperties.candleStyle.downColor": "#ef5350",
            "mainSeriesProperties.candleStyle.borderUpColor": "#26a69a",
            "mainSeriesProperties.candleStyle.borderDownColor": "#ef5350",
            "mainSeriesProperties.candleStyle.wickUpColor": "#26a69a",
            "mainSeriesProperties.candleStyle.wickDownColor": "#ef5350",
            
            // Line style — TradingView signature blue
            "mainSeriesProperties.lineStyle.color": "#2962FF",
            "mainSeriesProperties.lineStyle.linewidth": 2,
            
            // Area style
            "mainSeriesProperties.areaStyle.color1": "rgba(41, 98, 255, 0.28)",
            "mainSeriesProperties.areaStyle.color2": "rgba(41, 98, 255, 0.05)",
            "mainSeriesProperties.areaStyle.linecolor": "#2962FF",
            "mainSeriesProperties.areaStyle.linewidth": 2,
          },
          
          // Studies overrides
          studies_overrides: {
            "volume.volume.color.0": "#ef4444",
            "volume.volume.color.1": "#22c55e",
          },
          
          // Timezone
          timezone: "Etc/UTC",
          
          // Chart types available
          charts_storage_url: undefined,
          client_id: "bytestrike.io",
          user_id: "public_user",
          
          // Debug mode (set to true for development)
          debug: false,
        });

        // Store widget reference
        widgetRef.current = widget;

        // Widget ready callback
        widget.onChartReady(() => {
          console.log("[TradingViewChart] Chart is ready");
          setIsLoading(false);
          setError(null);
          
          // Apply additional chart settings
          const chart = widget.activeChart();
          
          // Set default chart type based on priceType
          // 1 = Candles, 2 = Line
          chart.setChartType(priceType === "index" ? 2 : 1);
          
          // ── Listen for resolution changes and adjust visible range ──
          chart.onIntervalChanged().subscribe(null, (interval) => {
            // Wait for TradingView to fetch new bars, then set appropriate range
            setTimeout(() => {
              try {
                const now = Math.floor(Date.now() / 1000);
                const rangeSeconds = getVisibleRangeForResolution(interval);
                chart.setVisibleRange({
                  from: now - rangeSeconds,
                  to: now,
                });
              } catch (e) {
                // Fallback: just fit whatever content is loaded
                try {
                  chart.getTimeScale().fitContent();
                } catch (e2) {
                  console.warn("[TradingViewChart] Could not adjust range:", e2);
                }
              }
            }, 500);
          });
          
          // ── Initial load: fit all available data so the full history is visible ──
          setTimeout(() => {
            try {
              chart.getTimeScale().fitContent();
            } catch (e) {
              console.warn("[TradingViewChart] Could not fit content on load:", e);
            }
          }, 500);
        });

      } catch (err) {
        console.error("[TradingViewChart] Widget creation error:", err);
        setError("Failed to initialize chart");
        setIsLoading(false);
      }
    };

    // Initialize immediately if TradingView is already loaded
    if (typeof window.TradingView !== "undefined") {
      initWidget();
    } else {
      // Small delay only if library not yet loaded
      const timer = setTimeout(initWidget, 50);
      return () => clearTimeout(timer);
    }

    return () => {
      if (widgetRef.current) {
        try {
          widgetRef.current.remove();
        } catch (e) {
          console.warn("Error cleaning up widget:", e);
        }
        widgetRef.current = null;
      }
    };
  }, [market, priceType]);

  // Handle symbol change when market prop changes
  useEffect(() => {
    if (widgetRef.current && !isLoading) {
      try {
        widgetRef.current.onChartReady(() => {
          const chart = widgetRef.current.activeChart();
          chart.setSymbol(market);
        });
      } catch (e) {
        console.warn("Error changing symbol:", e);
      }
    }
  }, [market, isLoading]);

  return (
    <div className="w-full h-full relative bg-[#050505] overflow-hidden">
      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#050505] z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-zinc-400 text-sm">Loading chart...</span>
          </div>
        </div>
      )}
      
      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#050505] z-10">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="text-red-400 text-sm">{error}</div>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      )}
      
      {/* Chart Container */}
      <div 
        ref={containerRef}
        className="w-full h-full overflow-hidden"
        style={{ minHeight: "300px", maxHeight: "100%" }}
      />
    </div>
  );
};

// Use React.memo to prevent re-renders when parent updates (e.g., from real-time price data)
export default React.memo(TradingViewChart);
