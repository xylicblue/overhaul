import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useUIStore = create(
  persist(
    (set) => ({
      // Trading dashboard
      activeMobileTab: "chart", // "chart" | "positions" | "order"
      drawerOpen: false,

      // Chart preference
      activeChart: "index", // "index" | "vamm"
      isChartFullscreen: false,

      // Actions
      setActiveMobileTab: (tab) => set({ activeMobileTab: tab }),
      setDrawerOpen: (open) => set({ drawerOpen: open }),
      toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),
      setActiveChart: (chart) => set({ activeChart: chart }),
      setChartFullscreen: (fs) => set({ isChartFullscreen: fs }),
    }),
    {
      name: "ui-prefs",
      // Only persist chart preference — layout state resets on page load
      partialize: (state) => ({ activeChart: state.activeChart }),
    }
  )
);
