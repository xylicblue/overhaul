// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

function normalizeUrl(value) {
  const url = value?.trim().replace(/^['"]|['"]$/g, "");
  if (!url || /^https?:\/\//i.test(url)) return url;
  if (/^[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) return `https://${url.replace(/\/$/, "")}`;
  return url;
}

const supabaseUrl  = normalizeUrl(import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL);
const gatewayUrl   = normalizeUrl(import.meta.env.VITE_API_GATEWAY_URL);
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_PUBLIC_KEY;

// Route all REST/auth/functions fetch calls through the CF Worker when available.
// WebSocket connections (Realtime) are NOT affected by global.fetch — they
// continue to connect directly to Supabase, which is required since Workers
// cannot proxy WebSocket upgrades.
const customFetch = gatewayUrl
  ? (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const routed = url.replace(supabaseUrl, gatewayUrl);
      return fetch(routed, init);
    }
  : undefined;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  ...(customFetch && { global: { fetch: customFetch } }),
});
