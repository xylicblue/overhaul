import React from "react";
import LandingPage from "./landingpage";
import LoginPage from "./login";
import SignupPage from "./signup";
import AboutPage from "./about";
import CreateUsernamePage from "./welcome";
import ForgotPasswordPage from "./ForgotPassword";
import ResetPasswordPage from "./ResetPassword";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import TradingPage from "./tradingpage";
import PortfolioPage from "./portfolio";
import GuidePage from "./guidepage";
import SettingsPage from "./settings";
import MethodologyPage from "./MethodologyPage";
import SharedLayout from "./sharedlayout";
import { DebugMarkets } from "./debug-markets";
import "@rainbow-me/rainbowkit/styles.css";
import "./App.css";

import {
  RainbowKitProvider,
  connectorsForWallets,
} from "@rainbow-me/rainbowkit";
import {
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, WagmiProvider, http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import GeoGatekeeper from "./gatekeeper";
// Define your chains - Sepolia first to make it default
const chains = [sepolia, mainnet];

// Your WalletConnect Project ID (from WalletConnect cloud dashboard)
const projectId = "d07e63a0686f7431f5c7198cb53afa7d";

// Set up RainbowKit connectors
import { getDefaultWallets } from "@rainbow-me/rainbowkit";
const { connectors } = getDefaultWallets({
  appName: "ByteStrike",
  projectId: "d07e63a0686f7431f5c7198cb53afa7d",
  chains,
});

// Create wagmi configuration with Alchemy RPC
const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  chains,
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(
      "https://eth-sepolia.g.alchemy.com/v2/3qoSFfQA1ZOtTO-eyMjN0a1ijwT4AdQy"
    ),
  },
});

const queryClient = new QueryClient();
function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider chains={chains} initialChain={sepolia}>
          {/* <GeoGatekeeper> */}
          <Router>
            <div className="App">
              <Toaster
                position="top-right"
                gutter={12}
                containerStyle={{
                  top: 20,
                  right: 20,
                }}
                toastOptions={{
                  // Base styles for all toasts
                  style: {
                    background: 'rgba(15, 15, 20, 0.95)',
                    backdropFilter: 'blur(20px)',
                    color: '#f1f5f9',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    fontSize: '14px',
                    fontWeight: '500',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                    maxWidth: '380px',
                  },
                  duration: 4000,
                  // Success toast styles
                  success: {
                    style: {
                      background: 'linear-gradient(135deg, rgba(15, 15, 20, 0.95) 0%, rgba(16, 185, 129, 0.1) 100%)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                    },
                    iconTheme: {
                      primary: '#10b981',
                      secondary: '#0f0f14',
                    },
                  },
                  // Error toast styles
                  error: {
                    style: {
                      background: 'linear-gradient(135deg, rgba(15, 15, 20, 0.95) 0%, rgba(239, 68, 68, 0.1) 100%)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                    },
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#0f0f14',
                    },
                  },
                  // Loading toast styles
                  loading: {
                    style: {
                      background: 'linear-gradient(135deg, rgba(15, 15, 20, 0.95) 0%, rgba(99, 102, 241, 0.1) 100%)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                    },
                  },
                }}
              />
              {/* The <Routes> component will switch between your pages */}
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route
                  path="/forgot-password"
                  element={<ForgotPasswordPage />}
                />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/welcome" element={<CreateUsernamePage />} />
                <Route path="/debug-markets" element={<DebugMarkets />} />
                <Route path="/methodology/:gpu" element={<MethodologyPage />} />
                <Route element={<SharedLayout />}>
                  <Route path="/trade" element={<TradingPage />} />
                  <Route path="/portfolio" element={<PortfolioPage />} />
                  <Route path="/guide" element={<GuidePage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  {/* You can add more pages here later that need the same header/footer */}
                </Route>
              </Routes>
            </div>
          </Router>
          {/* </GeoGatekeeper> */}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
