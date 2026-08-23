import { NextRequest, NextResponse } from "next/server";
import { submitStudentRegistration } from "@/lib/data/registrations";

// Lightweight in-memory sliding window rate limiter
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = ipRequestCounts.get(ip);

  if (!record || now > record.resetTime) {
    ipRequestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  record.count++;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    if (isRateLimited(ip)) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many registration attempts. Please wait a minute before trying again.",
        },
        { status: 429 },
      );
    }

    const formData = await req.formData();
    const eventId = String(formData.get("event_id") || "").trim();
    const fullName = String(formData.get("full_name") || "").trim();
    const vitRegNumber = String(formData.get("vit_registration_number") || "").trim();
    const branchName = String(formData.get("branch_name") || "").trim();
    const branchId = String(formData.get("branch_id") || "").trim() || undefined;
    const personalEmail = String(formData.get("personal_email") || "").trim();
    const collegeEmail = String(formData.get("college_email") || "").trim();
    const phoneNumber = String(formData.get("phone_number") || "").trim();
    const transactionId = String(formData.get("transaction_id") || "").trim();
    const screenshotFile = formData.get("screenshot_file") as File | null;

    if (!screenshotFile || !(screenshotFile instanceof File) || screenshotFile.size === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Please upload a clear JPG, PNG, or WEBP payment screenshot under 2 MB.",
        },
        { status: 400 },
      );
    }

    const screenshotArrayBuffer = await screenshotFile.arrayBuffer();
    const screenshotBuffer = Buffer.from(screenshotArrayBuffer);

    const result = await submitStudentRegistration({
      eventId,
      fullName,
      vitRegistrationNumber: vitRegNumber,
      branchName,
      personalEmail,
      collegeEmail,
      phoneNumber,
      transactionId,
      screenshotBuffer,
      screenshotMimeType: screenshotFile.type || "image/jpeg",
      screenshotFileName: screenshotFile.name || "payment_proof.jpg",
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Registration submission failed.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      registrationNumber: result.registrationNumber,
      registrationId: result.registrationId,
      message: "Registration submitted successfully! Please check your email (both personal and college inbox) for confirmation.",
    });
  } catch (err: any) {
    console.error("Unhandled error in /api/register:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "An unexpected error occurred. Please try again.",
      },
      { status: 500 },
    );
  }
}
