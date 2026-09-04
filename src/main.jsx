import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import toast from "react-hot-toast";
import "./index.css";
import App from "./App.jsx";

// Silence the Cloudflare gateway's per-IP "Rate limit exceeded. Try again
// later." toast globally. It fires legitimately during bursty testing and
// adds noise without changing what the user can do about it. Patched on the
// singleton `toast` object so every existing `toast.error(...)` call site
// filters it without needing individual changes. The request still fails as
// before; only the toast is suppressed.
const NOISE_PATTERNS = [/rate limit exceeded/i];
const originalToastError = toast.error.bind(toast);
toast.error = (message, options) => {
  const text = typeof message === "string" ? message : "";
  if (NOISE_PATTERNS.some((rx) => rx.test(text))) return "";
  return originalToastError(message, options);
};

Sentry.init({
  dsn: "https://77dc4525aa4fba3b255e54d10c83d81c@o4511440657514496.ingest.us.sentry.io/4511440661708800",
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 0.2,
  sendDefaultPii: false,
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
