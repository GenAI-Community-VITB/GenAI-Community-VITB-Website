import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedStaff, hasRole } from "@/lib/auth/permissions";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { initializeAndSyncGoogleSheet } from "@/lib/google/sheets";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { role, isTop6, user, profile } = await getAuthenticatedStaff();

    if (!role || !hasRole(role, "tech", profile?.roles)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Executive or Tech Admin role required to initialize Google Sheets." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    const result = await initializeAndSyncGoogleSheet();

    if (action === "flush_and_archive") {
      if (!isTop6) {
        return NextResponse.json(
          { success: false, message: "Only Top-6 Executives can flush audit logs after archival." },
          { status: 403 }
        );
      }

      // Complete Flush: Clear all records from Supabase audit_logs table
      const supabase = createAdminSupabase();
      
      // Delete all existing audit log rows
      await supabase
        .from("audit_logs")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Matches all UUIDs

      // Record a single fresh post-flush entry
      await supabase.from("audit_logs").insert({
        actor_id: user?.id || null,
        actor_email: user?.email || profile?.full_name || "Executive",
        actor_role: role || "tech",
        action: "AUDIT_LOGS_FLUSHED",
        target_type: "database_table",
        target_id: "audit_logs",
        reason: "Full audit logs exported to Google Sheets archive and flushed from Supabase table.",
        metadata: {
          archived_to_sheet: true,
          records_exported: result.recordsSynced["Audit Logs"] || 0,
        },
      });

      result.message = `Successfully exported ${result.recordsSynced["Audit Logs"] || 0} audit logs to Google Sheets, stamped sheet with current date, and flushed the Supabase audit_logs table.`;
    }

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err: any) {
    console.error("Error in sheets sync/archive:", err);
    return NextResponse.json({ success: false, message: err.message || "Internal server error" }, { status: 500 });
  }
}
