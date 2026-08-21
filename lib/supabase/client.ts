"use client";

import { createBrowserClient } from "@supabase/ssr";

function getCleanSupabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return raw.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

export function createClientSupabase() {
  const url = getCleanSupabaseUrl();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  return createBrowserClient(url, anonKey);
}
