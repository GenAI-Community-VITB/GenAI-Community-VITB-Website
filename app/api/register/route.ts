import { getAuthenticatedStaff, isAssignedEventVolunteer, hasRole } from "@/lib/auth/permissions";
import { validateImageUpload } from "@/lib/security/image-upload";
import { limitedFormData } from "@/lib/security/request-body";
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
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const ip = getClientIp(req);

    const formData = await limitedFormData(req);
    const eventId = String(formData.get("event_id") || formData.get("eventId") || "").trim();
    const onSpot = formData.get("registration_source") === "on_spot";
    let createdBy: string | undefined;
    if (onSpot) {
      const staff = await getAuthenticatedStaff();
      if (!staff.user || !staff.profile || req.headers.get("origin") !== new URL(req.url).origin
        || (!hasRole(staff.role, "finance", staff.profile.roles) && !await isAssignedEventVolunteer(staff.user.id, eventId))) {
        return NextResponse.json({ success: false, error: "Unauthorized on-spot registration." }, { status: 403 });
      }
      createdBy = staff.user.id;
    }
    const ipRateLimit = await checkRateLimit(createdBy || ip, onSpot ? "on_spot" : "registration");
    if (ipRateLimit.limited) return createRateLimitResponse(ipRateLimit);
    const turnstileToken = String(
      formData.get("cf_turnstile_response") || formData.get("cf-turnstile-response") || formData.get("turnstile_token") || ""
    ).trim();

    // ── CLOUDFLARE TURNSTILE BOT DEFENSE ──
    const turnstileResult = onSpot ? { success: true } : await verifyCloudflareTurnstile(turnstileToken, ip);
    if (!turnstileResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: turnstileResult.error || "Security verification failed. Please complete the Cloudflare challenge.",
        },
        { status: 400 }
      );
    }


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

    try { validateImageUpload(screenshotBuffer, screenshotFile.type); } catch (error) {
      return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
    }

    // This bounds response time; it does not cancel a transaction already in progress.
    const timeoutPromise = new Promise<never>((_, reject) =>
      { timeoutId = setTimeout(() => reject(new Error("REQUEST_TIMEOUT")), REQUEST_TIMEOUT_MS); }
    );

    const result = await Promise.race([
      submitStudentRegistration({
        eventId,
        registrationSource: onSpot ? "on_spot" : "online",
        createdBy,
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
      message: result.warning || "Registration saved. Payment verification is pending; a receipt has been sent to your email.",
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
    if (err?.message === "REQUEST_TOO_LARGE") return NextResponse.json({ success: false, error: "Upload request exceeds the 12 MB limit." }, { status: 413 });
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
        error: "Registration could not be processed. Please check the form and try again.",
      },
      { status: 500 }
    );
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
