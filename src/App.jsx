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
import SharedLayout from "./sharedlayout";
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
                toastOptions={{
                  style: {
                    background: "#333",
                    color: "#fff",
                    border: "1px solid #555",
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
