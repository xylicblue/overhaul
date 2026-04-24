// Thin adapter — state now lives in useAuthModalStore (Zustand).
// All existing imports of useAuthModal / AuthModalProvider continue to work unchanged.
import { useAuthModalStore } from "../stores/useAuthModalStore";

// useAuthModal: same API as before, backed by Zustand
export const useAuthModal = () => useAuthModalStore();

// AuthModalProvider: no longer needed (Zustand has no Provider requirement)
// Kept as a passthrough so App.jsx doesn't need to change
export const AuthModalProvider = ({ children }) => children;
