/**
 * Dedicated Email Service for GENAI Community VIT Bhopal
 * Encapsulates all transactional email operations, idempotency guards,
 * database tracking, retry policies, and bulk dispatch queues.
 * Powered by 100% free Google Apps Script + Gmail.
 */

import {
  googleAppsScriptClient,
  EmailRecipient,
  EmailAttachment,
} from "@/lib/email/google-apps-script";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { EmailType, EmailDeliveryStatus, EmailStats, EmailLogRecord } from "@/lib/types";
import { appendToGoogleSheet } from "@/lib/google/sheets";
import { formatISTDate } from "@/lib/utils/format";

export interface SendEmailPayload {
  to: string | string[];
  recipientName?: string;
  subject: string;
  html: string;
  plainText?: string;
  emailType: EmailType;
  registrationId?: string | null;
  eventId?: string | null;
  senderId?: string | null;
  senderRole?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
    cid?: string;
  }>;
  forceResend?: boolean;
  metadata?: Record<string, any>;
}

export interface EmailDispatchResult {
  success: boolean;
  logId?: string;
  messageId?: string;
  status: EmailDeliveryStatus;
  error?: string;
  skippedDueToIdempotency?: boolean;
}

export class EmailService {
  /**
   * Dispatches a single transactional email with strict idempotency and DB tracking.
   * Non-fatal: Never throws exceptions to caller; safely records failure in DB.
   */
  public static async send(payload: SendEmailPayload): Promise<EmailDispatchResult> {
    const {
      to,
      recipientName,
      subject,
      html,
      plainText,
      emailType,
      registrationId,
      eventId,
      senderId,
      senderRole = "system",
      attachments = [],
      forceResend = false,
      metadata = {},
    } = payload;

    const recipientEmails = Array.isArray(to)
      ? Array.from(new Set(to.filter(Boolean).map((e) => e.trim().toLowerCase())))
      : [to.trim().toLowerCase()];

    if (recipientEmails.length === 0) {
      return {
        success: false,
        status: "FAILED",
        error: "No recipient email addresses provided.",
      };
    }

    const recipientEmailString = recipientEmails.join(", ");
    const supabase = createAdminSupabase();

    // 1. Idempotency Guard
    // Check if an email of the same type was already sent/delivered for this registration
    if (registrationId && !forceResend) {
      try {
        const { data: existingLog } = await supabase
          .from("email_logs")
          .select("id, status, provider_message_id, sent_at")
          .eq("registration_id", registrationId)
          .eq("email_type", emailType)
          .in("status", ["SENT", "DELIVERED", "sent"])
          .order("sent_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingLog) {
          console.log(
            `[EmailService Idempotency] Skipping duplicate ${emailType} for registration ${registrationId}. Already ${existingLog.status}.`
          );
          return {
            success: true,
            logId: existingLog.id,
            messageId: existingLog.provider_message_id,
            status: (existingLog.status.toUpperCase() as EmailDeliveryStatus) || "SENT",
            skippedDueToIdempotency: true,
          };
        }
      } catch (checkErr) {
        console.warn("[EmailService] Idempotency check warning:", checkErr);
      }
    }

    // 2. Format Recipients & Base64 Attachments
    const emailRecipients: EmailRecipient[] = recipientEmails.map((email) => ({
      email,
      name: recipientName || undefined,
    }));

    const gasAttachments: EmailAttachment[] = attachments.map((att) => {
      let base64Content = "";
      if (Buffer.isBuffer(att.content)) {
        base64Content = att.content.toString("base64");
      } else if (typeof att.content === "string") {
        base64Content = att.content.startsWith("data:")
          ? att.content.split(",")[1]
          : att.content;
      }
      return {
        filename: att.filename,
        content: base64Content,
        contentType: att.contentType || "image/png",
        cid: att.cid,
      };
    });

    // 3. Dispatch via Google Apps Script Web App Client
    const dispatchResult = await googleAppsScriptClient.sendTransactionalEmail({
      to: emailRecipients,
      subject,
      htmlContent: html,
      plainText,
      attachments: gasAttachments.length > 0 ? gasAttachments : undefined,
      tags: [emailType, eventId ? `event-${eventId}` : "general"],
      metadata: {
        registrationId: registrationId || "",
        eventId: eventId || "",
        ...metadata,
      },
    });

    const status: EmailDeliveryStatus = dispatchResult.success ? "SENT" : "FAILED";
    const nowIso = new Date().toISOString();
    let logId: string | undefined;

    // 4. Record Operation in Supabase `email_logs`
    try {
      const { data: insertedLog, error: dbErr } = await supabase
        .from("email_logs")
        .insert({
          registration_id: registrationId || null,
          event_id: eventId || null,
          recipient_email: recipientEmailString,
          email_type: emailType,
          subject,
          sender_id: senderId || null,
          sender_role: senderRole,
          status,
          provider: "google_apps_script",
          provider_message_id: dispatchResult.messageId || null,
          attempt_count: 1,
          last_attempt_at: nowIso,
          sent_at: dispatchResult.success ? nowIso : null,
          failed_at: dispatchResult.success ? null : nowIso,
          failure_reason: dispatchResult.error || null,
          metadata: {
            ...metadata,
            messageId: dispatchResult.messageId,
            recipientCount: recipientEmails.length,
            isTemporaryError: dispatchResult.isTemporaryError,
            httpStatus: dispatchResult.httpStatus,
          },
        })
        .select("id")
        .single();

      if (!dbErr && insertedLog) {
        logId = insertedLog.id;
      }
    } catch (dbErr) {
      console.error("[EmailService] Failed to insert email_log record:", dbErr);
    }

    // 5. Mirror to Google Sheets non-blockingly
    const sheetLogId = dispatchResult.messageId || logId || `EML-${Date.now()}`;
    const istTime = formatISTDate(new Date(), true);

    appendToGoogleSheet("Email Logs", [
      [
        sheetLogId,
        istTime,
        recipientEmailString,
        subject,
        emailType,
        status,
        dispatchResult.error || "",
        senderRole || "System",
      ],
    ]).catch((sheetErr) => console.error("Error logging email to Google Sheets:", sheetErr));

    return {
      success: dispatchResult.success,
      logId,
      messageId: dispatchResult.messageId,
      status,
      error: dispatchResult.error,
    };
  }

