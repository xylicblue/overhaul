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

      {/* Quick Guide FAB */}
      <button
        onClick={() => setShowWelcome(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0a0a10]/90 hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.12] text-zinc-400 hover:text-zinc-200 text-[11px] font-medium rounded-md backdrop-blur-sm transition-colors duration-150"
      >
        <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded border border-white/[0.08] text-zinc-500 font-mono text-[9px]">?</span>
        Help
      </button>
    </PageTransition>
  );
};

export default TradingPage;
