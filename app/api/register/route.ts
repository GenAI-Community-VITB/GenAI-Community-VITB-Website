import { NextRequest, NextResponse } from "next/server";
import { submitStudentRegistration } from "@/lib/data/registrations";
import {
  getClientIp,
  checkRateLimit,
  createRateLimitResponse,
} from "@/lib/security/rate-limiter";
import {
  generateRegistrationFingerprint,
  checkIdempotency,
  saveIdempotencyRecord,
} from "@/lib/security/idempotency";
import { verifyCloudflareTurnstile } from "@/lib/security/turnstile";

// 30-second hard timeout guard: prevents stalled Drive uploads from holding connection slots.
const REQUEST_TIMEOUT_MS = 30_000;

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    // ── MULTI-DIMENSIONAL RATE LIMITING ──
    // 1. IP-level registration rate limiter (10 requests / 10 mins)
    const ipRateLimit = await checkRateLimit(ip, "registration");
    if (ipRateLimit.limited) {
      return createRateLimitResponse(
        ipRateLimit,
        "Too many registration attempts from this network. Please wait a few minutes before trying again."
      );
    }

    const formData = await req.formData();
    const turnstileToken = String(
      formData.get("cf_turnstile_response") || formData.get("turnstile_token") || ""
    ).trim();

    // ── CLOUDFLARE TURNSTILE BOT DEFENSE ──
    const turnstileResult = await verifyCloudflareTurnstile(turnstileToken, ip);
    if (!turnstileResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: turnstileResult.error || "Security verification failed. Please complete the Cloudflare challenge.",
        },
        { status: 400 }
      );
    }

    const eventId = String(formData.get("event_id") || formData.get("eventId") || "").trim();
    const fullName = String(formData.get("full_name") || formData.get("fullName") || "").trim();
    const vitRegNumber = String(formData.get("vit_registration_number") || formData.get("vitRegistrationNumber") || "").trim();
    const branchName = String(formData.get("branch_name") || formData.get("branchName") || "").trim();
    const personalEmail = String(formData.get("personal_email") || formData.get("personalEmail") || "").trim();
    const collegeEmail = String(formData.get("college_email") || formData.get("collegeEmail") || "").trim();
    const phoneNumber = String(formData.get("phone_number") || formData.get("phoneNumber") || "").trim();
    const transactionId = String(formData.get("transaction_id") || formData.get("transactionId") || "").trim();
    const screenshotFile = (formData.get("screenshot_file") || formData.get("screenshot")) as File | null;

    // 2. Email-level registration rate limiter (5 attempts / 10 mins per student)
    if (personalEmail) {
      const emailRateLimit = await checkRateLimit(personalEmail.toLowerCase(), "registration");
      if (emailRateLimit.limited) {
        return createRateLimitResponse(
          emailRateLimit,
          "Too many registration attempts for this email address. Please wait a moment."
        );
      }
    }

    // ── IDEMPOTENCY GUARD ──
    const fingerprint = generateRegistrationFingerprint({
      eventId,
      personalEmail,
      transactionId,
      vitRegistrationNumber: vitRegNumber,
    });

    const cachedResponse = checkIdempotency(fingerprint);
    if (cachedResponse) {
      return NextResponse.json(cachedResponse.responsePayload, {
        status: cachedResponse.status,
      });
    }

    // ── VALIDATION & FILE CHECKS ──
    if (!screenshotFile || !(screenshotFile instanceof File) || screenshotFile.size === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Please upload a clear JPG, PNG, or WEBP payment screenshot under 10 MB.",
        },
        { status: 400 }
      );
    }

    if (screenshotFile.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment screenshot exceeds the 10 MB limit. Please select a smaller image.",
        },
        { status: 400 }
      );
    }

    const screenshotArrayBuffer = await screenshotFile.arrayBuffer();
    const screenshotBuffer = Buffer.from(screenshotArrayBuffer);

    // 30-second timeout guard
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("REQUEST_TIMEOUT")), REQUEST_TIMEOUT_MS)
    );

    const result = await Promise.race([
      submitStudentRegistration({
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
      }),
      timeoutPromise,
    ]);

    if (!result.success) {
      const failurePayload = {
        success: false,
        error: result.error || "Registration submission failed.",
      };
      return NextResponse.json(failurePayload, { status: 400 });
    }

    const successPayload = {
      success: true,
      registrationNumber: result.registrationNumber,
      registrationId: result.registrationId,
      message:
        "Registration submitted successfully! Please check your email (both personal and college inbox) for confirmation.",
    };

    // Save in idempotency store
    saveIdempotencyRecord(fingerprint, successPayload, 200);

    return NextResponse.json(successPayload, {
      headers: {
        "X-RateLimit-Limit": String(ipRateLimit.totalLimit),
        "X-RateLimit-Remaining": String(ipRateLimit.remaining),
      },
    });
  } catch (err: any) {
    if (err?.message === "REQUEST_TIMEOUT") {
      console.error("[/api/register] Request timed out after 30s (Drive upload likely stalled)");
      return NextResponse.json(
        {
          success: false,
          error:
            "The server took too long to respond. Your registration may have been submitted — please check your email before retrying.",
        },
        { status: 504 }
      );
    }
    console.error("Unhandled error in /api/register:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "An unexpected error occurred. Please try again.",
      },
      { status: 500 }
    );
  }
}
