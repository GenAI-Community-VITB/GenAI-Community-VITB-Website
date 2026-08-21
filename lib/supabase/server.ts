import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

function getCleanSupabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return raw.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

export async function createServerSupabase() {
  const url = getCleanSupabaseUrl();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  try {
    const cookieStore = await cookies();

    return createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Can be ignored if called from Server Component
          }
        },
      },
    });
  } catch {
    // If called outside request context or during static generation
    return createClient(url, anonKey, {
      auth: { persistSession: false },
    }) as any;
  }
}
