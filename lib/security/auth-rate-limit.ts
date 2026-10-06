import { createHash } from "node:crypto";
import { createAdminSupabase } from "@/lib/supabase/admin";

/** Persistent, atomic limiter. Authentication must not fail open if storage is unavailable. */
export async function enforceAuthLimit(key: string, limit = 5, seconds = 600) {
  const hashed = createHash("sha256").update(key).digest("hex");
  const { data, error } = await createAdminSupabase().rpc("consume_auth_limit", { p_key: hashed, p_limit: limit, p_seconds: seconds });
  if (error) throw new Error("Authentication temporarily unavailable. Please try again later.");
  if (data !== true) throw new Error("Too many attempts. Please try again later.");
}
