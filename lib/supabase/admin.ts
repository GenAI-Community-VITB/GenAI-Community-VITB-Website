import { createClient } from "@supabase/supabase-js";

function getCleanSupabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return raw.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

/**
 * Server-only Supabase client that uses the service role key.
 * This bypasses Row Level Security — NEVER expose this to the browser.
 */
export function createAdminSupabase() {
  const url = getCleanSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars. " +
      "The admin client must not fall back to the anon key.",
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
