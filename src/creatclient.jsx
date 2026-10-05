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

if (import.meta.env.PROD) {
  for (const [name, value] of [["VITE_SUPABASE_URL", supabaseUrl], ["VITE_API_GATEWAY_URL", gatewayUrl]]) {
    if (value && new URL(value).protocol !== "https:") {
      throw new Error(`${name} must use HTTPS in production.`);
    }
  }
  if (!isSupabaseConfigured) {
    throw new Error("Production Supabase configuration is missing.");
  }
}

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
const ENTITY_ACCESS_RPC_PATH = "/rest/v1/rpc/current_entity_access_state";

const customFetch = gatewayUrl
  ? async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      // Keep binary Storage traffic direct. The gateway intentionally limits
      // ordinary request bodies to 1 MB and parses them as text, while private
      // onboarding uploads can be as large as 15 MB. Supabase Storage RLS still
      // enforces the authenticated user's private folder on these requests.
      const parsedUrl = new URL(url);
      if (
        parsedUrl.origin === new URL(supabaseUrl).origin &&
        parsedUrl.pathname.startsWith("/storage/v1/")
      ) {
        return fetch(input, init);
      }
      const routed = url.replace(supabaseUrl, gatewayUrl);
      const isEntityAccessRpc =
        parsedUrl.origin === new URL(supabaseUrl).origin &&
        parsedUrl.pathname === ENTITY_ACCESS_RPC_PATH;

      try {
        const response = await fetch(routed, init);
        if (!isEntityAccessRpc) return response;

        // Entity access is an idempotent, authenticated status/claim RPC. If
        // the proxy rejects the request or returns a non-JSON success body,
        // retry this one endpoint directly against Supabase. The same JWT,
        // grants and database function still enforce every access decision.
        if (response.ok) {
          try {
            await response.clone().json();
            return response;
          } catch {
            console.warn("[Supabase] gateway returned an invalid entity-access response; retrying directly.");
          }
        } else {
          console.warn(`[Supabase] gateway entity-access request failed (${response.status}); retrying directly.`);
        }
        return fetch(url, init);
      } catch (error) {
        if (!isEntityAccessRpc) throw error;
        console.warn("[Supabase] gateway entity-access request failed; retrying directly.", error);
        return fetch(url, init);
      }
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
