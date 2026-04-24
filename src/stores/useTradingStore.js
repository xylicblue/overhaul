import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const useTradingStore = create(
  persist(
    (set) => ({
      // Order form
      side: "Buy",
      size: "",
      priceLimit: "",
      leverage: 1,

      // Post-trade state
      lastTxHash: null,
      lastTxSide: null,

      // Position close state (from PositionPanel)
      closingPositionId: null,
      closeSize: "",

      // Actions
      setSide: (side) => set({ side }),
      setSize: (size) => set({ size }),
      setPriceLimit: (priceLimit) => set({ priceLimit }),
      setLeverage: (leverage) => set({ leverage }),

      // Clear size/price after a trade but keep side/leverage preference and lastTxHash dedup guard
      resetOrder: () => set({ size: "", priceLimit: "" }),

      setLastTx: (hash, side) => set({ lastTxHash: hash, lastTxSide: side }),

      setClosingPosition: (id) => set({ closingPositionId: id, closeSize: "" }),
      setCloseSize: (size) => set({ closeSize: size }),
      resetClose: () => set({ closingPositionId: null, closeSize: "" }),
    }),
    {
      name: "trading-state",
      // sessionStorage: cleared when tab closes — prevents stale orders on next session
      storage: createJSONStorage(() => sessionStorage),
      // Only persist user preferences, not ephemeral order inputs
      partialize: (state) => ({
        side: state.side,
        leverage: state.leverage,
      }),
    }
  )
);
