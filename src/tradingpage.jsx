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
        className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 px-3 py-1.5 bg-[#0a0a10] hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-500 hover:text-zinc-200 text-[10px] font-bold uppercase tracking-widest rounded-lg backdrop-blur-sm transition-all shadow-lg"
      >
        <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded border border-zinc-700 text-zinc-600 font-mono text-[9px]">?</span>
        Help
      </button>
    </PageTransition>
  );
};

export default TradingPage;
