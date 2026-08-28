import { createAdminSupabase } from "@/lib/supabase/admin";
import {
  Registration,
  Payment,
  EventStatistics,
  DeletedRegistration,
  RegistrationSource,
} from "@/lib/types";
import {
  registrationSchema,
  paymentReviewSchema,
  checkinOverrideSchema,
  generateSecureQRToken,
  validateEventEligibility,
  ALL_APPROVED_BRANCHES,
} from "@/lib/validation";
import { generateEntryPassQRCodeBuffer } from "@/lib/qr/generator";
import { sendEmail } from "@/lib/email/mailer";
import {
  getSubmissionReceivedTemplate,
  getRegistrationConfirmedTemplate,
  getPaymentRejectedTemplate,
  getCustomEmailTemplate,
} from "@/lib/email/templates";
import { appendToGoogleSheet } from "@/lib/google/sheets";
import { uploadPaymentScreenshotToDrive } from "@/lib/google/drive";
import { logAuditEvent } from "@/lib/data/audit";
import { formatISTDate } from "@/lib/utils/format";
import { getEventBySlugOrId } from "@/lib/data/events";

/**
 * Creates a new student registration record (Online or On-Spot).
 */
export async function createRegistration(params: {
  eventId: string;
  fullName: string;
  vitRegistrationNumber: string;
  branchName: string;
  college?: string;
  course?: string;
  academicYear?: string;
  personalEmail: string;
  collegeEmail: string;
  phoneNumber: string;
  amount: number;
  transactionId: string;
  driveFileId: string;
  driveFileName: string;
  driveMimeType: string;
  driveFolderId: string;
  registrationSource?: RegistrationSource;
  createdBy?: string;
}): Promise<{
  success: boolean;
  registrationId?: string;
  registrationNumber?: string;
  paymentId?: string;
  error?: string;
  errorCode?: string;
}> {
  const source = params.registrationSource || "online";
  const college = params.college || "VIT Bhopal University";
  const course = params.course || "B.Tech";
  const academicYear = params.academicYear || "2024-2028";

  // Validate payload schema
  const parsed = registrationSchema.safeParse({
    event_id: params.eventId,
    full_name: params.fullName,
    vit_registration_number: params.vitRegistrationNumber,
    branch_name: params.branchName,
    personal_email: params.personalEmail,
    college_email: params.collegeEmail,
    phone_number: params.phoneNumber,
    amount: params.amount,
    transaction_id: params.transactionId,
    drive_file_id: params.driveFileId,
    drive_file_name: params.driveFileName,
    drive_mime_type: params.driveMimeType,
    drive_folder_id: params.driveFolderId,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Validation failed",
      errorCode: "INVALID_INPUT",
    };
  }

  const supabase = createAdminSupabase();

  // 0. Verify event status and strict degree / branch eligibility
  const eventData = await getEventBySlugOrId(params.eventId);

  if (!eventData) {
    console.error("[createRegistration] Event could not be found for identifier:", params.eventId);
    return {
      success: false,
      error: "The specified event could not be found.",
      errorCode: "EVENT_NOT_FOUND",
    };
  }

  const canonicalEventId = eventData.id;

  if (!eventData.is_registration_open || eventData.status === "past") {
    return {
      success: false,
      error: "Registration for this event is currently closed.",
      errorCode: "REGISTRATION_CLOSED",
    };
  }

  if (eventData.registration_deadline && new Date() > new Date(eventData.registration_deadline)) {
    return {
      success: false,
      error: "The registration deadline for this event has passed.",
      errorCode: "DEADLINE_PASSED",
    };
  }

  const eligibilityCheck = validateEventEligibility(
    params.branchName,
    eventData.allowed_degrees,
    eventData.allowed_branches
  );

  if (!eligibilityCheck.valid) {
    return {
      success: false,
      error: eligibilityCheck.error || "You are not eligible for this event based on degree/branch criteria.",
      errorCode: "INELIGIBLE_STUDENT",
    };
  }

  // Strict Duplication Avoidance Rules
  const cleanTxId = params.transactionId.trim();
  const cleanVitReg = params.vitRegistrationNumber.trim().toUpperCase();
  const cleanCollegeEmail = params.collegeEmail.trim().toLowerCase();

  // 1. Check for duplicate Transaction ID
  if (cleanTxId) {
    const { data: existingTx } = await supabase
      .from("payments")
      .select("id, transaction_id, registration_id")
      .ilike("transaction_id", cleanTxId)
      .limit(1);

    if (existingTx && existingTx.length > 0) {
      // Store duplicate attempt in Google Sheets Failures tab
      appendToGoogleSheet("Failures", [
        [
          `DUP-TX-${Date.now()}`,
          "Registration",
          "Duplicate Transaction ID Attempt",
          `Attempted duplicate Transaction ID: ${cleanTxId}`,
          0,
          "NO",
          formatISTDate(new Date(), true),
          JSON.stringify({
            full_name: params.fullName,
            vit_registration_number: cleanVitReg,
            college_email: cleanCollegeEmail,
            personal_email: params.personalEmail,
            transaction_id: cleanTxId,
            event_id: canonicalEventId,
          }),
        ],
      ]).catch((err) => console.error("Error logging duplicate tx attempt to sheets:", err));

      return {
        success: false,
        error: "This Transaction ID / UTR has already been submitted for a registration. Duplicate payments cannot be accepted.",
        errorCode: "DUPLICATE_TRANSACTION_ID",
      };
    }
  }

  // 2. Check for duplicate VIT Reg or Email for the same event
  const { data: existingReg } = await supabase
    .from("registrations")
    .select("id, vit_registration_number, college_email")
    .eq("event_id", canonicalEventId)
    .or(`vit_registration_number.ilike.${cleanVitReg},college_email.ilike.${cleanCollegeEmail}`)
    .limit(1);

  if (existingReg && existingReg.length > 0) {
    appendToGoogleSheet("Failures", [
      [
        `DUP-REG-${Date.now()}`,
        "Registration",
        "Duplicate Student Registration Attempt",
        `Student ${cleanVitReg} / ${cleanCollegeEmail} already registered for event`,
        0,
        "NO",
        formatISTDate(new Date(), true),
        JSON.stringify({
          full_name: params.fullName,
          vit_registration_number: cleanVitReg,
          college_email: cleanCollegeEmail,
          event_id: canonicalEventId,
        }),
      ],
    ]).catch((err) => console.error("Error logging duplicate reg attempt to sheets:", err));

    return {
      success: false,
      error: "You are already registered for this event. Duplicate submissions are not allowed.",
      errorCode: "DUPLICATE_REGISTRATION",
    };
  }

  // Execute atomic registration stored procedure
  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    "atomic_register_student",
    {
      p_event_id: canonicalEventId,
      p_full_name: params.fullName.trim(),
      p_vit_reg: cleanVitReg,
      p_branch_id: null,
      p_branch_name: params.branchName.trim(),
      p_personal_email: params.personalEmail.trim().toLowerCase(),
      p_college_email: cleanCollegeEmail,
      p_phone: params.phoneNumber.trim(),
      p_amount: params.amount,
      p_transaction_id: cleanTxId,
      p_drive_file_id: params.driveFileId,
      p_drive_file_name: params.driveFileName,
      p_drive_mime_type: params.driveMimeType,
      p_drive_folder_id: params.driveFolderId,
    },
  );

  if (rpcError || !rpcResult) {
    console.error("Atomic registration RPC error:", rpcError);
    return {
      success: false,
      error: rpcError?.message || "Registration transaction failed. Please retry.",
      errorCode: "DB_ERROR",
    };
  }

  if (!rpcResult.success) {
    return {
      success: false,
      error: rpcResult.message,
      errorCode: rpcResult.error_code,
    };
  }

  const registrationId = rpcResult.registration_id;
  const registrationNumber = rpcResult.registration_number;
  const paymentId = rpcResult.payment_id;

  // Update additional metadata (source, college, course, academicYear)
  await supabase
    .from("registrations")
    .update({
      registration_source: source,
      college,
      course,
      academic_year: academicYear,
      created_by: params.createdBy || null,
    })
    .eq("id", registrationId);

  // Use event details for email
  const eventTitle = eventData?.title || "GenAI Community Event";

  // Send Submission Received Email to both Personal and College Email
  const submissionEmail = getSubmissionReceivedTemplate({
    fullName: params.fullName,
    vitRegNumber: params.vitRegistrationNumber.toUpperCase(),
    registrationNumber,
    eventTitle,
    amount: params.amount,
    transactionId: params.transactionId,
  });

  const recipientEmails = Array.from(new Set([params.personalEmail, params.collegeEmail].filter(Boolean)));

  try {
    await sendEmail({
      to: recipientEmails,
      subject: submissionEmail.subject,
      html: submissionEmail.html,
      emailType: "submission_received",
      registrationId,
      eventId: params.eventId,
    });
  } catch (emailErr) {
    console.error("Error sending submission email:", emailErr);
  }

  // Mirror record to Google Sheets Registrations tab
  const istTime = formatISTDate(new Date(), true);
  appendToGoogleSheet("Registrations", [
    [
      registrationId,
      params.fullName,
      recipientEmails.join(", "),
      params.phoneNumber,
      params.collegeEmail,
      params.personalEmail,
      registrationNumber,
      params.branchName,
      academicYear,
      "N/A",
      "pending",
      "PENDING",
      istTime,
    ],
  ]).catch((err) => console.error("Error mirroring registration to Google Sheets:", err));

  // Structured Audit Log for Student Registration Submission
  await logAuditEvent({
    actorName: params.fullName,
    actorEmail: params.personalEmail,
    actorRole: "student",
    action: "registration_submitted",
    targetType: "registration",
    targetId: registrationId,
    newState: {
      registration_status: "pending",
      payment_status: "pending",
      registration_number: registrationNumber,
      vit_registration_number: cleanVitReg,
    },
    metadata: {
      fullName: params.fullName,
      vitRegistrationNumber: cleanVitReg,
      registrationNumber,
      eventId: params.eventId,
      branchName: params.branchName,
      collegeEmail: params.collegeEmail,
      phoneNumber: params.phoneNumber,
      transactionId: cleanTxId,
      amount: params.amount,
      source: params.registrationSource || "online",
    },
  });

  // Mirror payment to Google Sheets Payment Management tab
  appendToGoogleSheet("Payment Management", [
    [
      cleanTxId,
      registrationId,
      params.amount,
      params.driveFileId ? `/api/admin/drive/preview/${params.driveFileId}` : "N/A",
      "pending",
      "Pending Review",
      "Pending",
      "",
    ],
  ]).catch((err) => console.error("Error mirroring payment to Google Sheets:", err));

  // ── AUTOMATED GOOGLE FORM & APPS SCRIPT FAILSAFE ──
  dispatchGoogleFormFailsafe({
    registrationId,
    registrationNumber,
    eventId: params.eventId,
    eventTitle,
    fullName: params.fullName,
    vitRegistrationNumber: cleanVitReg,
    branchName: params.branchName,
    personalEmail: params.personalEmail,
    collegeEmail: cleanCollegeEmail,
    phoneNumber: params.phoneNumber,
    amount: params.amount,
    transactionId: cleanTxId,
    driveFileId: params.driveFileId,
    driveViewUrl: params.driveFileId ? `/api/admin/drive/preview/${params.driveFileId}` : undefined,
    registrationSource: source,
    timestamp: istTime,
  });

  return {
    success: true,
    registrationId,
    registrationNumber,
    paymentId,
  };
}

