import { create } from "zustand";

export const useAuthModalStore = create((set) => ({
  isOpen: false,
  mode: "login", // "login" | "signup"

  openLogin: () => set({ isOpen: true, mode: "login" }),
  openSignup: () => set({ isOpen: true, mode: "signup" }),
  close: () => set({ isOpen: false }),
  switchMode: () =>
    set((state) => ({ mode: state.mode === "login" ? "signup" : "login" })),
}));
