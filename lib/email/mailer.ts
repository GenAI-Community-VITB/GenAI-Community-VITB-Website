import nodemailer from "nodemailer";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { EmailType } from "@/lib/types";
import { appendToGoogleSheet } from "@/lib/google/sheets";
import { formatISTDate } from "@/lib/utils/format";

let cachedTransporter: nodemailer.Transporter | null = null;

function getEmailTransporter(): nodemailer.Transporter | null {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    return null;
  }

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass,
      },
    });
  }

  return cachedTransporter;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  emailType: EmailType;
  registrationId?: string;
  eventId?: string;
  senderId?: string;
  senderRole?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    cid?: string;
    contentType?: string;
  }>;
}

/**
 * Sends an email via Gmail and records the operation into Supabase `email_logs`.
 * Non-fatal: if email fails, logs the error and returns { success: false, error },
 * preserving the caller's transaction.
 */
export async function sendEmail(options: SendEmailOptions): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const {
    to,
    subject,
    html,
    emailType,
    registrationId,
    eventId,
    senderId,
    senderRole = "system",
    attachments = [],
  } = options;

  const transporter = getEmailTransporter();
  const fromAddress = process.env.GMAIL_USER
    ? `"GenAI Community VIT Bhopal" <${process.env.GMAIL_USER}>`
    : '"GenAI Community VIT Bhopal" <noreply@genai.local>';

  let success = false;
  let messageId: string | undefined;
  let errorMessage: string | undefined;

  if (!transporter) {
    console.log(`[Email Mock/Dev Mode] To: ${to} | Type: ${emailType} | Subject: ${subject}`);
    success = true;
    messageId = `mock-email-${Date.now()}`;
  } else {
    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        html,
        attachments,
      });
      success = true;
      messageId = info.messageId;
    } catch (err: any) {
      console.error(`Failed to send email to ${to}:`, err);
      success = false;
      errorMessage = err.message || "Failed to send email via SMTP";
    }
  }

  // Record in Supabase email_logs
  try {
    const supabase = createAdminSupabase();
    await supabase.from("email_logs").insert({
      registration_id: registrationId || null,
      event_id: eventId || null,
      recipient_email: to,
      email_type: emailType,
      subject,
      sender_id: senderId || null,
      sender_role: senderRole,
      status: success ? "sent" : "failed",
      error_message: errorMessage || null,
      metadata: { messageId, hasAttachments: attachments.length > 0 },
    });
  } catch (dbErr) {
    console.error("Failed to log email to database:", dbErr);
  }

  // Mirror directly to Google Sheets Email Logs tab non-blockingly
  const emailLogId = messageId || `EML-${Date.now()}`;
  const istTime = formatISTDate(new Date(), true);
  appendToGoogleSheet("Email Logs", [
    [
      emailLogId,
      istTime,
      to,
      emailType,
      eventId || "General",
      senderRole || "system",
      success ? "sent" : "failed",
      errorMessage || "",
      0,
    ],
  ]).catch((err) => console.error("Error mirroring email log to Google Sheets:", err));

  return {
    success,
    messageId,
    error: errorMessage,
  };
}