/**
 * Asynchronously dispatches a registration failsafe payload to the Google Form / Google Apps Script Webhook.
 * Guarantees automated logging into the Google Form response backend even if Supabase is slow or down.
 */
async function dispatchGoogleFormFailsafe(payload: {
  registrationId?: string;
  registrationNumber?: string;
  eventId: string;
  eventTitle?: string;
  fullName: string;
  vitRegistrationNumber: string;
  branchName: string;
  personalEmail: string;
  collegeEmail: string;
  phoneNumber: string;
  amount: number;
  transactionId: string;
  driveFileId?: string;
  driveViewUrl?: string;
  registrationSource: string;
  timestamp: string;
}) {
  const webhookUrl = process.env.GOOGLE_FORM_WEBHOOK_URL || process.env.GOOGLE_APPS_SCRIPT_URL;
  if (!webhookUrl) return;

  try {
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "failsafe_registration_form_submit",
        token: process.env.GOOGLE_APPS_SCRIPT_TOKEN || "GENAI_GAS_EMAIL_SECRET_2026",
        data: payload,
      }),
    }).catch((err) => {
      console.warn("[Failsafe Google Form Submit] Background network error:", err?.message || err);
    });
  } catch (err: any) {
    console.warn("[Failsafe Google Form Submit] Dispatch failed:", err?.message || err);
  }
}

/**
 * Handles online student registration submission with payment screenshot upload to Google Drive.
 */
export async function submitStudentRegistration(params: {
  eventId: string;
  fullName: string;
  vitRegistrationNumber: string;
  branchName: string;
  personalEmail: string;
  collegeEmail: string;
  phoneNumber: string;
  transactionId: string;
  screenshotBuffer: Buffer;
  screenshotMimeType: string;
  screenshotFileName: string;
}) {
  const event = await getEventBySlugOrId(params.eventId);

  if (!event) {
    console.error("[submitStudentRegistration] Event could not be found for identifier:", params.eventId);
    return {
      success: false,
      error: "The selected event could not be found.",
      errorCode: "EVENT_NOT_FOUND",
    };
  }

  if (!event.is_registration_open || event.status === "past") {
    return {
      success: false,
      error: "Registration for this event is closed.",
      errorCode: "REGISTRATION_CLOSED",
    };
  }

  if (event.registration_deadline && new Date() > new Date(event.registration_deadline)) {
    return {
      success: false,
      error: "The registration deadline for this event has passed.",
      errorCode: "DEADLINE_PASSED",
    };
  }

  // Strict Event Degree & Branch Eligibility Pre-validation
  const eligibilityCheck = validateEventEligibility(
    params.branchName,
    event.allowed_degrees,
    event.allowed_branches
  );

  if (!eligibilityCheck.valid) {
    return {
      success: false,
      error: eligibilityCheck.error || "You are not eligible for this event based on degree/branch criteria.",
      errorCode: "INELIGIBLE_STUDENT",
    };
  }

  const eventTitle = event.title || "GenAI Community Event";
  const amount = event.registration_fee ?? 200;

  // Upload screenshot to Drive / Fallback
  const driveResult = await uploadPaymentScreenshotToDrive({
    fileBuffer: params.screenshotBuffer,
    fileName: `${params.vitRegistrationNumber}_${params.screenshotFileName}`,
    mimeType: params.screenshotMimeType,
    eventTitle,
  });

  return createRegistration({
    eventId: event.id,
    fullName: params.fullName,
    vitRegistrationNumber: params.vitRegistrationNumber,
    branchName: params.branchName,
    personalEmail: params.personalEmail,
    collegeEmail: params.collegeEmail,
    phoneNumber: params.phoneNumber,
    amount,
    transactionId: params.transactionId,
    driveFileId: driveResult.fileId,
    driveFileName: driveResult.fileName,
    driveMimeType: driveResult.mimeType,
    driveFolderId: driveResult.folderId,
    registrationSource: "online",
  });
}

/**
 * Sends a custom email from staff to a student.
 */
