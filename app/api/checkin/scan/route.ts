import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedStaff, hasRole, isTop6Admin } from "@/lib/auth/permissions";
import { verifyQRTokenDetails, confirmAttendance } from "@/lib/data/registrations";
import {
  getClientIp,
  checkRateLimit,
  createRateLimitResponse,
} from "@/lib/security/rate-limiter";

export async function POST(req: NextRequest) {
  try {
    const { user, profile, role } = await getAuthenticatedStaff();

    if (!user || !profile || !role || !hasRole(role, "volunteer", profile.roles)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Volunteer or Tech login required." },
        { status: 401 }
      );
    }

    // ── RATE LIMITING (120 scans / minute / authenticated staff) ──
    const scannerKey = user.id || getClientIp(req);
    const scanRateLimit = await checkRateLimit(scannerKey, "qr_scan");
    if (scanRateLimit.limited) {
      return createRateLimitResponse(
        scanRateLimit,
        "Scanner rate limit exceeded. Please wait a moment before scanning the next pass."
      );
    }

    const body = await req.json();
    const { action = "verify", qrToken, registrationId, isOverride, overrideReason } = body;

    // STEP 1: Verify token details (does not mark attendance)
    if (action === "verify") {
      if (!qrToken || typeof qrToken !== "string") {
        return NextResponse.json(
          { success: false, message: "QR token is required." },
          { status: 400 }
        );
      }

      // 10-second timeout for verify step — fast DB lookup should never take longer
      const result = await Promise.race([
        verifyQRTokenDetails(qrToken),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("VERIFY_TIMEOUT")), 10_000)
        ),
      ]);
      return NextResponse.json(result);
    }

    // STEP 2: Explicit Confirmation by Volunteer / Tech Lead
    if (action === "confirm") {
      if (!registrationId || typeof registrationId !== "string") {
        return NextResponse.json(
          { success: false, message: "Registration ID is required for confirmation." },
          { status: 400 }
        );
      }

      // Only Top-6 / Tech can perform overrides
      if (isOverride && !isTop6Admin(role, profile.roles)) {
        return NextResponse.json(
          {
            success: false,
            message: "Forbidden: Only Executive / Tech leads can override attendance.",
          },
          { status: 403 }
        );
      }

      // 15-second timeout for confirm step
      const result = await Promise.race([
        confirmAttendance({
          registrationId,
          scannerUserId: user.id,
          scannerName: profile.full_name || user.email || "Staff",
          scannerRole: role,
          isOverride: Boolean(isOverride),
          overrideReason,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("CONFIRM_TIMEOUT")), 15_000)
        ),
      ]);

      return NextResponse.json(result);
    }

    return NextResponse.json(
      { success: false, message: "Invalid action requested." },
      { status: 400 }
    );
  } catch (err: any) {
    if (err?.message === "VERIFY_TIMEOUT" || err?.message === "CONFIRM_TIMEOUT") {
      return NextResponse.json(
        { success: false, message: "Scan verification timed out. Please try again." },
        { status: 504 }
      );
    }
    console.error("Error in /api/checkin/scan:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Internal server error." },
      { status: 500 }
    );
  }
}
