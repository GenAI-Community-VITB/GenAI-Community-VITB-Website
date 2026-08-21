import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Server Keep-Alive & Health Ping Endpoint
 * Used by Render / UptimeRobot / Cron workers to keep serverless & backend instances warm.
 */
export async function GET() {
  const startTime = Date.now();
  let dbStatus = "ok";

  try {
    const supabase = createAdminSupabase();
    const { error } = await supabase.from("events").select("id").limit(1);
    if (error) dbStatus = "degraded";
  } catch {
    dbStatus = "unreachable";
  }

  const responseTimeMs = Date.now() - startTime;

  return NextResponse.json({
    status: "healthy",
    service: "GenAI Club Web & Event Engine",
    version: "2026.2.0",
    database: dbStatus,
    timestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime ? Math.floor(process.uptime()) : 0,
    responseTimeMs,
    environment: process.env.NODE_ENV || "production",
  });
}
