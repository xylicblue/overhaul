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
const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

function createDisabledQuery(table) {
  const result = {
    data: [],
    error: new Error(
      `Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to use ${table}.`
    ),
  };

  const query = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") return result.then.bind(Promise.resolve(result));
        if (prop === "catch") return Promise.resolve(result).catch.bind(Promise.resolve(result));
        if (prop === "finally") return Promise.resolve(result).finally.bind(Promise.resolve(result));
        return () => query;
      },
    }
  );

  return query;
}

function createDisabledSupabaseClient() {
  const emptySession = { data: { session: null, user: null }, error: null };

  return {
    auth: {
      getSession: async () => emptySession,
      getUser: async () => emptySession,
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      signOut: async () => ({ error: null }),
      signInWithOAuth: async () => ({ data: null, error: new Error("Supabase is not configured.") }),
      signInWithPassword: async () => ({ data: null, error: new Error("Supabase is not configured.") }),
      signUp: async () => ({ data: null, error: new Error("Supabase is not configured.") }),
      resend: async () => ({ data: null, error: new Error("Supabase is not configured.") }),
      resetPasswordForEmail: async () => ({ data: null, error: new Error("Supabase is not configured.") }),
      updateUser: async () => ({ data: null, error: new Error("Supabase is not configured.") }),
      setSession: async () => ({ data: null, error: new Error("Supabase is not configured.") }),
      // MFA stubs so the enforcement gate degrades gracefully (fail-open) when
      // Supabase is not configured, rather than throwing.
      mfa: {
        enroll: async () => ({ data: null, error: new Error("Supabase is not configured.") }),
        challenge: async () => ({ data: null, error: new Error("Supabase is not configured.") }),
        verify: async () => ({ data: null, error: new Error("Supabase is not configured.") }),
        unenroll: async () => ({ data: null, error: new Error("Supabase is not configured.") }),
        listFactors: async () => ({ data: { totp: [] }, error: null }),
        getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: "aal1", nextLevel: "aal1" }, error: null }),
      },
    },
    from: (table) => createDisabledQuery(table),
    rpc: async () => ({ data: null, error: new Error("Supabase is not configured.") }),
    channel: () => ({
      on() {
        return this;
      },
      subscribe(callback) {
        if (typeof callback === "function") callback("CLOSED");
        return this;
      },
      unsubscribe: () => {},
    }),
    removeChannel: () => {},
  };
}

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

if (!isSupabaseConfigured) {
  console.warn("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to overhaul/.env.local.");
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      ...(customFetch && { global: { fetch: customFetch } }),
    })
  : createDisabledSupabaseClient();
