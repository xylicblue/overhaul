import React, { createContext, useContext, useState, useCallback } from "react";

// Create the context
const AuthModalContext = createContext(null);

// Provider component
export const AuthModalProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState("login"); // "login" or "signup"

  const openLogin = useCallback(() => {
    setMode("login");
    setIsOpen(true);
  }, []);

  const openSignup = useCallback(() => {
    setMode("signup");
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const switchMode = useCallback(() => {
    setMode((prev) => (prev === "login" ? "signup" : "login"));
  }, []);

  return (
    <AuthModalContext.Provider
      value={{ isOpen, mode, openLogin, openSignup, close, switchMode }}
    >
      {children}
    </AuthModalContext.Provider>
  );
};

// Hook to use the auth modal
export const useAuthModal = () => {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error("useAuthModal must be used within an AuthModalProvider");
  }
  return context;
};
