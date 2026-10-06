import { NextResponse } from "next/server";
import { getAuthenticatedStaff, hasRole } from "@/lib/auth/permissions";
import { run100CheckpointVerification } from "@/lib/utils/diagnostics";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { role, profile } = await getAuthenticatedStaff();

    // Operational diagnostics are restricted to technical administrators.
    if (!role || !hasRole(role, "tech", profile?.roles)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access." },
        { status: 401 },
      );
    }

    const report = await run100CheckpointVerification();

    return NextResponse.json({
      success: true,
      timestamp: report.timestamp,
      allHealthy: report.allOperational,
      score: report.overallScorePercent,
      passed: report.passed,
      warnings: report.warnings,
      failed: report.failed,
      total: report.totalCheckpoints,
      diagnostics: report.checkpoints,
    });
  } catch (err: any) {
    console.error("Error in /api/admin/system-status:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Diagnostics failed" },
      { status: 500 },
    );
  }
}
