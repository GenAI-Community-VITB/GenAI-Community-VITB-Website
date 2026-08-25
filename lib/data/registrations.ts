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
            event_id: params.eventId,
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
    .eq("event_id", params.eventId)
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
          event_id: params.eventId,
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
      p_event_id: params.eventId,
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

  // Fetch event details for email
  const { data: eventData } = await supabase
    .from("events")
    .select("title")
    .eq("id", params.eventId)
    .single();

  const eventTitle = eventData?.title || "Test Event";

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

  return {
    success: true,
    registrationId,
    registrationNumber,
    paymentId,
  };
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
  const supabase = createAdminSupabase();
  const { data: event } = await supabase
    .from("events")
    .select("title, registration_fee")
    .eq("id", params.eventId)
    .single();

  const eventTitle = event?.title || "GenAI Community Event";
  const amount = event?.registration_fee ?? 200;

  // Upload screenshot to Drive / Fallback
  const driveResult = await uploadPaymentScreenshotToDrive({
    fileBuffer: params.screenshotBuffer,
    fileName: `${params.vitRegistrationNumber}_${params.screenshotFileName}`,
    mimeType: params.screenshotMimeType,
    eventTitle,
  });

  return createRegistration({
    eventId: params.eventId,
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
            filename: `QR_Pass_${reg.registration_number}_inline.png`,
            content: qrBuffer,
            cid: qrCid,
            contentType: "image/png",
          },
          {
            filename: `Official_Entry_Pass_${reg.registration_number}.png`,
            content: qrBuffer,
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

  // Multi-tier prioritized participant lookup
  let reg: any = null;

  // A. Check by exact qr_token
  const { data: byQr } = await supabase
    .from("registrations")
    .select("*, event:events(title, venue, event_date)")
    .eq("qr_token", cleanToken)
    .limit(1)
    .maybeSingle();

  if (byQr) reg = byQr;

  // B. Check by registration_number
  if (!reg) {
    const { data: byRegNo } = await supabase
      .from("registrations")
      .select("*, event:events(title, venue, event_date)")
      .ilike("registration_number", cleanToken)
      .limit(1)
      .maybeSingle();
    if (byRegNo) reg = byRegNo;
  }

  // C. Check by vit_registration_number
  if (!reg) {
    const { data: byVitReg } = await supabase
      .from("registrations")
      .select("*, event:events(title, venue, event_date)")
      .ilike("vit_registration_number", cleanToken)
      .limit(1)
      .maybeSingle();
    if (byVitReg) reg = byVitReg;
  }

  // D. Check by UUID id if cleanToken matches UUID format
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanToken);
  if (!reg && isUuid) {
    const { data: byId } = await supabase
      .from("registrations")
      .select("*, event:events(title, venue, event_date)")
      .eq("id", cleanToken)
      .limit(1)
      .maybeSingle();
    if (byId) reg = byId;
  }

  // E. Check by college_email or personal_email
  if (!reg && cleanToken.includes("@")) {
    const { data: byEmail } = await supabase
      .from("registrations")
      .select("*, event:events(title, venue, event_date)")
      .or(`college_email.ilike.${cleanToken},personal_email.ilike.${cleanToken}`)
      .limit(1)
      .maybeSingle();
    if (byEmail) reg = byEmail;
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

    return {
      success: true,
      isAlreadyCheckedIn: true,
      message: "Duplicate Scan: Participant has ALREADY checked in.",
      priorCheckinTime: priorCheckin?.scan_timestamp ? formatISTDate(priorCheckin.scan_timestamp, true) : undefined,
      priorScannedBy: priorCheckin?.scanned_by_name || "Event Volunteer",
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
  participant?: {
    id: string;
    full_name: string;
    vit_registration_number: string;
    branch: string;
    registration_number: string;
    status: string;
    registration_source: string;
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

    if (!error && data && data.success) {
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

    // 2. Update registration status to checked_in
    await supabase
      .from("registrations")
      .update({
        registration_status: "checked_in",
        checked_in_at: nowIso,
        checked_in_by: params.scannerUserId,
      })
      .eq("id", reg.id);

    // 3. Insert into checkins table
    const checkinId = `checkin-${Date.now()}`;
    await supabase.from("checkins").insert({
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

    const participantData = {
      id: reg.id,
      full_name: reg.full_name,
      vit_registration_number: reg.vit_registration_number,
      branch: reg.branch_name || reg.branch || "N/A",
      registration_number: reg.registration_number,
      status: "checked_in",
      registration_source: reg.registration_source || "online",
      college_email: reg.college_email,
      event_title: reg.event?.title || "GenAI Community Event",
    };

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
export async function importParticipantsBulkAction(params: {
  eventId: string;
  participants: Array<{
    registrationId?: string;
    fullName: string;
    email: string;
    collegeEmail?: string;
    phoneNumber?: string;
    branch?: string;
    college?: string;
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
    .select("title, event_date, venue")
    .eq("id", eventId)
    .single();

  const eventTitle = event?.title || "GenAI Community Event";
  const eventDate = event?.event_date ? formatISTDate(event.event_date) : "Event Date";
  const venue = event?.venue || "Main Auditorium / Campus";

  let importedCount = 0;

  for (let i = 0; i < participants.length; i++) {
    const p = participants[i];
    const cleanName = (p.fullName || "").trim();
    const cleanEmail = (p.email || "").trim().toLowerCase();
    if (!cleanName || !cleanEmail) continue;

    const registrationNumber = p.registrationId
      ? p.registrationId.trim()
      : `GAC26-${String(Date.now() % 100000).padStart(5, "0")}-${String(i + 1).padStart(3, "0")}`;
    const cleanVitReg = cleanEmail.includes("@vitbhopal.ac.in")
      ? cleanEmail.split("@")[0].toUpperCase()
      : `VITB-${String(Date.now()).slice(-6)}`;
    const branch = p.branch || "General";
    const phone = p.phoneNumber || "";

    // Generate secure QR Token
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
        branch_name: branch,
        personal_email: cleanEmail,
        college_email: p.collegeEmail || cleanEmail,
        phone_number: phone,
        registration_status: "verified",
        registration_source: "online",
        qr_token: qrToken,
        college: p.college || "VIT Bhopal University",
        created_at: new Date().toISOString(),
      });

      // 2. Insert verified payment
      await supabase.from("payments").insert({
        registration_id: regId,
        amount: 0,
        transaction_id: `EXCEL_IMPORT_${registrationNumber}`,
        payment_status: "verified",
        verified_at: new Date().toISOString(),
      });

      // 3. Optionally dispatch QR email with downloadable attachment
      if (sendEmailDirectly) {
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

          await sendEmail({
            to: cleanEmail,
            subject: emailData.subject,
            html: emailData.html,
            emailType: "payment_approved_qr",
            registrationId: regId,
            eventId,
            attachments: [
              {
                filename: `QR_Pass_${registrationNumber}_inline.png`,
                content: qrBuffer,
                cid: qrCid,
                contentType: "image/png",
              },
              {
                filename: `Official_Entry_Pass_${registrationNumber}.png`,
                content: qrBuffer,
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
 * Exports real-time event attendance data in CSV format.
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
    const { data: event } = await supabase
      .from("events")
      .select("title")
      .eq("id", eventId)
      .single();

    const { data: registrations } = await supabase
      .from("registrations")
      .select("id, registration_number, full_name, vit_registration_number, branch_name, personal_email, college_email, phone_number, registration_status, checkins(scan_timestamp, scanned_by_name, status)")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (!registrations || registrations.length === 0) {
      return { success: false, error: "No registration records found for this event." };
    }

    const headers = [
      "Registration ID",
      "Full Name",
      "VIT Reg Number",
      "Branch",
      "Email",
      "Phone",
      "Status",
      "Attendance",
      "Check-in Time (IST)",
      "Scanned By",
    ];

    const rows = registrations.map((r: any) => {
      const checkin = Array.isArray(r.checkins) && r.checkins.length > 0 ? r.checkins[0] : null;
      const isPresent = r.registration_status === "checked_in" || checkin?.status === "approved";
      const checkinTime = checkin?.scan_timestamp ? formatISTDate(checkin.scan_timestamp, true) : "—";
      const scanner = checkin?.scanned_by_name || "—";

      return [
        `"${r.registration_number || ""}"`,
        `"${r.full_name || ""}"`,
        `"${r.vit_registration_number || ""}"`,
        `"${r.branch_name || ""}"`,
        `"${r.personal_email || r.college_email || ""}"`,
        `"${r.phone_number || ""}"`,
        `"${r.registration_status || ""}"`,
        `"${isPresent ? "Present" : "Absent"}"`,
        `"${checkinTime}"`,
        `"${scanner}"`,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const safeTitle = (event?.title || "Event").replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `Attendance_${safeTitle}_${Date.now()}.csv`;

    return {
      success: true,
      csvContent,
      filename,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to generate attendance export." };
  }
}



