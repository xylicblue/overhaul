// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

function normalizeSupabaseUrl(value) {
  const url = value?.trim().replace(/^['"]|['"]$/g, "");
  if (!url || /^https?:\/\//i.test(url)) return url;
  if (/^[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) return `https://${url.replace(/\/$/, "")}`;
  return url;
}

const supabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL);
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_PUBLIC_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
