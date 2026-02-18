// src/TradingPage.js
import React, { useState, useEffect } from "react";
import { TradingDashboard } from "./tradingdash";
import { MarketProvider } from "./marketcontext";
import NetworkGuard from "./components/NetworkGuard";
import WelcomeModal from "./components/WelcomeModal";
import PageTransition from "./components/PageTransition";

const TradingPage = () => {
  const [showWelcome, setShowWelcome] = useState(false);

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
