/**
 * Email Dispatcher Gateway
 * Delegates to the production-grade EmailService (Google Apps Script + Gmail Engine).
 * Preserves legacy signature for backwards compatibility.
 */

import { EmailService } from "@/lib/email/service";
import { EmailType } from "@/lib/types";

export interface SendEmailOptions {
  to: string | string[];
  recipientName?: string;
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
  forceResend?: boolean;
}

/**
 * Sends a transactional email using the centralized EmailService & Google Apps Script Web App.
 * Non-fatal: failures are recorded in `email_logs` and do not break caller operations.
 */
export async function sendEmail(options: SendEmailOptions): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const result = await EmailService.send({
    to: options.to,
    recipientName: options.recipientName,
    subject: options.subject,
    html: options.html,
    emailType: options.emailType,
    registrationId: options.registrationId,
    eventId: options.eventId,
    senderId: options.senderId,
    senderRole: options.senderRole,
    attachments: options.attachments,
    forceResend: options.forceResend,
  });

  return {
    success: result.success,
    messageId: result.messageId,
    error: result.error,
  };
}
