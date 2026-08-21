import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Health Check Endpoint — returns minimal operational status only.
 * Does not expose environment configuration, credential status, or service internals.
 */
export async function GET() {
  const startTime = Date.now();
  let dbStatus = "healthy";
  let dbLatencyMs = 0;

  try {
    const dbStart = Date.now();
    const supabase = createAdminSupabase();
    const { error } = await supabase.from("events").select("id").limit(1);
    dbLatencyMs = Date.now() - dbStart;
    if (error) dbStatus = "degraded";
  } catch {
    dbStatus = "unreachable";
  }

  const responseTimeMs = Date.now() - startTime;
  const isHealthy = dbStatus === "healthy";

  return NextResponse.json(
    {
      status: isHealthy ? "ok" : "degraded",
      ts: Date.now(),
      responseTimeMs,
      db: dbStatus,
      dbLatencyMs,
    },
    { status: isHealthy ? 200 : 503 },
  );
}
