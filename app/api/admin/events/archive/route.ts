import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedStaff, isTop6Admin } from "@/lib/auth/permissions";
import { formatISTDate } from "@/lib/utils/format";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { completeAndArchiveEvent, getLiveEventStatistics } from "@/lib/data/registrations";
import { exportEventToNewSpreadsheet } from "@/lib/google/sheets";

export async function POST(req: NextRequest) {
  try {
    const { user, profile, role, isTop6 } = await getAuthenticatedStaff();

    if (!user || !profile || !role || !isTop6) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Event Archival & Data Reset is restricted to the Top-6 Executive Leadership group.",
        },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { eventId, confirmationPhrase } = body;

    if (!eventId) {
      return NextResponse.json({ success: false, message: "Event ID is required." }, { status: 400 });
    }

    if (confirmationPhrase !== "ARCHIVE AND CLEAR EVENT") {
      return NextResponse.json(
        {
          success: false,
          message: 'Safety confirmation phrase mismatch. You must type "ARCHIVE AND CLEAR EVENT" exactly.',
        },
        { status: 400 },
      );
    }

    const supabase = createAdminSupabase();

    // 1. Fetch event and live statistics
    const { data: event, error: eventErr } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (eventErr || !event) {
      return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });
    }

    const stats = await getLiveEventStatistics(eventId);

    // 2. Export everything for this event to a brand-new dedicated Google Spreadsheet
    const exportResult = await exportEventToNewSpreadsheet(eventId);
    if (!exportResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: `Failed to create new Google Spreadsheet export: ${exportResult.error || "Unknown Google Sheets error"}`,
        },
        { status: 500 },
      );
    }

    // 3. Execute atomic cleanup and archive stored procedure
    const result = await completeAndArchiveEvent({
      eventId,
      actorId: user.id,
      actorRole: role,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Event "${event.title}" has been successfully exported to a new Google Sheet (${exportResult.recordsCount} records) and active database flushed for the next event cycle.`,
      spreadsheetUrl: exportResult.spreadsheetUrl,
      spreadsheetId: exportResult.spreadsheetId,
      stats,
    });
  } catch (err: any) {
    console.error("Error in /api/admin/events/archive:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Internal server error during event archival." },
      { status: 500 },
    );
  }
}
