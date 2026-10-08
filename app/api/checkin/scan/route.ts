import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedStaff, isTop6Admin } from "@/lib/auth/permissions";
import { verifyQRTokenDetails, confirmAttendance } from "@/lib/data/registrations";
import {
  getClientIp,
  checkRateLimit,
  createRateLimitResponse,
} from "@/lib/security/rate-limiter";

async function withScanTimeout<T>(operation: Promise<T>, milliseconds: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("SCAN_TIMEOUT")), milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, profile, role } = await getAuthenticatedStaff();

    if (!user || !profile || !role) {
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
    const { action = "scan", qrToken, registrationId, isOverride, overrideReason } = body;

    // Gate scans save attendance; explicit lookups remain read-only for overrides.
    if (action === "scan" || action === "verify") {
      if (typeof qrToken !== "string" || !qrToken.trim()) {
        return NextResponse.json(
          { success: false, message: "QR token is required." },
          { status: 400 }
        );
      }

      const result = await withScanTimeout((async () => {
        const verified = await verifyQRTokenDetails(qrToken);
        if (action === "verify" || !verified.success || verified.isAlreadyCheckedIn) return verified;
        if (!verified.participant?.id) return { success: false, message: "Participant not found. Attendance was not recorded." };

        // The RPC locks the registration and atomically writes checkins + checked_in status.
        // Actor identity, event assignment, payment and time-window checks are server-side.
        const recorded = await confirmAttendance({
          registrationId: verified.participant.id,
          scannerUserId: user.id,
          scannerName: profile.full_name || user.email || "Staff",
          scannerRole: role,
        });
        return { ...recorded, participant: recorded.participant || verified.participant };
      })(), 25_000);
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
      const result = await withScanTimeout(
        confirmAttendance({
          registrationId,
          scannerUserId: user.id,
          scannerName: profile.full_name || user.email || "Staff",
          scannerRole: role,
          isOverride: Boolean(isOverride),
          overrideReason,
        }),
        15_000,
      );

      return NextResponse.json(result);
    }

    return NextResponse.json(
      { success: false, message: "Invalid action requested." },
      { status: 400 }
    );
  } catch (err: any) {
    if (err?.message === "SCAN_TIMEOUT") {
      return NextResponse.json(
        { success: false, message: "Could not confirm the scan result in time. Scan again to check whether attendance was saved; duplicate scans will not add another entry." },
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
