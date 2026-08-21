import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedStaff, hasRole, isTop6Admin } from "@/lib/auth/permissions";
import { retrySyncFailures, exportEventToNewSpreadsheet } from "@/lib/google/sheets";

export async function POST(req: NextRequest) {
  try {
    const { role, profile } = await getAuthenticatedStaff();

    if (!role || !hasRole(role, "tech", profile?.roles)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Tech or Top-6 role required." },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const { action, eventId } = body;

    // Action 1: Export a specific event to a brand new Google Spreadsheet
    if (action === "export_event_sheet") {
      if (!eventId) {
        return NextResponse.json(
          { success: false, error: "Event ID is required for export." },
          { status: 400 },
        );
      }

      const exportRes = await exportEventToNewSpreadsheet(eventId);
      if (!exportRes.success) {
        return NextResponse.json({ success: false, error: exportRes.error }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Successfully created new Google Sheet archive with ${exportRes.recordsCount} records.`,
        spreadsheetId: exportRes.spreadsheetId,
        spreadsheetUrl: exportRes.spreadsheetUrl,
        recordsCount: exportRes.recordsCount,
      });
    }

    // Action 2: Retry sync failures
    const retryResult = await retrySyncFailures();
    return NextResponse.json({
      success: true,
      message: `Retried ${retryResult.attempted} failed sync operations (${retryResult.succeeded} succeeded, ${retryResult.failed} failed).`,
      details: retryResult,
    });
  } catch (err: any) {
    console.error("Error in /api/admin/export:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