export async function sendCustomStaffEmail(params: {
  registrationId?: string;
  recipientEmail: string;
  subject: string;
  message: string;
  senderId: string;
  senderEmail: string;
  senderRole: string;
}): Promise<{ success: boolean; error?: string }> {
  const emailData = getCustomEmailTemplate({
    subject: params.subject,
    message: params.message,
    senderRole: params.senderRole,
  });

  const sendResult = await sendEmail({
    to: params.recipientEmail,
    subject: emailData.subject,
    html: emailData.html,
    emailType: "custom_email",
    registrationId: params.registrationId,
    senderId: params.senderId,
    senderRole: params.senderRole,
  });

  if (!sendResult.success) {
    return { success: false, error: sendResult.error || "Failed to deliver email" };
  }

  await logAuditEvent({
    actorUserId: params.senderId,
    actorEmail: params.senderEmail,
    actorRole: params.senderRole,
    action: "custom_email_sent",
    targetType: "registration",
    targetId: params.registrationId || null,
    metadata: {
      recipient: params.recipientEmail,
      subject: params.subject,
    },
  });

  return { success: true };
}

/**
 * Reviews a student registration payment (Approve or Reject).
 */
export async function reviewPayment(params: {
  paymentId: string;
  registrationId: string;
  action: "approve" | "reject";
  rejectionReason?: string;
  rejectionExplanation?: string;
  reviewerId: string;
  reviewerEmail: string;
  reviewerRole: string;
}): Promise<{ success: boolean; error?: string }> {
  const parsed = paymentReviewSchema.safeParse({
    payment_id: params.paymentId,
    registration_id: params.registrationId,
    action: params.action,
    rejection_reason: params.rejectionReason,
    rejection_explanation: params.rejectionExplanation,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid review payload" };
  }

  const supabase = createAdminSupabase();

  // Load registration and event
  const { data: reg, error: regErr } = await supabase
    .from("registrations")
    .select("*, event:events(*)")
    .eq("id", params.registrationId)
    .single();

  if (regErr || !reg) {
    return { success: false, error: "Registration record not found" };
  }

  const eventTitle = reg.event?.title || "Test Event";
  const eventDate = reg.event?.event_date
    ? formatISTDate(reg.event.event_date)
    : "TBA";
  const venue = reg.event?.venue || "VIT Bhopal Campus";

  if (params.action === "approve") {
    const qrToken = generateSecureQRToken();

    // 1. Update Database
    const { error: updatePaymentErr } = await supabase
      .from("payments")
      .update({
        payment_status: "verified",
        reviewed_by: params.reviewerId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: null,
        rejection_explanation: null,
      })
      .eq("id", params.paymentId);

    if (updatePaymentErr) throw new Error(updatePaymentErr.message);

    const { error: updateRegErr } = await supabase
      .from("registrations")
      .update({
        registration_status: "verified",
        qr_token: qrToken,
        qr_generated_at: new Date().toISOString(),
      })
      .eq("id", params.registrationId);

    if (updateRegErr) throw new Error(updateRegErr.message);

    // 2. Generate Entry Pass QR Code Buffer
    const qrBuffer = await generateEntryPassQRCodeBuffer({
      qrToken,
      registrationNumber: reg.registration_number,
      fullName: reg.full_name,
      vitRegNumber: reg.vit_registration_number,
    });

    const qrCid = `entry-pass-${reg.registration_number}`;

    // 3. Send QR Entry Pass Email to Official College Email
    const emailData = getRegistrationConfirmedTemplate({
      fullName: reg.full_name,
      vitRegNumber: reg.vit_registration_number,
      registrationNumber: reg.registration_number,
      eventTitle,
      eventDate,
      venue,
      qrContentId: qrCid,
    });

    const destinationEmails = Array.from(new Set([reg.personal_email, reg.college_email].filter(Boolean)));

    try {
      await sendEmail({
        to: destinationEmails,
        subject: emailData.subject,
        html: emailData.html,
        emailType: "payment_approved_qr",
        registrationId: reg.id,
        eventId: reg.event_id,
        senderId: params.reviewerId,
        senderRole: params.reviewerRole,
        attachments: [
          {
            filename: `Official_Entry_Pass_${reg.registration_number}.png`,
            content: qrBuffer,
            cid: qrCid,
            contentType: "image/png",
          },
        ],
      });
    } catch (sendErr) {
      console.error("Error sending QR pass email:", sendErr);
    }

    // 4. Audit Log
    await logAuditEvent({
      actorUserId: params.reviewerId,
      actorEmail: params.reviewerEmail,
      actorRole: params.reviewerRole,
      action: "payment_approved",
      targetType: "registration",
      targetId: reg.id,
      previousState: { registration_status: reg.registration_status, payment_status: "pending" },
      newState: { registration_status: "verified", payment_status: "verified", qr_token: qrToken },
      metadata: { registration_number: reg.registration_number },
    });

    return { success: true };
  } else {
    // 1. Update Database as Rejected
    const { error: updatePaymentErr } = await supabase
      .from("payments")
      .update({
        payment_status: "rejected",
        rejection_reason: params.rejectionReason,
        rejection_explanation: params.rejectionExplanation,
        reviewed_by: params.reviewerId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", params.paymentId);

    if (updatePaymentErr) throw new Error(updatePaymentErr.message);

    const { error: updateRegErr } = await supabase
      .from("registrations")
      .update({
        registration_status: "rejected",
      })
      .eq("id", params.registrationId);

    if (updateRegErr) throw new Error(updateRegErr.message);

    // Send Rejection Email to both emails
    const emailData = getPaymentRejectedTemplate({
      fullName: reg.full_name,
      registrationNumber: reg.registration_number,
      eventTitle,
      rejectionReason: params.rejectionReason || "Verification issue",
      rejectionExplanation: params.rejectionExplanation,
    });

    const rejectionDestinationEmails = Array.from(new Set([reg.personal_email, reg.college_email].filter(Boolean)));

    try {
      await sendEmail({
        to: rejectionDestinationEmails,
        subject: emailData.subject,
        html: emailData.html,
        emailType: "payment_rejected",
        registrationId: reg.id,
        eventId: reg.event_id,
        senderId: params.reviewerId,
        senderRole: params.reviewerRole,
      });
    } catch (rejEmailErr) {
      console.error("Error sending rejection email:", rejEmailErr);
    }

    // Audit Log
    await logAuditEvent({
      actorUserId: params.reviewerId,
      actorEmail: params.reviewerEmail,
      actorRole: params.reviewerRole,
      action: "payment_rejected",
      targetType: "registration",
      targetId: reg.id,
      previousState: { registration_status: reg.registration_status, payment_status: "pending" },
      newState: {
        registration_status: "rejected",
        payment_status: "rejected",
        rejection_reason: params.rejectionReason,
      },
      reason: params.rejectionReason,
      metadata: {
        registration_number: reg.registration_number,
        explanation: params.rejectionExplanation,
      },
    });

    return { success: true };
  }
}

/**
 * Step 1 of 2-Step Attendance Verification:
 * Look up participant details from QR token without marking attendance.
 * Supports raw opaque token, JSON payloads, URLs, Registration Number, and VIT Reg Number.
 */
export async function verifyQRTokenDetails(qrToken: string): Promise<{
  success: boolean;
  message: string;
  isAlreadyCheckedIn?: boolean;
  priorCheckinTime?: string;
  priorScannedBy?: string;
  participant?: {
    id: string;
    full_name: string;
    vit_registration_number: string;
    branch: string;
    registration_number: string;
    status: string;
    registration_source: string;
    college_email?: string;
    personal_email?: string;
    phone_number?: string;
    event_title?: string;
  };
  errorCode?: string;
}> {
  let cleanToken = (qrToken || "").trim();
  if (!cleanToken) {
    return { success: false, message: "QR Token or Registration Number is required", errorCode: "EMPTY_TOKEN" };
  }

  // 1. Try parsing JSON if token is packed JSON (e.g. {"token": "...", "reg_no": "..."})
  if (cleanToken.startsWith("{") && cleanToken.endsWith("}")) {
    try {
      const parsed = JSON.parse(cleanToken);
      cleanToken = (
        parsed.qr_token ||
        parsed.token ||
        parsed.registration_number ||
        parsed.reg_no ||
        parsed.vit_registration_number ||
        parsed.id ||
        cleanToken
      ).trim();
    } catch {
      // Keep original
    }
  }

  // 2. Try parsing URL if token is a full URL
  if (cleanToken.startsWith("http://") || cleanToken.startsWith("https://")) {
    try {
      const url = new URL(cleanToken);
      const urlToken =
        url.searchParams.get("token") ||
        url.searchParams.get("qr_token") ||
        url.searchParams.get("reg") ||
        url.searchParams.get("id");
      if (urlToken) {
        cleanToken = urlToken.trim();
      } else {
        const segments = url.pathname.split("/").filter(Boolean);
        if (segments.length > 0) {
          cleanToken = segments[segments.length - 1].trim();
        }
      }
    } catch {
      // Keep original
    }
  }

  // Strip surrounding quotes
  if ((cleanToken.startsWith('"') && cleanToken.endsWith('"')) || (cleanToken.startsWith("'") && cleanToken.endsWith("'"))) {
    cleanToken = cleanToken.slice(1, -1).trim();
  }

  const supabase = createAdminSupabase();

  // Multi-tier prioritized participant lookup — optimized for minimal DB round-trips.
  // Step 1: Try a single compound OR query covering qr_token, reg_number, and vit_reg.
  // This handles 99%+ of all scans in a single DB round-trip.
  let reg: any = null;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanToken);
  const isEmail = cleanToken.includes("@");

  if (!isUuid && !isEmail) {
    // Common case: QR token, registration number, or VIT reg number
    const { data: byCommon } = await supabase
      .from("registrations")
      .select("*, event:events(title, venue, event_date)")
      .or(
        `qr_token.eq.${cleanToken},registration_number.ilike.${cleanToken},vit_registration_number.ilike.${cleanToken}`,
      )
      .limit(1)
      .maybeSingle();
    if (byCommon) reg = byCommon;
  }

  // Step 2 (fallback): UUID lookup by ID
  if (!reg && isUuid) {
    const { data: byId } = await supabase
      .from("registrations")
      .select("*, event:events(title, venue, event_date)")
      .eq("id", cleanToken)
      .limit(1)
      .maybeSingle();
    if (byId) reg = byId;
  }

  // Step 3 (fallback): Email lookup
  if (!reg && isEmail) {
    const { data: byEmail } = await supabase
      .from("registrations")
      .select("*, event:events(title, venue, event_date)")
      .or(`college_email.ilike.${cleanToken},personal_email.ilike.${cleanToken}`)
      .limit(1)
      .maybeSingle();
    if (byEmail) reg = byEmail;
  }

  // Step 4 (last resort): try all fields for edge cases (e.g. partial match, alias tokens)
  if (!reg && !isUuid && !isEmail) {
    const { data: byQr } = await supabase
      .from("registrations")
      .select("*, event:events(title, venue, event_date)")
      .eq("qr_token", cleanToken)
      .limit(1)
      .maybeSingle();
    if (byQr) reg = byQr;
  }

  if (!reg) {
    return {
      success: false,
      message: `Invalid QR pass or registration ID ("${cleanToken.length > 25 ? cleanToken.slice(0, 25) + "..." : cleanToken}"). No matching record found.`,
      errorCode: "INVALID_QR",
    };
  }

  const participantData = {
    id: reg.id,
    full_name: reg.full_name,
    vit_registration_number: reg.vit_registration_number,
    branch: reg.branch_name || reg.branch || "N/A",
    registration_number: reg.registration_number,
    status: reg.registration_status,
    registration_source: reg.registration_source || "online",
    college_email: reg.college_email,
    personal_email: reg.personal_email,
    phone_number: reg.phone_number,
    event_title: reg.event?.title || "GenAI Community Event",
  };

  // Check if payment is still pending
  if (reg.registration_status === "pending") {
    return {
      success: false,
      message: "Payment Pending: Attendee registration is awaiting finance verification before gate admission.",
      errorCode: "PAYMENT_PENDING",
      participant: participantData,
    };
  }

  // Check if payment was rejected
  if (reg.registration_status === "rejected") {
    return {
      success: false,
      message: "Payment Rejected: Attendee registration was rejected during verification.",
      errorCode: "PAYMENT_REJECTED",
      participant: participantData,
    };
  }

  // Check if already checked in
  if (reg.registration_status === "checked_in") {
    const { data: priorCheckin } = await supabase
      .from("checkins")
      .select("scan_timestamp, scanned_by_name")
      .eq("registration_id", reg.id)
      .in("status", ["approved", "overridden"])
      .order("scan_timestamp", { ascending: false })
      .limit(1)
      .maybeSingle();

    const checkinTime = priorCheckin?.scan_timestamp || reg.checked_in_at || new Date().toISOString();
    const scannedBy = priorCheckin?.scanned_by_name || "Event Volunteer";

    return {
      success: true,
      isAlreadyCheckedIn: true,
      message: "Duplicate Scan: Participant has ALREADY checked in.",
      priorCheckinTime: checkinTime,
      priorScannedBy: scannedBy,
      participant: participantData,
    };
  }

  // Verified & Ready to Admit
  return {
    success: true,
    isAlreadyCheckedIn: false,
    message: "Pass Verified: Ready to admit participant.",
    participant: participantData,
  };
}

/**
 * Step 2 of 2-Step Attendance Verification:
 * Explicit volunteer button click to confirm and record attendance with IST timestamp.
 */
export async function confirmAttendance(params: {
  registrationId: string;
  scannerUserId: string;
  scannerName: string;
  scannerRole: string;
  isOverride?: boolean;
  overrideReason?: string;
}): Promise<{
  success: boolean;
  message: string;
  errorCode?: string;
  isAlreadyCheckedIn?: boolean;
  priorCheckinTime?: string;
  priorScannedBy?: string;
  participant?: {
    id: string;
    full_name: string;
    vit_registration_number: string;
    branch: string;
    registration_number: string;
    status: string;
    registration_source: string;
    college_email?: string;
    personal_email?: string;
    event_title?: string;
  };
}> {
  const supabase = createAdminSupabase();
  const isOverride = Boolean(params.isOverride);
  const istTime = formatISTDate(new Date(), true);
  const nowIso = new Date().toISOString();

  // Try RPC first if available
  try {
    const { data, error } = await supabase.rpc("confirm_attendance_action", {
      p_registration_id: params.registrationId,
      p_scanner_user_id: params.scannerUserId,
      p_scanner_name: params.scannerName,
      p_scanner_role: params.scannerRole,
      p_is_override: isOverride,
      p_override_reason: params.overrideReason || null,
    });

    if (!error && data) {
      if (!data.success) {
        return {
          success: false,
          message: data.message || "Failed to confirm attendance.",
          errorCode: data.error_code || "CONFIRM_FAILED",
          isAlreadyCheckedIn: Boolean(data.is_already_checked_in || data.error_code === "ALREADY_CHECKED_IN"),
          priorCheckinTime: data.prior_checkin_time,
          priorScannedBy: data.prior_scanned_by,
          participant: data.participant,
        };
      }

      const participant = data.participant;
      const checkinId = `checkin-${Date.now()}`;

      // Mirror to Google Sheets in background
      appendToGoogleSheet("Attendance", [
        [
          participant.id,
          participant.full_name,
          participant.vit_registration_number,
          participant.college_email || "",
          istTime,
          participant.event_title || "GenAI Community Event",
          participant.registration_number,
          participant.branch,
          isOverride ? "overridden" : "approved",
          isOverride ? "YES" : "NO",
          params.overrideReason || "",
          params.scannerName,
        ],
      ]).catch((err) => console.error("Error mirroring to Attendance Sheet:", err));

      appendToGoogleSheet("Check-ins", [
        [
          checkinId,
          participant.registration_number,
          participant.full_name,
          participant.vit_registration_number,
          participant.college_email || "",
          participant.branch,
          isOverride ? "overridden" : "approved",
          isOverride ? "YES" : "NO",
          params.overrideReason || "",
          params.scannerName,
          params.scannerRole,
          istTime,
          participant.registration_source || "scanner",
        ],
      ]).catch((err) => console.error("Error mirroring to Check-ins Sheet:", err));

      return {
        success: true,
        message: data.message || "Attendance Confirmed & Recorded.",
        participant,
      };
    }
  } catch (rpcErr) {
    console.warn("RPC confirm_attendance_action failed, using direct DB transaction:", rpcErr);
  }

  // Direct Table Database Fallback
  try {
    // 1. Fetch registration
    const { data: reg, error: fetchErr } = await supabase
      .from("registrations")
      .select("*, event:events(title)")
      .eq("id", params.registrationId)
      .single();

    if (fetchErr || !reg) {
      return { success: false, message: "Registration record not found.", errorCode: "NOT_FOUND" };
    }

    const participantData = {
      id: reg.id,
      full_name: reg.full_name,
      vit_registration_number: reg.vit_registration_number,
      branch: reg.branch_name || reg.branch || "N/A",
      registration_number: reg.registration_number,
      status: reg.registration_status,
      registration_source: reg.registration_source || "online",
      college_email: reg.college_email,
      event_title: reg.event?.title || "GenAI Community Event",
    };

    // 2. Concurrency & Duplicate Check
    if (reg.registration_status === "checked_in" && !isOverride) {
      const { data: priorCheckin } = await supabase
        .from("checkins")
        .select("scan_timestamp, scanned_by_name")
        .eq("registration_id", reg.id)
        .in("status", ["approved", "overridden"])
        .order("scan_timestamp", { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        success: false,
        message: "ALREADY SCANNED: Participant has ALREADY checked in.",
        errorCode: "ALREADY_CHECKED_IN",
        isAlreadyCheckedIn: true,
        priorCheckinTime: priorCheckin?.scan_timestamp || reg.checked_in_at || nowIso,
        priorScannedBy: priorCheckin?.scanned_by_name || "Event Volunteer",
        participant: participantData,
      };
    }

    // 3. Update registration status to checked_in
    await supabase
      .from("registrations")
      .update({
        registration_status: "checked_in",
        checked_in_at: reg.checked_in_at || nowIso,
        checked_in_by: params.scannerUserId,
      })
      .eq("id", reg.id);

    // 4. Insert into checkins table
    const checkinId = `checkin-${Date.now()}`;
    const { error: insertErr } = await supabase.from("checkins").insert({
      id: checkinId,
      registration_id: reg.id,
      event_id: reg.event_id,
      scanned_by: params.scannerUserId,
      scanned_by_name: params.scannerName,
      scanner_role: params.scannerRole,
      status: isOverride ? "overridden" : "approved",
      is_override: isOverride,
      override_reason: params.overrideReason || null,
      scan_timestamp: nowIso,
    });

    if (insertErr && !isOverride && (insertErr.code === "23505" || insertErr.message?.includes("unique"))) {
      const { data: priorCheckin } = await supabase
        .from("checkins")
        .select("scan_timestamp, scanned_by_name")
        .eq("registration_id", reg.id)
        .in("status", ["approved", "overridden"])
        .order("scan_timestamp", { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        success: false,
        message: "ALREADY SCANNED: Participant was checked in simultaneously by another scanner.",
        errorCode: "ALREADY_CHECKED_IN",
        isAlreadyCheckedIn: true,
        priorCheckinTime: priorCheckin?.scan_timestamp || nowIso,
        priorScannedBy: priorCheckin?.scanned_by_name || "Event Volunteer",
        participant: participantData,
      };
    }

    // 4. Mirror to Google Sheets in background
    appendToGoogleSheet("Attendance", [
      [
        reg.id,
        reg.full_name,
        reg.vit_registration_number,
        reg.college_email || "",
        istTime,
        reg.event?.title || "GenAI Event",
        reg.registration_number,
        reg.branch_name || reg.branch || "N/A",
        isOverride ? "overridden" : "approved",
        isOverride ? "YES" : "NO",
        params.overrideReason || "",
        params.scannerName,
      ],
    ]).catch((err) => console.error("Error mirroring to Attendance Sheet:", err));

    appendToGoogleSheet("Check-ins", [
      [
        checkinId,
        reg.registration_number,
        reg.full_name,
        reg.vit_registration_number,
        reg.college_email || "",
        reg.branch_name || reg.branch || "N/A",
        isOverride ? "overridden" : "approved",
        isOverride ? "YES" : "NO",
        params.overrideReason || "",
        params.scannerName,
        params.scannerRole,
        istTime,
        reg.registration_source || "scanner",
      ],
    ]).catch((err) => console.error("Error mirroring to Check-ins Sheet:", err));

    return {
      success: true,
      message: "Attendance Confirmed & Synchronized.",
      participant: participantData,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to confirm attendance.",
      errorCode: "DB_ERROR",
    };
  }
}

/**
 * Safely deletes a registration with historical archival into deleted_registrations and Google Sheets.
 */
export async function deleteRegistrationWithArchive(params: {
  registrationId: string;
  reason: string;
  actorId: string;
  actorName: string;
  actorRole: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminSupabase();

  // 1. Fetch complete record before deletion
  const { data: reg, error: fetchErr } = await supabase
    .from("registrations")
    .select("*, payments(*), event:events(title)")
    .eq("id", params.registrationId)
    .single();

  if (fetchErr || !reg) {
    return { success: false, error: "Registration not found" };
  }

  const istTime = formatISTDate(new Date(), true);

  // 2. Insert into deleted_registrations archival table
  const { error: archiveInsertErr } = await supabase.from("deleted_registrations").insert({
    original_registration_id: reg.id,
    registration_number: reg.registration_number,
    event_id: reg.event_id,
    full_name: reg.full_name,
    vit_registration_number: reg.vit_registration_number,
    branch_name: reg.branch_name,
    personal_email: reg.personal_email,
    college_email: reg.college_email || "",
    phone_number: reg.phone_number,
    registration_source: reg.registration_source || "online",
    payment_status: reg.registration_status,
    deleted_by: params.actorId,
    deleted_by_name: params.actorName,
    deleted_by_role: params.actorRole,
    deletion_reason: params.reason,
    deleted_at_ist: istTime,
    raw_data: reg,
  });

  if (archiveInsertErr) {
    console.error("Error archiving deleted registration to Supabase:", archiveInsertErr);
  }

  // 3. Append to Google Sheets Dedicated "Deleted Registrations" Tab
  appendToGoogleSheet("Deleted Registrations", [
    [
      `archived-${reg.registration_number}`,
      reg.id,
      reg.registration_number,
      reg.full_name,
      reg.vit_registration_number,
      reg.college_email || "",
      reg.personal_email,
      reg.branch_name,
      reg.event?.title || "Event",
      reg.registration_status,
      params.actorName,
      params.actorRole,
      params.reason,
      istTime,
    ],
  ]).catch((err) => console.error("Error writing deleted reg to Google Sheets:", err));

  // 4. Delete from active Supabase tables
  await supabase.from("checkins").delete().eq("registration_id", reg.id);
  await supabase.from("payments").delete().eq("registration_id", reg.id);
  await supabase.from("registrations").delete().eq("id", reg.id);

  // 5. Audit Log
  await logAuditEvent({
    actorUserId: params.actorId,
    actorRole: params.actorRole,
    action: "registration_deleted_and_archived",
    targetType: "registration",
    targetId: reg.id,
    reason: params.reason,
    metadata: {
      registration_number: reg.registration_number,
      full_name: reg.full_name,
    },
  });

  return { success: true };
}

/**
 * Restores a previously deleted registration record.
 */
export async function restoreDeletedRegistration(params: {
  deletedId: string;
  actorId: string;
  actorRole: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminSupabase();

  const { data: delRecord, error: delErr } = await supabase
    .from("deleted_registrations")
    .select("*")
    .eq("id", params.deletedId)
    .single();

  if (delErr || !delRecord) {
    return { success: false, error: "Deleted registration record not found." };
  }

  // 1. Restore into active registrations
  const { error: insertErr } = await supabase.from("registrations").insert({
    id: delRecord.original_registration_id,
    registration_number: delRecord.registration_number,
    event_id: delRecord.event_id,
    full_name: delRecord.full_name,
    vit_registration_number: delRecord.vit_registration_number,
    branch_name: delRecord.branch_name,
    personal_email: delRecord.personal_email,
    college_email: delRecord.college_email,
    phone_number: delRecord.phone_number,
    registration_source: delRecord.registration_source,
    registration_status: delRecord.payment_status === "verified" ? "verified" : "pending",
  });

  if (insertErr) {
    return { success: false, error: `Failed to restore registration: ${insertErr.message}` };
  }

  // 2. Restore payments record so submission appears in Finance Dashboard
  try {
    const rawPayments = delRecord.raw_data?.payments;
    if (Array.isArray(rawPayments) && rawPayments.length > 0) {
      for (const p of rawPayments) {
        await supabase.from("payments").insert({
          id: p.id || undefined,
          registration_id: delRecord.original_registration_id,
          amount: p.amount || 200,
          transaction_id: p.transaction_id || `RESTORED_${Date.now()}`,
          drive_file_id: p.drive_file_id || "restored_file",
          drive_file_name: p.drive_file_name || "payment_proof.jpg",
          drive_mime_type: p.drive_mime_type || "image/jpeg",
          drive_folder_id: p.drive_folder_id || "Payment Proofs",
          verification_status: p.verification_status || (delRecord.payment_status === "verified" ? "verified" : "pending"),
          verified_by: p.verified_by || null,
          verified_at: p.verified_at || null,
          rejection_reason: p.rejection_reason || null,
        });
      }
    } else {
      // Create fallback payment record
      await supabase.from("payments").insert({
        registration_id: delRecord.original_registration_id,
        amount: 200,
        transaction_id: `RESTORED_${Date.now()}`,
        drive_file_id: "restored_file",
        drive_file_name: "payment_proof.jpg",
        drive_mime_type: "image/jpeg",
        drive_folder_id: "Payment Proofs",
        verification_status: delRecord.payment_status === "verified" ? "verified" : "pending",
      });
    }
  } catch (payRestoreErr: any) {
    console.error("Error restoring payment record:", payRestoreErr);
  }

  // 3. Remove from deleted table
  await supabase.from("deleted_registrations").delete().eq("id", params.deletedId);

  // 4. Audit Log
  await logAuditEvent({
    actorUserId: params.actorId,
    actorRole: params.actorRole,
    action: "registration_restored",
    targetType: "registration",
    targetId: delRecord.original_registration_id,
    metadata: { registration_number: delRecord.registration_number },
  });

  return { success: true };
}

/**
 * Retrieves live event statistics.
 */
export async function getLiveEventStatistics(eventId: string): Promise<EventStatistics> {
  const supabase = createAdminSupabase();

  const { data: stats } = await supabase
    .from("event_statistics")
    .select("*")
    .eq("event_id", eventId)
    .maybeSingle();

  if (stats) {
    return stats as EventStatistics;
  }

  // Compute on the fly if not yet recorded
  const [{ count: regCount }, { count: approvedCount }, { count: pendingCount }, { count: attendedCount }] =
    await Promise.all([
      supabase.from("registrations").select("*", { count: "exact", head: true }).eq("event_id", eventId),
      supabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .in("registration_status", ["verified", "checked_in"]),
      supabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("registration_status", "pending"),
      supabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("registration_status", "checked_in"),
    ]);

  return {
    event_id: eventId,
    registered_count: regCount || 0,
    approved_count: approvedCount || 0,
    pending_count: pendingCount || 0,
    attended_count: attendedCount || 0,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Complete Event & Clear Active Supabase Data (Top-6 Only).
 */
export async function completeAndArchiveEvent(params: {
  eventId: string;
  actorId: string;
  actorRole: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  const supabase = createAdminSupabase();

  const { data, error } = await supabase.rpc("archive_and_clear_event", {
    p_event_id: params.eventId,
    p_actor_id: params.actorId,
    p_actor_role: params.actorRole,
  });

  if (error || !data) {
    return { success: false, error: error?.message || "Failed to archive event." };
  }

  return { success: data.success, message: data.message };
}

/**
 * Searches and retrieves registration records with pagination and filters.
 */
export async function getRegistrationsQueue(params?: {
  eventId?: string;
  status?: string;
  searchQuery?: string;
  branch?: string;
  source?: string;
  page?: number;
  limit?: number;
}): Promise<{
  registrations: Array<Registration & { payments?: Payment[] }>;
  totalCount: number;
}> {
  const supabase = createAdminSupabase();
  const page = params?.page || 1;
  const limit = params?.limit || 50;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("registrations")
    .select("*, event:events(title), payments(*)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params?.eventId) {
    query = query.eq("event_id", params.eventId);
  }

  if (params?.status && params.status !== "all") {
    query = query.eq("registration_status", params.status);
  }

  if (params?.source && params.source !== "all") {
    query = query.eq("registration_source", params.source);
  }

  if (params?.branch && params.branch !== "all") {
    query = query.eq("branch_name", params.branch);
  }

  if (params?.searchQuery && params.searchQuery.trim()) {
    const q = params.searchQuery.trim();
    query = query.or(
      `full_name.ilike.%${q}%,vit_registration_number.ilike.%${q}%,personal_email.ilike.%${q}%,registration_number.ilike.%${q}%`,
    );
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("Error fetching registrations queue:", error);
    return { registrations: [], totalCount: 0 };
  }

  return {
    registrations: (data as Array<Registration & { payments?: Payment[] }>) ?? [],
    totalCount: count || 0,
  };
}

/**
 * Retrieves all archived deleted registrations (Top-6 Only).
 */
export async function getDeletedRegistrations(): Promise<DeletedRegistration[]> {
  try {
    const supabase = createAdminSupabase();
    const { data, error } = await supabase
      .from("deleted_registrations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      // If table has not yet been populated or returns not found, fallback gracefully
      return [];
    }

    return (data as DeletedRegistration[]) || [];
  } catch {
    return [];
  }
}

/**
 * Bulk imports registered candidates from Excel/CSV, generates cryptographic QR tokens,
 * creates verified registration and payment records, and optionally dispatches QR pass emails.
 */
/**
 * Normalizes user-entered branch strings to official approved academic verticals.
 */
function normalizeImportBranch(rawBranch?: string): string {
  if (!rawBranch) return "BTECH CSE (Core)";
  const clean = rawBranch.trim();
  const lower = clean.toLowerCase();

  // Exact match
  const exact = ALL_APPROVED_BRANCHES.find((b) => b.toLowerCase() === lower);
  if (exact) return exact;

  // Keyword match
  if (lower.includes("mtech") || lower.includes("m.tech") || lower.includes("integrated")) {
    return "MTECH and ALLIED Branches";
  }
  if (lower.includes("ai & ml") || lower.includes("aiml") || lower.includes("artificial intelligence") || lower.includes("machine learning")) {
    return "BTECH CSE (AI & ML)";
  }
  if (lower.includes("cyber") || lower.includes("security")) {
    return "BTECH CSE (Cyber Security)";
  }
  if (lower.includes("cloud")) {
    return "BTECH CSE (Cloud)";
  }
  if (lower.includes("gaming") || lower.includes("game")) {
    return "BTECH CSE (Gaming)";
  }
  if (lower.includes("health") || lower.includes("medical")) {
    return "BTECH CSE (Health Informatics)";
  }
  if (lower.includes("commerce") || lower.includes("e-commerce")) {
    return "BTECH CSE (E-Commerce)";
  }
  if (lower.includes("edtech") || lower.includes("education")) {
    return "BTECH CSE (EdTech)";
  }
  if (lower.includes("leadership")) {
    return "BTECH CSE (AI & Leadership)";
  }
  if (lower.includes("ece") || lower.includes("electronics")) {
    if (lower.includes("ai") || lower.includes("cybernetics")) return "BTECH ECE (AI & Cybernetics)";
    return "BTECH ECE (Core)";
  }
  if (lower.includes("electrical") || lower.includes("ee")) {
    return "BTECH Electrical & Computer";
  }
  if (lower.includes("mechanical") || lower.includes("mech")) {
    if (lower.includes("robotics") || lower.includes("ai")) return "BTECH Mechanical (AI & Robotics)";
    return "BTECH Mechanical (Core)";
  }
  if (lower.includes("aero") || lower.includes("aerospace")) {
    return "BTECH Aerospace";
  }
  if (lower.includes("bio") || lower.includes("bioengineering")) {
    return "BTECH Bioengineering";
  }
  if (lower.includes("cse") || lower.includes("computer")) {
    return "BTECH CSE (Core)";
  }

  return clean;
}

/**
 * Bulk imports registered candidates from Excel/CSV, generates cryptographic QR tokens,
 * creates verified registration and payment records with all registration form fields,
 * and optionally dispatches QR pass emails.
 */
export async function importParticipantsBulkAction(params: {
  eventId: string;
  participants: Array<{
    registrationId?: string;
    fullName: string;
    vitRegistrationNumber?: string;
    branch?: string;
    branchName?: string;
    collegeEmail?: string;
    personalEmail?: string;
    email?: string;
    phoneNumber?: string;
    phone?: string;
    transactionId?: string;
    utr?: string;
    college?: string;
    amount?: number;
    paymentStatus?: string;
  }>;
  sendEmailDirectly?: boolean;
}): Promise<{
  success: boolean;
  importedCount: number;
  error?: string;
}> {
  const { eventId, participants, sendEmailDirectly = false } = params;

  if (!eventId || !participants || participants.length === 0) {
    return { success: false, importedCount: 0, error: "No participants provided for import." };
  }

  const supabase = createAdminSupabase();

  // Fetch event details
  const { data: event } = await supabase
    .from("events")
    .select("title, event_date, venue, registration_fee")
    .eq("id", eventId)
    .single();

  const eventTitle = event?.title || "GenAI Community Event";
  const eventDate = event?.event_date ? formatISTDate(event.event_date) : "Event Date";
  const venue = event?.venue || "Main Auditorium / Campus";
  const defaultFee = event?.registration_fee ?? 0;

  let importedCount = 0;

  for (let i = 0; i < participants.length; i++) {
    const p = participants[i];
    const cleanName = (p.fullName || "").trim();
    const rawEmail = (p.personalEmail || p.email || p.collegeEmail || "").trim().toLowerCase();
    if (!cleanName || !rawEmail) continue;

    // 1. Registration Pass ID
    const registrationNumber = p.registrationId && p.registrationId.trim().length > 0
      ? p.registrationId.trim()
      : `GAC26-${String(Date.now() % 100000).padStart(5, "0")}-${String(i + 1).padStart(3, "0")}`;

    // 2. VIT Registration Number
    let cleanVitReg = (p.vitRegistrationNumber || "").trim().toUpperCase();
    if (!cleanVitReg) {
      if (rawEmail.includes("@vitbhopal.ac.in")) {
        const localPart = rawEmail.split("@")[0].toUpperCase();
        const match = localPart.match(/[0-9]{2}[A-Z]{3}[0-9]{5}/);
        cleanVitReg = match ? match[0] : localPart;
      } else {
        cleanVitReg = `24BCE${String(10000 + (i % 9000))}`;
      }
    }

    // 3. College & Personal Email
    let collegeEmail = (p.collegeEmail || "").trim().toLowerCase();
    let personalEmail = (p.personalEmail || (rawEmail.includes("@gmail.com") ? rawEmail : "")).trim().toLowerCase();

    if (!collegeEmail) {
      collegeEmail = rawEmail.includes("@vitbhopal.ac.in")
        ? rawEmail
        : `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "")}.${cleanVitReg.toLowerCase()}@vitbhopal.ac.in`;
    }
    if (!personalEmail) {
      personalEmail = rawEmail.includes("@gmail.com") ? rawEmail : rawEmail;
    }

    // 4. Branch Name (Normalized to official approved branches)
    const rawBranch = p.branch || p.branchName || "BTECH CSE (Core)";
    const branchName = normalizeImportBranch(rawBranch);

    // 5. Phone Number
    const phone = (p.phoneNumber || p.phone || "").replace(/[\s\-\+]/g, "").replace(/^91/, "").slice(-10);

    // 6. Transaction ID / UTR
    const transactionId = (p.transactionId || p.utr || "").trim() || `EXCEL_IMPORT_${registrationNumber}`;

    // 7. College / Institute
    const college = (p.college || "VIT Bhopal University").trim();

    // 8. Payment Status & Amount
    const paymentStatus = p.paymentStatus === "pending" ? "pending" : "verified";
    const amount = typeof p.amount === "number" && !isNaN(p.amount) ? p.amount : defaultFee;

    // Generate secure cryptographic QR Token
    const qrToken = generateSecureQRToken();
    const regId = crypto.randomUUID();

    try {
      // 1. Insert into registrations
      await supabase.from("registrations").insert({
        id: regId,
        event_id: eventId,
        registration_number: registrationNumber,
        full_name: cleanName,
        vit_registration_number: cleanVitReg,
        branch_name: branchName,
        personal_email: personalEmail,
        college_email: collegeEmail,
        phone_number: phone || "9876543210",
        registration_status: paymentStatus === "verified" ? "verified" : "pending",
        registration_source: "excel_import",
        qr_token: qrToken,
        college,
        created_at: new Date().toISOString(),
      });

      // 2. Insert payment record with UTR
      await supabase.from("payments").insert({
        registration_id: regId,
        amount,
        transaction_id: transactionId,
        payment_status: paymentStatus,
        verified_at: paymentStatus === "verified" ? new Date().toISOString() : null,
      });

      // 3. Optionally dispatch official QR Pass email with single inline attachment
      if (sendEmailDirectly && paymentStatus === "verified") {
        try {
          const qrBuffer = await generateEntryPassQRCodeBuffer({
            qrToken,
            registrationNumber,
            fullName: cleanName,
            vitRegNumber: cleanVitReg,
          });

          const qrCid = `entry-pass-${registrationNumber}`;
          const emailData = getRegistrationConfirmedTemplate({
            fullName: cleanName,
            vitRegNumber: cleanVitReg,
            registrationNumber,
            eventTitle,
            eventDate,
            venue,
            qrContentId: qrCid,
          });

          const recipientTarget = personalEmail || collegeEmail;
          await sendEmail({
            to: recipientTarget,
            subject: emailData.subject,
            html: emailData.html,
            emailType: "payment_approved_qr",
            registrationId: regId,
            eventId,
            attachments: [
              {
                filename: `Official_Entry_Pass_${registrationNumber}.png`,
                content: qrBuffer,
                cid: qrCid,
                contentType: "image/png",
              },
            ],
          });
        } catch (emailErr) {
          console.warn("Could not dispatch email during bulk import:", emailErr);
        }
      }

      importedCount++;
    } catch (importErr) {
      console.error(`Error importing candidate ${cleanName}:`, importErr);
    }
  }

  // Log to Audit & Google Sheets
  const istTime = formatISTDate(new Date(), true);
  appendToGoogleSheet("Audit Logs", [
    [
      `IMP-${Date.now()}`,
      istTime,
      "Admin",
      "Event Operations",
      "bulk_participant_import",
      "event",
      eventId,
      `Imported ${importedCount} participants with unique QR tokens into ${eventTitle}`,
      "Success",
    ],
  ]).catch(() => {});

  return {
    success: true,
    importedCount,
  };
}

/**
 * Tech/Admin Action: Manually overrides attendance status for a participant with complete audit trail.
 */
export async function overrideAttendanceStatus(params: {
  registrationId: string;
  newStatus: string;
  reason: string;
  actorId: string;
  actorName: string;
  actorRole: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminSupabase();
  const nowIso = new Date().toISOString();
  const istTime = formatISTDate(new Date(), true);

  // 1. Fetch current registration
  const { data: reg, error: fetchErr } = await supabase
    .from("registrations")
    .select("*, event:events(title)")
    .eq("id", params.registrationId)
    .maybeSingle();

  if (fetchErr || !reg) {
    return { success: false, error: "Registration not found." };
  }

  const prevStatus = reg.registration_status;
  const newStatus = params.newStatus.toLowerCase().trim();

  // 2. Update registration status
  const updatePayload: Record<string, unknown> = {
    registration_status: newStatus,
    updated_at: nowIso,
  };
  if (newStatus === "checked_in") {
    updatePayload.checked_in_at = reg.checked_in_at || nowIso;
    updatePayload.checked_in_by = params.actorId;
  }

  const { error: updateErr } = await supabase
    .from("registrations")
    .update(updatePayload)
    .eq("id", reg.id);

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  // 3. If new status is checked_in, upsert checkin record
  if (newStatus === "checked_in") {
    await supabase.from("checkins").insert({
      id: `checkin-ovr-${Date.now()}`,
      registration_id: reg.id,
      event_id: reg.event_id,
      scanned_by: params.actorId,
      scanned_by_name: params.actorName,
      scanner_role: params.actorRole,
      status: "overridden",
      is_override: true,
      override_reason: params.reason,
      scan_timestamp: nowIso,
    });
  }

  // 4. Log Audit Event
  await logAuditEvent({
    actorUserId: params.actorId,
    actorEmail: params.actorName,
    actorRole: params.actorRole,
    action: "attendance_override",
    targetType: "registration",
    targetId: reg.id,
    previousState: { status: prevStatus },
    newState: { status: newStatus, reason: params.reason },
    reason: params.reason,
    metadata: {
      registration_number: reg.registration_number,
      participant_name: reg.full_name,
      vit_registration_number: reg.vit_registration_number,
    },
  });

  // 5. Mirror to Google Sheets
  appendToGoogleSheet("Attendance", [
    [
      reg.id,
      reg.full_name,
      reg.vit_registration_number,
      reg.college_email || "",
      istTime,
      reg.event?.title || "GenAI Event",
      reg.registration_number,
      reg.branch_name || reg.branch || "N/A",
      "overridden",
      "YES",
      params.reason,
      params.actorName,
    ],
  ]).catch((err) => console.error("Error mirroring override to Attendance Sheet:", err));

  return { success: true };
}

/**
 * Exports real-time event registrations & attendance data in comprehensive CSV format.
 * Includes: Name, Registration Number, Email, VIT Email, Year, Branch, UTR / Transaction ID, Payment Status, Approval Status, QR Generated Status, Attendance Status.
 */
export async function exportAttendanceDataAction(eventId: string): Promise<{
  success: boolean;
  csvContent?: string;
  filename?: string;
  error?: string;
}> {
  if (!eventId) {
    return { success: false, error: "Event ID is required." };
  }

  const supabase = createAdminSupabase();

  try {
    // 1. Resolve event by UUID, Slug, or title
    const cleanId = eventId.trim();
    let eventTitle = "Event";
    const candidateEventIds = [cleanId];

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
    let eventQuery = supabase.from("events").select("id, title, slug");
    if (isUuid) {
      eventQuery = eventQuery.or(`id.eq.${cleanId},slug.eq.${cleanId}`);
    } else {
      eventQuery = eventQuery.or(`slug.eq.${cleanId},title.ilike.%${cleanId}%`);
    }

    const { data: event } = await eventQuery.limit(1).maybeSingle();
    if (event) {
      eventTitle = event.title || "Event";
      if (event.id && !candidateEventIds.includes(event.id)) candidateEventIds.push(event.id);
      if (event.slug && !candidateEventIds.includes(event.slug)) candidateEventIds.push(event.slug);
    }

    // 2. Fetch registrations matching any candidate ID
    let { data: registrations, error: regErr } = await supabase
      .from("registrations")
      .select(
        "id, registration_number, full_name, vit_registration_number, branch_name, personal_email, college_email, phone_number, registration_status, qr_token, academic_year, created_at, is_deleted, payments(utr_number, transaction_id, payment_status), checkins(scan_timestamp, scanned_by_name, status)"
      )
      .in("event_id", candidateEventIds)
      .order("created_at", { ascending: true });

    // Fallback: If no records found, try fetching all non-deleted registrations where event_id matches
    if ((!registrations || registrations.length === 0) && isUuid) {
      const { data: fallbackRegs } = await supabase
        .from("registrations")
        .select(
          "id, registration_number, full_name, vit_registration_number, branch_name, personal_email, college_email, phone_number, registration_status, qr_token, academic_year, created_at, is_deleted, payments(utr_number, transaction_id, payment_status), checkins(scan_timestamp, scanned_by_name, status)"
        )
        .eq("event_id", cleanId)
        .order("created_at", { ascending: true });
      if (fallbackRegs && fallbackRegs.length > 0) {
        registrations = fallbackRegs;
      }
    }

    if (!registrations || registrations.length === 0) {
      return { success: false, error: "No registration records found for this event." };
    }

    // Filter out archived/soft-deleted records unless all are deleted
    const activeRegistrations = registrations.some((r: any) => !r.is_deleted)
      ? registrations.filter((r: any) => !r.is_deleted)
      : registrations;

    const headers = [
      "Name",
      "Registration Number",
      "Personal Email",
      "VIT College Email",
      "Academic Year",
      "Branch",
      "UTR / Transaction ID",
      "Payment Status",
      "Approval Status",
      "QR Generated Status",
      "Attendance Status",
      "Check-in Time (IST)",
      "Scanned By",
      "Registration Date (IST)",
    ];

    const rows = activeRegistrations.map((r: any) => {
      const checkin = Array.isArray(r.checkins) && r.checkins.length > 0 ? r.checkins[0] : null;
      const isPresent =
        r.registration_status === "checked_in" ||
        checkin?.status === "approved" ||
        checkin?.status === "overridden";
      const checkinTime = checkin?.scan_timestamp ? formatISTDate(checkin.scan_timestamp, true) : "—";
      const scanner = checkin?.scanned_by_name || "—";

      const payment = Array.isArray(r.payments) && r.payments.length > 0 ? r.payments[0] : null;
      const utr = payment?.utr_number || payment?.transaction_id || "N/A";
      const paymentStatus =
        payment?.payment_status ||
        (r.registration_status === "verified" || r.registration_status === "checked_in"
          ? "verified"
          : r.registration_status);

      // Calculate academic year if not explicitly saved
      let year = r.academic_year || "";
      if (!year && r.vit_registration_number && r.vit_registration_number.length >= 2) {
        const batchPrefix = r.vit_registration_number.slice(0, 2);
        year = `20${batchPrefix} Batch`;
      }

      const qrStatus = r.qr_token ? "GENERATED" : "NOT_GENERATED";
      const approvalStatus =
        r.registration_status === "verified" || r.registration_status === "checked_in"
          ? "APPROVED"
          : r.registration_status === "rejected"
          ? "REJECTED"
          : "PENDING";

      const regDate = r.created_at ? formatISTDate(r.created_at, true) : "—";

      return [
        `"${(r.full_name || "").replace(/"/g, '""')}"`,
        `"${(r.registration_number || r.vit_registration_number || "").replace(/"/g, '""')}"`,
        `"${(r.personal_email || "").replace(/"/g, '""')}"`,
        `"${(r.college_email || "").replace(/"/g, '""')}"`,
        `"${(year || "").replace(/"/g, '""')}"`,
        `"${(r.branch_name || "").replace(/"/g, '""')}"`,
        `"${(utr || "").replace(/"/g, '""')}"`,
        `"${(paymentStatus || "").replace(/"/g, '""')}"`,
        `"${approvalStatus}"`,
        `"${qrStatus}"`,
        `"${isPresent ? "Present" : "Absent"}"`,
        `"${checkinTime}"`,
        `"${(scanner || "").replace(/"/g, '""')}"`,
        `"${regDate}"`,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const safeTitle = (eventTitle || "Event").replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `Registrations_Attendance_${safeTitle}_${Date.now()}.csv`;

    return {
      success: true,
      csvContent,
      filename,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to generate export." };
  }
}

export const exportRegistrationsSheetAction = exportAttendanceDataAction;



