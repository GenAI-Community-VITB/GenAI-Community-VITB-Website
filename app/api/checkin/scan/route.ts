import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedStaff, hasRole, isTop6Admin } from "@/lib/auth/permissions";
import { verifyQRTokenDetails, confirmAttendance } from "@/lib/data/registrations";

export async function POST(req: NextRequest) {
  try {
    const { user, profile, role } = await getAuthenticatedStaff();

    if (!user || !profile || !role || !hasRole(role, "volunteer", profile.roles)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Volunteer or Tech login required." },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { action = "verify", qrToken, registrationId, isOverride, overrideReason } = body;

    // STEP 1: Verify token details (does not mark attendance)
    if (action === "verify") {
      if (!qrToken || typeof qrToken !== "string") {
        return NextResponse.json(
          { success: false, message: "QR token is required." },
          { status: 400 },
        );
      }

      const result = await verifyQRTokenDetails(qrToken);
      return NextResponse.json(result);
    }

    // STEP 2: Explicit Confirmation by Volunteer / Tech Lead
    if (action === "confirm") {
      if (!registrationId || typeof registrationId !== "string") {
        return NextResponse.json(
          { success: false, message: "Registration ID is required for confirmation." },
          { status: 400 },
        );
      }

      // Only Top-6 / Tech can perform overrides
      if (isOverride && !isTop6Admin(role, profile.roles)) {
        return NextResponse.json(
          { success: false, message: "Forbidden: Only Executive / Tech leads can override attendance." },
          { status: 403 },
        );
      }

      const result = await confirmAttendance({
        registrationId,
        scannerUserId: user.id,
        scannerName: profile.full_name || user.email || "Staff",
        scannerRole: role,
        isOverride: Boolean(isOverride),
        overrideReason,
      });

      return NextResponse.json(result);
    }

    return NextResponse.json(
      { success: false, message: "Invalid action requested." },
      { status: 400 },
    );
  } catch (err: any) {
    console.error("Error in /api/checkin/scan:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Internal server error." },
      { status: 500 },
    );
  }
}
