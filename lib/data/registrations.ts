import { requireStaffActionRole, isAssignedEventVolunteer } from "@/lib/auth/permissions";
import { csvCell } from "@/lib/utils/csv";
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
  studentRegistrationSchema,
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
  warning?: string;
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
      .eq("transaction_id", cleanTxId)
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
  const duplicateChecks = await Promise.all([
    supabase.from("registrations").select("id").eq("event_id",canonicalEventId).eq("vit_registration_number",cleanVitReg).limit(1),
    supabase.from("registrations").select("id").eq("event_id",canonicalEventId).eq("college_email",cleanCollegeEmail).limit(1),
  ]);
  if (duplicateChecks.some(result => result.error)) return { success: false, error: "Unable to check existing registrations. Please retry." };
  const existingReg = duplicateChecks.flatMap(result => result.data || []);

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

  let notificationWarning: string | undefined;
  try {
    const delivery = await sendEmail({
      to: recipientEmails,
      subject: submissionEmail.subject,
      html: submissionEmail.html,
      emailType: "submission_received",
      registrationId,
      eventId: params.eventId,
    });
    if (!delivery.success) notificationWarning = "Registration saved, but the receipt email could not be delivered.";
  } catch (emailErr) {
    notificationWarning = "Registration saved, but the receipt email could not be delivered.";
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
    warning: notificationWarning,
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
  if (!webhookUrl || !process.env.GOOGLE_DRIVE_RELAY_TOKEN) return;

  try {
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "failsafe_registration_form_submit",
        token: process.env.GOOGLE_DRIVE_RELAY_TOKEN,
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
  registrationSource?: RegistrationSource;
  createdBy?: string;
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

  const validated = studentRegistrationSchema.safeParse({
    event_id: event.id, full_name: params.fullName, vit_registration_number: params.vitRegistrationNumber,
    branch_name: params.branchName, personal_email: params.personalEmail, college_email: params.collegeEmail,
    phone_number: params.phoneNumber, transaction_id: params.transactionId,
  });
  if (!validated.success) return { success: false, error: validated.error.issues[0]?.message || "Invalid registration details." };
  params = { ...params, fullName: validated.data.full_name, vitRegistrationNumber: validated.data.vit_registration_number,
    personalEmail: validated.data.personal_email, collegeEmail: validated.data.college_email,
    phoneNumber: validated.data.phone_number, transactionId: validated.data.transaction_id };
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
    registrationSource: params.registrationSource || "online",
    createdBy: params.createdBy,
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

  const actor = await requireStaffActionRole("finance");
  params.reviewerId = actor.user.id; params.reviewerRole = actor.role;
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
    const saved = await supabase.rpc("review_registration_payment", { p_payment: params.paymentId, p_registration: params.registrationId, p_actor: actor.user.id, p_approve: true, p_token: generateSecureQRToken(), p_reason: null, p_explanation: null });
    if (saved.error) throw new Error(saved.error.message);
    const qrToken = saved.data as string;

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
      const delivery = await sendEmail({
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
      if (!delivery.success) return {success:false,error:`Payment saved, but email failed: ${delivery.error || "Delivery failed"}`};
    } catch (sendErr) {
      return {success:false,error:"Payment saved, but QR email could not be sent."};
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
    const saved = await supabase.rpc("review_registration_payment", { p_payment: params.paymentId, p_registration: params.registrationId, p_actor: actor.user.id, p_approve: false, p_token: null, p_reason: params.rejectionReason || null, p_explanation: params.rejectionExplanation || null });
    if (saved.error) throw new Error(saved.error.message);

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
      const delivery = await sendEmail({
        to: rejectionDestinationEmails,
        subject: emailData.subject,
        html: emailData.html,
        emailType: "payment_rejected",
        registrationId: reg.id,
        eventId: reg.event_id,
        senderId: params.reviewerId,
        senderRole: params.reviewerRole,
      });
      if (!delivery.success) return {success:false,error:`Payment rejected, but email failed: ${delivery.error || "Delivery failed"}`};
    } catch (rejEmailErr) {
      return {success:false,error:"Payment rejected, but notification email could not be sent."};
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
 * Read-only participant lookup, also used before the gate scan records attendance.
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
  const actor = await requireStaffActionRole("volunteer");
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

  const fields = ["qr_token", "registration_number", "vit_registration_number", "college_email", "personal_email"];
  if (/^[0-9a-f-]{36}$/i.test(cleanToken)) fields.push("id");
  for (const field of fields) {
    const { data, error } = await supabase.from("registrations").select("*,event:events(title,venue,event_date)").eq(field,cleanToken).limit(2);
    if (error) throw new Error(error.message);
    if (data && data.length > 1) return {success:false,message:"Multiple events match this identifier. Scan the event QR pass.",errorCode:"AMBIGUOUS"};
    if (data?.length) { reg=data[0]; break; }
  }

  if (!reg) {
    return {
      success: false,
      message: `Invalid QR pass or registration ID ("${cleanToken.length > 25 ? cleanToken.slice(0, 25) + "..." : cleanToken}"). No matching record found.`,
      errorCode: "INVALID_QR",
    };
  }

  if (!await isAssignedEventVolunteer(actor.user.id, reg.event_id)) return {success:false,message:"You are not assigned to scan this event.",errorCode:"FORBIDDEN"};
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
 * Atomically record attendance after a gate scan or explicit staff override.
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
  const actor = await requireStaffActionRole(params.isOverride ? "tech" : "volunteer");
  const db = createAdminSupabase();
  const { data: registration, error: fetchError } = await db.from("registrations").select("event_id").eq("id", params.registrationId).single();
  if (fetchError || !registration) return { success: false, message: "Registration not found." };
  if (!await isAssignedEventVolunteer(actor.user.id, registration.event_id)) return { success: false, message: "You are not assigned to scan this event." };
  const { data, error } = await db.rpc("record_attendance", { p_registration: params.registrationId, p_actor: actor.user.id, p_name: actor.profile.full_name, p_role: actor.role, p_override: !!params.isOverride, p_reason: params.overrideReason || null });
  if (error) return { success: false, message: error.message };
  return data;
}

export async function deleteRegistrationWithArchive(params: {
  registrationId: string;
  reason: string;
  actorId: string;
  actorName: string;
  actorRole: string;
}): Promise<{ success: boolean; error?: string }> {
  const actor = await requireStaffActionRole("finance");
  const { data, error } = await createAdminSupabase().rpc("archive_registration", { p_id: params.registrationId, p_actor: actor.user.id, p_name: actor.profile.full_name, p_role: actor.role, p_reason: params.reason });
  return error ? { success: false, error: error.message } : { success: true };
}

export async function restoreDeletedRegistration(params: {
  deletedId: string;
  actorId: string;
  actorRole: string;
}): Promise<{ success: boolean; error?: string }> {
  const actor = await requireStaffActionRole("finance");
  const { data, error } = await createAdminSupabase().rpc("restore_registration", { p_id: params.deletedId });
  return error ? { success: false, error: error.message } : { success: true };
}

export async function getLiveEventStatistics(eventId: string): Promise<EventStatistics> {
  const supabase = createAdminSupabase();

  const { data: stats, error: statsError } = await supabase
    .from("event_statistics")
    .select("*")
    .eq("event_id", eventId)
    .maybeSingle();

  if (statsError) throw new Error(statsError.message);
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
    ].map(async query => { const result=await query; if(result.error) throw new Error(result.error.message); return result; }));

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
  const actor = await requireStaffActionRole("superadmin");
  params.actorId = actor.user.id; params.actorRole = actor.role;
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
    .order("id", { ascending: false })
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
    const q = params.searchQuery.trim().replace(/[(),.%]/g, " ");
    query = query.or(
      `full_name.ilike.%${q}%,vit_registration_number.ilike.%${q}%,personal_email.ilike.%${q}%,registration_number.ilike.%${q}%`,
    );
  }

  const { data, count, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return {
    registrations: (data as Array<Registration & { payments?: Payment[] }>) ?? [],
    totalCount: count || 0,
  };
}

/** Load the complete event queue in bounded batches, beyond PostgREST's row cap. */
export async function getFinanceRegistrations(eventId: string): Promise<Array<Registration & { payments?: Payment[] }>> {
  await requireStaffActionRole("finance");
  if (!eventId) return [];
  const result: Array<Registration & { payments?: Payment[] }> = [];
  const seen = new Set<string>();
  const limit = 500;
  for (let page = 1; ; page++) {
    const { registrations, totalCount } = await getRegistrationsQueue({ eventId, page, limit });
    for (const registration of registrations) {
      if (!seen.has(registration.id)) { result.push(registration); seen.add(registration.id); }
    }
    if (!registrations.length || page * limit >= totalCount) break;
  }
  return result;
}

/** Retrieves the selected event's archived registrations in bounded batches. */
export async function getDeletedRegistrations(eventId?: string): Promise<DeletedRegistration[]> {
  await requireStaffActionRole("finance");
  const result: DeletedRegistration[] = [];
  const db = createAdminSupabase();
  for (let offset = 0; ; offset += 500) {
    let query = db.from("deleted_registrations").select("*", { count: "exact" })
      .order("created_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + 499);
    if (eventId) query = query.eq("event_id", eventId);
    const { data, error, count } = await query;
    if (error) throw new Error(error.message);
    result.push(...(data || []) as DeletedRegistration[]);
    if (!data?.length || offset + 500 >= (count ?? 0)) break;
  }
  return result;
}

/**
 * Bulk imports registered candidates from Excel/CSV, generates cryptographic QR tokens,
 * creates verified registration and payment records, and optionally dispatches QR pass emails.
 */
/**
 * Normalizes user-entered branch strings to official approved academic verticals.
 */
function normalizeImportBranch(rawBranch?: string): string {
  if (!rawBranch) return "";
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
    return clean;
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
  await requireStaffActionRole("tech");
  const db = createAdminSupabase();
  if (!params.participants.length || params.participants.length > 1000) return { success:false, importedCount:0,error:"Import between 1 and 1000 participants per file." };
  const { data: event, error: eventError } = await db.from("events").select("*").eq("id",params.eventId).single();
  if (eventError) return { success:false,importedCount:0,error:eventError.message };
  let importedCount=0; const errors: string[]=[];
  for (const [index,p] of params.participants.entries()) {
    try {
      const phoneDigits=(p.phoneNumber || p.phone || "").replace(/[^0-9]/g,"");
      const phone=phoneDigits.length===12 && phoneDigits.startsWith("91") ? phoneDigits.slice(2) : phoneDigits;
      const status=(p.paymentStatus || "pending").trim().toLowerCase();
      const row={full_name:p.fullName?.trim(),vit_registration_number:p.vitRegistrationNumber?.trim().toUpperCase(),branch_name:normalizeImportBranch(p.branchName || p.branch || ""),college_email:p.collegeEmail?.trim().toLowerCase(),personal_email:(p.personalEmail || p.email || "").trim().toLowerCase(),phone_number:phone,transaction_id:(p.transactionId || p.utr || "").trim(),payment_status:status,amount:p.amount ?? event.registration_fee,registration_number:p.registrationId?.trim()};
      if (!row.full_name || !/^[0-9]{2}[A-Z]{3}[0-9]{5}$/.test(row.vit_registration_number || "")) throw new Error("Name and valid VIT registration number are required.");
      if (![row.college_email,row.personal_email].every(v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || ""))) throw new Error("College and personal email are required.");
      if (!/^[6-9][0-9]{9}$/.test(phone)) throw new Error("Valid 10-digit phone number required.");
      if (!["verified","pending","rejected"].includes(status)) throw new Error("Payment status must be verified, pending, or rejected.");
      if (!row.transaction_id || !Number.isFinite(row.amount) || row.amount<0) throw new Error("Valid payment amount and transaction ID required.");
      const eligibility=validateEventEligibility(row.branch_name,event.allowed_degrees,event.allowed_branches);
      if (!eligibility.valid) throw new Error(eligibility.error);
      const { data: reg, error } = await db.rpc("import_participant",{p_event:params.eventId,p_row:row,p_token:generateSecureQRToken()});
      if (error) throw new Error(error.message);
      importedCount++;
      if (params.sendEmailDirectly && reg.qr_token && ["verified","checked_in"].includes(reg.registration_status)) {
        const cid=`entry-pass-${reg.registration_number}`;
        const template=getRegistrationConfirmedTemplate({fullName:reg.full_name,vitRegNumber:reg.vit_registration_number,registrationNumber:reg.registration_number,eventTitle:event.title,eventDate:formatISTDate(event.event_date),venue:event.venue,qrContentId:cid});
        const qr=await generateEntryPassQRCodeBuffer({qrToken:reg.qr_token,registrationNumber:reg.registration_number,fullName:reg.full_name,vitRegNumber:reg.vit_registration_number});
        const sent=await sendEmail({to:reg.personal_email,subject:template.subject,html:template.html,emailType:"payment_approved_qr",registrationId:reg.id,eventId:event.id,attachments:[{filename:"entry-pass.png",content:qr,cid,contentType:"image/png"}]});
        if (!sent.success) errors.push(`Row ${index+2}: saved, but email failed: ${sent.error}`);
      }
    } catch(error) { errors.push(`Row ${index+2}: ${error instanceof Error ? error.message : "Import failed"}`); }
  }
  return {success:errors.length===0,importedCount,error:errors.length ? `${importedCount} saved. ${errors.join("; ")}` : undefined};
}

export async function overrideAttendanceStatus(params: {
  registrationId: string;
  newStatus: string;
  reason: string;
  actorId: string;
  actorName: string;
  actorRole: string;
}): Promise<{ success: boolean; error?: string }> {
  const actor = await requireStaffActionRole("tech");
  if (!["checked_in", "verified", "absent"].includes(params.newStatus)) throw new Error("Invalid attendance status.");
  const { data, error } = await createAdminSupabase().rpc("record_attendance", { p_registration: params.registrationId, p_actor: actor.user.id, p_name: actor.profile.full_name, p_role: actor.role, p_override: true, p_reason: params.reason, p_present: params.newStatus === "checked_in" });
  return error ? { success: false, error: error.message } : { success: true };
}

export async function exportAttendanceDataAction(eventId: string): Promise<{ success: boolean; csvContent?: string; filename?: string; error?: string }> {
  await requireStaffActionRole("finance");
  try {
    const db = createAdminSupabase();
    const { data: event, error } = await db.from("events").select("id,title,slug").eq("id", eventId).single();
    if (error || !event) throw new Error(error?.message || "Event not found.");
    const lines = [["Name","Registration Number","Personal Email","VIT College Email","Academic Year","Branch","UTR / Transaction ID","Payment Status","Approval Status","QR Generated Status","Attendance Status","Check-in Time (IST)","Scanned By","Registration Date (IST)"].map(csvCell).join(",")];
    for (let offset = 0; ; offset += 500) {
      const { data: rows, error: rowError } = await db.from("registrations").select("*,payments(transaction_id,payment_status,amount,created_at),checkins(scan_timestamp,scanned_by_name,status)").eq("event_id",event.id).order("id").range(offset,offset+499);
      if (rowError) throw new Error(rowError.message);
      for (const r of rows || []) {
        const checkin = r.checkins.filter((c: any) => ["approved","overridden"].includes(c.status)).sort((a: any,b: any) => b.scan_timestamp.localeCompare(a.scan_timestamp))[0];
        const payment = r.payments.sort((a: any,b: any) => b.created_at.localeCompare(a.created_at))[0];
        lines.push([r.full_name,r.vit_registration_number,r.personal_email,r.college_email,r.academic_year || "",r.branch_name,payment?.transaction_id || "",payment?.payment_status || "missing",r.registration_status,r.qr_token ? "Yes" : "No",checkin ? "Present" : "Absent",checkin ? formatISTDate(checkin.scan_timestamp,true) : "",checkin?.scanned_by_name || "",formatISTDate(r.created_at,true)].map(csvCell).join(","));
      }
      if (!rows || rows.length < 500) break;
    }
    return { success:true,csvContent: "\uFEFF"+lines.join("\r\n"),filename:`${(event.slug || "event").replace(/[^a-z0-9_-]/gi,"_")}_participants.csv` };
  } catch(error) { return { success:false,error:error instanceof Error ? error.message : "Export failed." }; }
}
export const exportRegistrationsSheetAction = exportAttendanceDataAction;
