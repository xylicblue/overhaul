/**
 * TradingView Advanced Chart Component
 * Integrates TradingView charting library with the trading platform
 */

import React, { useEffect, useRef, useState, useMemo } from "react";
import { Datafeed } from "../tradingview/datafeed";
import { IndexDatafeed } from "../tradingview/indexDatafeed";

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
          interval: "60", // Default 1 hour
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
            "paneProperties.crossHairProperties.color": "#3b82f6",
            
            // Scales
            "scalesProperties.backgroundColor": "#050505",
            "scalesProperties.lineColor": "#27272a",
            "scalesProperties.textColor": "#71717a",
            
            // Main series (candles)
            "mainSeriesProperties.candleStyle.upColor": "#22c55e",
            "mainSeriesProperties.candleStyle.downColor": "#ef4444",
            "mainSeriesProperties.candleStyle.borderUpColor": "#22c55e",
            "mainSeriesProperties.candleStyle.borderDownColor": "#ef4444",
            "mainSeriesProperties.candleStyle.wickUpColor": "#22c55e",
            "mainSeriesProperties.candleStyle.wickDownColor": "#ef4444",
            
            // Line style
            "mainSeriesProperties.lineStyle.color": "#3b82f6",
            "mainSeriesProperties.lineStyle.linewidth": 2,
            
            // Area style
            "mainSeriesProperties.areaStyle.color1": "rgba(59, 130, 246, 0.3)",
            "mainSeriesProperties.areaStyle.color2": "rgba(59, 130, 246, 0.05)",
            "mainSeriesProperties.areaStyle.linecolor": "#3b82f6",
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
        });

      } catch (err) {
        console.error("[TradingViewChart] Widget creation error:", err);
        setError("Failed to initialize chart");
        setIsLoading(false);
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(initWidget, 100);

    return () => {
      clearTimeout(timer);
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
