import { createClient, SupabaseClient } from "@supabase/supabase-js";

function getCleanSupabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return raw.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

/**
 * Module-level singleton cache for the admin Supabase client.
 * Keyed by "url|serviceKey" so it auto-invalidates if credentials change.
 * Prevents creating thousands of client instances under concurrent load.
 */
let _adminClientCache: { key: string; client: SupabaseClient } | null = null;

/**
 * Server-only Supabase client that uses the service role key.
 * This bypasses Row Level Security — NEVER expose this to the browser.
 * Returns a cached singleton to avoid repeated auth handshakes under load.
 */
export function createAdminSupabase(): SupabaseClient {
  const url = getCleanSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars. " +
      "The admin client must not fall back to the anon key.",
    );
  }

  const cacheKey = `${url}|${serviceKey.slice(-8)}`;
  if (_adminClientCache && _adminClientCache.key === cacheKey) {
    return _adminClientCache.client;
  }

  const client = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: { "x-application-name": "genai-club-admin" },
    },
  });

  _adminClientCache = { key: cacheKey, client };
  return client;
}
