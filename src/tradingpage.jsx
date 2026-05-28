// src/TradingPage.js
import React, { useState, useEffect } from "react";
import { TradingDashboard } from "./tradingdash";
import { MarketProvider } from "./marketcontext";
import NetworkGuard from "./components/NetworkGuard";
import WelcomeModal from "./components/WelcomeModal";
import PageTransition from "./components/PageTransition";
import { AlertTriangle, X } from "lucide-react";

const TradingPage = () => {
  const [showWelcome, setShowWelcome] = useState(false);
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    // Check if user has visited before
    const hasVisited = localStorage.getItem("bytestrike_visited");

    if (!hasVisited) {
      // Show welcome modal for first-time visitors
      setShowWelcome(true);
    }
  }, []);

  const handleCloseWelcome = () => {
    setShowWelcome(false);
    // Mark as visited
    localStorage.setItem("bytestrike_visited", "true");
  };

  return (
    <PageTransition className="flex flex-col h-full overflow-hidden relative">
      {/* Sleek Testnet Banner - Dismissible */}
      {showBanner && (
        <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-b border-blue-500/20 px-4 py-1.5 flex items-center justify-center backdrop-blur-sm z-40 relative">
          <div className="flex items-center gap-2 text-xs text-blue-200">
            <AlertTriangle size={14} className="text-blue-400" />
            <span>
              <span className="font-bold text-blue-400">Testnet Mode:</span> You are trading with test tokens on Sepolia. No real funds are at risk.
            </span>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-blue-300/60 hover:text-white hover:bg-white/10 rounded transition-colors"
            aria-label="Dismiss banner"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <NetworkGuard>
        <MarketProvider>
          <TradingDashboard />
        </MarketProvider>
      </NetworkGuard>

      <WelcomeModal isOpen={showWelcome} onClose={handleCloseWelcome} />

      {/* Quick Guide Button - Styled to be unobtrusive */}
      <button
        onClick={() => setShowWelcome(true)}
        className="fixed bottom-4 right-4 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium px-3 py-1.5 rounded-full border border-slate-700 backdrop-blur-sm transition-all shadow-lg z-50 flex items-center gap-1.5"
      >
        <span>?</span> Help
      </button>
    </PageTransition>
  );
};

export default TradingPage;
