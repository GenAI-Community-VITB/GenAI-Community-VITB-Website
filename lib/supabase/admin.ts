import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client that uses the service role key.
 * This bypasses Row Level Security — NEVER expose this to the browser.
 * Use only inside Server Actions or Route Handlers that are already
 * protected by your admin-session cookie check.
 */
export function createAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.",
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      // Disable cookie-based session persistence — this is a backend-only client.
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