  /**
   * Retrieves aggregated email metrics for administrative reporting.
   */
  public static async getStatistics(eventId?: string): Promise<EmailStats> {
    const supabase = createAdminSupabase();

    let query = supabase.from("email_logs").select("status, attempt_count", { count: "exact" });
    if (eventId) {
      query = query.eq("event_id", eventId);
    }

    const { data: logs, count } = await query;
    const total = count || 0;

    let sent = 0;
    let delivered = 0;
    let bounced = 0;
    let failed = 0;
    let queued = 0;
    let pending = 0;
    let cancelled = 0;

    (logs || []).forEach((log) => {
      const s = (log.status || "").toUpperCase();
      if (s === "SENT") sent++;
      else if (s === "DELIVERED") delivered++;
      else if (s === "BOUNCED") bounced++;
      else if (s === "FAILED") failed++;
      else if (s === "QUEUED") queued++;
      else if (s === "PENDING") pending++;
      else if (s === "CANCELLED") cancelled++;
    });

    return {
      total,
      pending,
      queued,
      sent,
      delivered,
      bounced,
      failed,
      cancelled,
    };
  }

  /**
   * Dispatches bulk emails in controlled batches with rate limiting.
   */
  public static async sendBulk(
    items: SendEmailPayload[],
    options?: {
      batchSize?: number;
      delayMs?: number;
      onProgress?: (sent: number, total: number) => void;
    }
  ): Promise<{
    total: number;
    succeeded: number;
    failed: number;
    skipped: number;
    results: EmailDispatchResult[];
  }> {
    const batchSize =
      options?.batchSize || parseInt(process.env.EMAIL_BATCH_SIZE || "15", 10);
    const delayMs =
      options?.delayMs || parseInt(process.env.EMAIL_DELAY_MS || "250", 10);

    let succeeded = 0;
    let failed = 0;
    let skipped = 0;
    const results: EmailDispatchResult[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      const batchPromises = batch.map(async (payload) => {
        const res = await this.send(payload);
        if (res.skippedDueToIdempotency) {
          skipped++;
        } else if (res.success) {
          succeeded++;
        } else {
          failed++;
        }
        return res;
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      if (options?.onProgress) {
        options.onProgress(results.length, items.length);
      }

      // Rate limit throttle between batches to avoid Gmail quota bursts
      if (i + batchSize < items.length) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return {
      total: items.length,
      succeeded,
      failed,
      skipped,
      results,
    };
  }

  /**
   * Legacy alias for dispatchBulk.
   */
  public static async dispatchBulk(
    items: SendEmailPayload[],
    options?: {
      batchSize?: number;
      delayBetweenBatchesMs?: number;
      onProgress?: (sent: number, total: number) => void;
    }
  ): Promise<{
    total: number;
    sent: number;
    failed: number;
    skipped: number;
    results: EmailDispatchResult[];
  }> {
    const res = await this.sendBulk(items, {
      batchSize: options?.batchSize,
      delayMs: options?.delayBetweenBatchesMs,
      onProgress: options?.onProgress,
    });
    return {
      total: res.total,
      sent: res.succeeded,
      failed: res.failed,
      skipped: res.skipped,
      results: res.results,
    };
  }

  /**
   * Retries all failed transactional emails for an event up to max retries.
   */
  public static async retryFailed(
    eventId?: string,
    maxRetries: number = 3
  ): Promise<{
    attempted: number;
    succeeded: number;
    failed: number;
  }> {
    const supabase = createAdminSupabase();

    let query = supabase
      .from("email_logs")
      .select("*")
      .eq("status", "FAILED")
      .lt("attempt_count", maxRetries);

    if (eventId) {
      query = query.eq("event_id", eventId);
    }

    const { data: failedLogs } = await query;
    if (!failedLogs || failedLogs.length === 0) {
      return { attempted: 0, succeeded: 0, failed: 0 };
    }

    let succeeded = 0;
    let failed = 0;

    for (const log of failedLogs as EmailLogRecord[]) {
      const nowIso = new Date().toISOString();
      const dispatchResult = await googleAppsScriptClient.sendTransactionalEmail({
        to: log.recipient_email,
        subject: log.subject,
        htmlContent: log.metadata?.html || "<p>Notification update from GENAI Community</p>",
      });

      const newStatus: EmailDeliveryStatus = dispatchResult.success ? "SENT" : "FAILED";

      await supabase
        .from("email_logs")
        .update({
          status: newStatus,
          attempt_count: (log.attempt_count || 1) + 1,
          last_attempt_at: nowIso,
          provider_message_id: dispatchResult.messageId || log.provider_message_id,
          sent_at: dispatchResult.success ? nowIso : log.sent_at,
          failed_at: dispatchResult.success ? null : nowIso,
          failure_reason: dispatchResult.error || null,
        })
        .eq("id", log.id);

      if (dispatchResult.success) {
        succeeded++;
      } else {
        failed++;
      }

      await new Promise((r) => setTimeout(r, 200));
    }

    return {
      attempted: failedLogs.length,
      succeeded,
      failed,
    };
  }
}
