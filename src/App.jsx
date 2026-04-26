import React, { lazy, Suspense, useState } from "react";
import { useLocation } from "react-router-dom";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster, ToastBar, toast } from "react-hot-toast";
import { AuthModalProvider } from "./context/AuthModalContext";
import AuthModal from "./components/AuthModal";
import "@rainbow-me/rainbowkit/styles.css";
import "./App.css";

import { RainbowKitProvider, getDefaultWallets } from "@rainbow-me/rainbowkit";
import { createConfig, WagmiProvider, http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ── Lazy page imports ────────────────────────────────────────────────────────
// Each route gets its own chunk — only downloaded when the user navigates there
const LandingPage         = lazy(() => import("./landingpage"));
const LoginPage           = lazy(() => import("./login"));
const SignupPage          = lazy(() => import("./signup"));
const AboutPage           = lazy(() => import("./about"));
const CreateUsernamePage  = lazy(() => import("./welcome"));
const ForgotPasswordPage  = lazy(() => import("./ForgotPassword"));
const ResetPasswordPage   = lazy(() => import("./ResetPassword"));
const TradingPage         = lazy(() => import("./tradingpage"));
const PortfolioPage       = lazy(() => import("./portfolio"));
const MarketsPage         = lazy(() => import("./markets"));
const GuidePage           = lazy(() => import("./guidepage"));
const SettingsPage        = lazy(() => import("./settings"));
const MethodologyPage     = lazy(() => import("./MethodologyPage"));
const DocsPage            = lazy(() => import("./DocsPage"));
const PrivacyPolicy       = lazy(() => import("./PrivacyPolicy"));
const SecurityPage        = lazy(() => import("./SecurityPage"));
const AdminNotifications  = lazy(() => import("./AdminNotifications"));
const DebugMarkets        = lazy(() => import("./debug-markets").then(m => ({ default: m.DebugMarkets })));
const SharedLayout        = lazy(() => import("./sharedlayout"));

// ── Loading fallback ─────────────────────────────────────────────────────────
// Matches the app background so there's no white flash between routes
const PageLoader = () => (
  <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
    <div className="w-5 h-5 rounded-full border border-white/[0.08] border-t-white/[0.35] animate-spin" />
  </div>
);

// ── Swipe-on-hover toast wrapper ─────────────────────────────────────────────
// Hovering the toast slides it to the right and dismisses it.
const SWIPE_DURATION_MS = 280;
const SwipeToast = ({ t }) => {
  const [swiping, setSwiping] = useState(false);

  const handleEnter = () => {
    if (swiping) return;
    setSwiping(true);
    setTimeout(() => toast.dismiss(t.id), SWIPE_DURATION_MS);
  };

  return (
    <div
      onMouseEnter={handleEnter}
      style={{
        transform: swiping ? "translateX(420px)" : "translateX(0)",
        opacity:   swiping ? 0 : 1,
        transition: `transform ${SWIPE_DURATION_MS}ms cubic-bezier(0.32, 0.72, 0, 1), opacity ${SWIPE_DURATION_MS - 40}ms ease-out`,
        cursor: "pointer",
      }}
      title="Hover to dismiss"
    >
      <ToastBar toast={t} />
    </div>
  );
};

// ── Wagmi / RainbowKit setup ─────────────────────────────────────────────────
const chains    = [sepolia, mainnet];
const projectId = "d07e63a0686f7431f5c7198cb53afa7d";

const { connectors } = getDefaultWallets({
  appName: "ByteStrike",
  projectId,
  chains,
});

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  chains,
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http("https://eth-sepolia.g.alchemy.com/v2/3qoSFfQA1ZOtTO-eyMjN0a1ijwT4AdQy"),
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      // Serve cached data for 4s — just under the 5s refetch interval.
      // Prevents redundant RPC calls when multiple components mount simultaneously.
      staleTime: 4000,
    },
  },
});

// ── Scroll to top on route change ────────────────────────────────────────────
function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// ── App ──────────────────────────────────────────────────────────────────────
function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider chains={chains} initialChain={sepolia}>
          <AuthModalProvider>
            <Router>
              <ScrollToTop />
              {/* AuthModal stays eager — it can be triggered from any page */}
              <AuthModal />
              <div className="App">
                <Toaster
                  position="top-right"
                  gutter={12}
                  containerStyle={{ top: 20, right: 20 }}
                  toastOptions={{
                    style: {
                      background: "rgba(15, 15, 20, 0.95)",
                      backdropFilter: "blur(20px)",
                      color: "#f1f5f9",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "12px",
                      padding: "14px 18px",
                      fontSize: "14px",
                      fontWeight: "500",
                      boxShadow: "0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)",
                      maxWidth: "380px",
                    },
                    duration: 4000,
                    success: {
                      style: {
                        background: "linear-gradient(135deg, rgba(15,15,20,0.95) 0%, rgba(16,185,129,0.1) 100%)",
                        border: "1px solid rgba(16,185,129,0.3)",
                      },
                      iconTheme: { primary: "#10b981", secondary: "#0f0f14" },
                    },
                    error: {
                      style: {
                        background: "linear-gradient(135deg, rgba(15,15,20,0.95) 0%, rgba(239,68,68,0.1) 100%)",
                        border: "1px solid rgba(239,68,68,0.3)",
                      },
                      iconTheme: { primary: "#ef4444", secondary: "#0f0f14" },
                    },
                    loading: {
                      style: {
                        background: "linear-gradient(135deg, rgba(15,15,20,0.95) 0%, rgba(99,102,241,0.1) 100%)",
                        border: "1px solid rgba(99,102,241,0.3)",
                      },
                    },
                  }}
                >
                  {(t) => <SwipeToast t={t} />}
                </Toaster>

                {/* All routes wrapped in a single Suspense boundary */}
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/"                   element={<LandingPage />} />
                    <Route path="/about"              element={<AboutPage />} />
                    <Route path="/login"              element={<LoginPage />} />
                    <Route path="/signup"             element={<SignupPage />} />
                    <Route path="/forgot-password"    element={<ForgotPasswordPage />} />
                    <Route path="/reset-password"     element={<ResetPasswordPage />} />
                    <Route path="/welcome"            element={<CreateUsernamePage />} />
                    <Route path="/debug-markets"      element={<DebugMarkets />} />
                    <Route path="/methodology/:gpu"   element={<MethodologyPage />} />
                    <Route path="/privacy"            element={<PrivacyPolicy />} />
                    <Route path="/security"           element={<SecurityPage />} />
                    <Route path="/admin/notifications" element={<AdminNotifications />} />

                    <Route element={<SharedLayout />}>
                      <Route path="/trade"     element={<TradingPage />} />
                      <Route path="/markets"   element={<MarketsPage />} />
                      <Route path="/portfolio" element={<PortfolioPage />} />
                      <Route path="/guide"     element={<GuidePage />} />
                      <Route path="/docs"      element={<DocsPage />} />
                      <Route path="/settings"  element={<SettingsPage />} />
                    </Route>
                  </Routes>
                </Suspense>

              </div>
            </Router>
          </AuthModalProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
