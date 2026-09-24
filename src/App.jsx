import React, { lazy, Suspense, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster, resolveValue, toast } from "react-hot-toast";
import { AlertCircle, Check, Info, LoaderCircle, X } from "lucide-react";
import { AuthModalProvider } from "./context/AuthModalContext";
import AuthModal from "./components/AuthModal";
import "@rainbow-me/rainbowkit/styles.css";
import "./App.css";

import { RainbowKitProvider, getDefaultWallets } from "@rainbow-me/rainbowkit";
import { useSessionRefresh } from "./hooks/useSessionRefresh.jsx";
import { drainPendingTrades } from "./services/tradeQueue";
import { createConfig, WagmiProvider, http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import EntityTradingGate from "./components/EntityTradingGate";
import AdminRoute from "./components/AdminRoute";

// ── Lazy page imports ────────────────────────────────────────────────────────
// Each route gets its own chunk — only downloaded when the user navigates there
const LandingPage         = lazy(() => import("./landingpage"));
const LoginPage           = lazy(() => import("./login"));
const SignupPage          = lazy(() => import("./signup"));
const AboutPage           = lazy(() => import("./about"));
const EntityOnboardingPage = lazy(() => import("./EntityOnboardingPage"));
const ConnectedPersonVerificationPage = lazy(() => import("./ConnectedPersonVerificationPage"));
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
const AboutUsPage         = lazy(() => import("./AboutUsPage"));
const AdminNotifications  = lazy(() => import("./AdminNotifications"));
const AdminDashboard      = lazy(() => import("./AdminDashboard"));
const CompliancePortal    = lazy(() => import("./CompliancePortal"));
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
// One presentation layer keeps every existing toast call visually consistent.
const TOAST_PRESENTATION = {
  success: { label: "Completed", icon: Check },
  error: { label: "Action needed", icon: AlertCircle },
  loading: { label: "In progress", icon: LoaderCircle },
  blank: { label: "Notice", icon: Info },
  custom: { label: "Notice", icon: Info },
};

const AppToast = ({ t }) => {
  const presentation = TOAST_PRESENTATION[t.type] || TOAST_PRESENTATION.blank;
  const StatusIcon = presentation.icon;

  return (
    <div
      className={`app-toast app-toast--${t.type}`}
      role={t.type === "error" ? "alert" : "status"}
      aria-live={t.type === "error" ? "assertive" : "polite"}
    >
      <span className="app-toast__icon" aria-hidden="true">
        <StatusIcon
          size={16}
          strokeWidth={2.15}
          className={t.type === "loading" ? "app-toast__spinner" : ""}
        />
      </span>
      <span className="app-toast__content">
        <span className="app-toast__label">{presentation.label}</span>
        <span className="app-toast__message">{resolveValue(t.message, t)}</span>
      </span>
      <button
        type="button"
        className="app-toast__close"
        onClick={() => toast.dismiss(t.id)}
        aria-label="Dismiss notification"
      >
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  );
};

// ── Wagmi / RainbowKit setup ─────────────────────────────────────────────────
const chains    = [sepolia, mainnet];
const projectId = "d07e63a0686f7431f5c7198cb53afa7d";
const sepoliaRpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";

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
    [sepolia.id]: http(sepoliaRpcUrl),
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

// ── Session refresh + pending trades drain ───────────────────────────────────
// Both run as invisible background components inside the app tree so they have
// access to the Zustand store (auth modal) and the Toaster.
function SessionManager() {
  useSessionRefresh();
  return null;
}

function PendingTradesDrain() {
  useEffect(() => {
    drainPendingTrades().then((count) => {
      if (count > 0) {
        // Dynamic import to avoid circular dep — toast is available by now
        import("react-hot-toast").then(({ default: toast }) =>
          toast.success(`Synced ${count} pending trade record${count > 1 ? "s" : ""}.`)
        );
      }
    });
  }, []);
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
              <SessionManager />
              <PendingTradesDrain />
              {/* AuthModal stays eager — it can be triggered from any page */}
              <AuthModal />
              <div className="App">
                <Toaster
                  position="top-right"
                  gutter={10}
                  containerStyle={{ top: 18, right: 18 }}
                  toastOptions={{
                    style: {
                      background: "transparent",
                      color: "inherit",
                      boxShadow: "none",
                      padding: 0,
                      maxWidth: "400px",
                    },
                    duration: 4600,
                    error: { duration: 7500 },
                  }}
                >
                  {(t) => <AppToast t={t} />}
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
                    {/* Authentication callbacks land on the public homepage.
                        Incomplete non-admin accounts receive the onboarding
                        introduction there before choosing when to begin. */}
                    <Route path="/welcome"            element={<LandingPage onboardingWelcome />} />
                    <Route path="/onboarding"         element={<EntityOnboardingPage />} />
                    <Route path="/verify-connected-person" element={<ConnectedPersonVerificationPage />} />
                    <Route path="/debug-markets"      element={<DebugMarkets />} />
                    <Route path="/methodology/:gpu"   element={<MethodologyPage />} />
                    <Route path="/privacy"            element={<PrivacyPolicy />} />
                    <Route path="/security"           element={<SecurityPage />} />
                    <Route path="/about-us"           element={<AboutUsPage />} />
                    <Route path="/admin/notifications" element={<AdminRoute><AdminNotifications /></AdminRoute>} />

                    <Route element={<SharedLayout />}>
                      <Route path="/trade"     element={<TradingPage />} />
                      <Route path="/markets"   element={<MarketsPage />} />
                      <Route path="/portfolio" element={<EntityTradingGate><PortfolioPage /></EntityTradingGate>} />
                      <Route path="/guide"     element={<GuidePage />} />
                      <Route path="/docs"      element={<DocsPage />} />
                      <Route path="/settings"  element={<SettingsPage />} />
                      <Route path="/admin"     element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                      <Route path="/admin/compliance" element={<AdminRoute><CompliancePortal /></AdminRoute>} />
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
