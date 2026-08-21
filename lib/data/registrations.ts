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

  // Send Submission Received Email directly to College Email (Non-blocking)
  const submissionEmail = getSubmissionReceivedTemplate({
    fullName: params.fullName,
    vitRegNumber: params.vitRegistrationNumber.toUpperCase(),
    registrationNumber,
    eventTitle,
    amount: params.amount,
    transactionId: params.transactionId,
  });

  const primaryContactEmail = params.collegeEmail || params.personalEmail;

  sendEmail({
    to: primaryContactEmail,
    subject: submissionEmail.subject,
    html: submissionEmail.html,
    emailType: "submission_received",
    registrationId,
    eventId: params.eventId,
  }).catch((err) => console.error("Error sending submission email to college email:", err));

  // Mirror record to Google Sheets Registrations tab
  const istTime = formatISTDate(new Date(), true);
  appendToGoogleSheet("Registrations", [
    [
      registrationId,
      params.fullName,
      primaryContactEmail,
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

    const destinationEmail = reg.college_email || reg.personal_email;

    sendEmail({
      to: destinationEmail,
      subject: emailData.subject,
      html: emailData.html,
      emailType: "payment_approved_qr",
      registrationId: reg.id,
      eventId: reg.event_id,
      senderId: params.reviewerId,
      senderRole: params.reviewerRole,
      attachments: [
        {
          filename: `QR_Pass_${reg.registration_number}.png`,
          content: qrBuffer,
          cid: qrCid,
          contentType: "image/png",
        },
      ],
    }).catch((err) => console.error("Error sending QR pass email to college email:", err));

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

    // Send Rejection Email to Official College Email
    const emailData = getPaymentRejectedTemplate({
      fullName: reg.full_name,
      registrationNumber: reg.registration_number,
      eventTitle,
      rejectionReason: params.rejectionReason || "Verification issue",
      rejectionExplanation: params.rejectionExplanation,
    });

    const rejectionDestinationEmail = reg.college_email || reg.personal_email;

    sendEmail({
      to: rejectionDestinationEmail,
      subject: emailData.subject,
      html: emailData.html,
      emailType: "payment_rejected",
      registrationId: reg.id,
      eventId: reg.event_id,
      senderId: params.reviewerId,
      senderRole: params.reviewerRole,
    }).catch((err) => console.error("Error sending rejection email to college email:", err));

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
  };
  errorCode?: string;
}> {
  const cleanToken = qrToken.trim();
  if (!cleanToken) {
    return { success: false, message: "QR Token is required", errorCode: "EMPTY_TOKEN" };
  }

  const supabase = createAdminSupabase();
  const { data, error } = await supabase.rpc("verify_qr_token_details", {
    p_qr_token: cleanToken,
  });

  if (error || !data) {
    return {
      success: false,
      message: error?.message || "Verification lookup failed",
      errorCode: "DB_ERROR",
    };
  }

  return {
    success: data.success,
    message: data.message,
    isAlreadyCheckedIn: data.is_already_checked_in,
    priorCheckinTime: data.prior_checkin_time,
    priorScannedBy: data.prior_scanned_by,
    participant: data.participant,
    errorCode: data.error_code,
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

  const { data, error } = await supabase.rpc("confirm_attendance_action", {
    p_registration_id: params.registrationId,
    p_scanner_user_id: params.scannerUserId,
    p_scanner_name: params.scannerName,
    p_scanner_role: params.scannerRole,
    p_is_override: isOverride,
    p_override_reason: params.overrideReason || null,
  });

  if (error || !data) {
    return {
      success: false,
      message: error?.message || "Attendance confirmation failed.",
      errorCode: "DB_ERROR",
    };
  }

  if (data.success && data.participant) {
    const istTime = formatISTDate(new Date(), true);
    const checkinId = `checkin-${Date.now()}`;
    const participant = data.participant;

    // 1. Mirror to Dedicated "Attendance" Tab (Matches SHEET_HEADERS["Attendance"])
    appendToGoogleSheet("Attendance", [
      [
        participant.id,
        participant.full_name,
        (participant as any).qr_token || checkinId,
        istTime,
        params.scannerName,
        isOverride ? "overridden" : "approved",
        params.overrideReason || "",
      ],
    ]).catch((err) => console.error("Error mirroring to Attendance Sheet:", err));

    // 2. Mirror to Detailed "Check-ins" Tab
    appendToGoogleSheet("Check-ins", [
      [
        checkinId,
        participant.registration_number,
        participant.full_name,
        participant.vit_registration_number,
        (participant as any).college_email || "",
        participant.branch,
        isOverride ? "overridden" : "approved",
        isOverride ? "YES" : "NO",
        params.overrideReason || "",
        params.scannerName,
        params.scannerRole,
        istTime,
      ],
    ]).catch((err) => console.error("Error mirroring to Check-ins Sheet:", err));
  }

  return {
    success: data.success,
    message: data.message,
    errorCode: data.error_code,
    participant: data.participant,
  };
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

  // Restore into active registrations
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
    return { success: false, error: insertErr.message };
  }

  // Remove from deleted table
  await supabase.from("deleted_registrations").delete().eq("id", params.deletedId);

  // Audit Log
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


