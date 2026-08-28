/**
 * Google Apps Script + Gmail Transactional Email Engine
 * Communicates with the deployed Google Apps Script Web App relay.
 * Provides 100% free email sending through Gmail without any external paid services.
 */

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string; // Base64 encoded string
  contentType?: string;
  cid?: string;
}

export interface SendMailOptions {
  to: EmailRecipient[] | string | string[];
  subject: string;
  htmlContent: string;
  plainText?: string;
  senderName?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface SendMailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  isTemporaryError?: boolean;
  httpStatus?: number;
  provider: "google_apps_script";
}

export class GoogleAppsScriptEmailClient {
  private webAppUrl: string;
  private secretToken: string;
  private defaultSenderName: string;
  private defaultReplyTo: string;

  constructor() {
    this.webAppUrl = (process.env.GOOGLE_APPS_SCRIPT_URL || "").trim();
    this.secretToken = (process.env.GOOGLE_APPS_SCRIPT_TOKEN || "GENAI_GAS_EMAIL_SECRET_2026").trim();
    this.defaultSenderName = (process.env.EMAIL_SENDER_NAME || "GENAI Community VIT Bhopal").trim();
    this.defaultReplyTo = (process.env.EMAIL_REPLY_TO || "gen_ai@vitbhopal.ac.in").trim();
  }

  /**
   * Returns true if the Google Apps Script Web App endpoint URL is configured.
   */
  public isConfigured(): boolean {
    return Boolean(
      this.webAppUrl &&
      this.webAppUrl.startsWith("https://script.google.com") &&
      !this.webAppUrl.includes("mock")
    );
  }

  /**
   * Dispatches a single transactional email via Google Apps Script Web App.
   */
  public async sendTransactionalEmail(options: SendMailOptions): Promise<SendMailResult> {
    const senderName = options.senderName || this.defaultSenderName;
    const replyTo = options.replyTo || this.defaultReplyTo;

    // Normalize recipient emails
    let recipientList: string[] = [];
    if (typeof options.to === "string") {
      recipientList = [options.to];
    } else if (Array.isArray(options.to)) {
      recipientList = options.to.map((item) => (typeof item === "string" ? item : item.email));
    }

    const to = recipientList.join(", ");

    // Development / Mock mode fallback
    if (!this.isConfigured()) {
      console.log(
        `[Google Apps Script Mock Mode] Dispatching Email -> To: ${to} | Subject: "${options.subject}" | Sender: "${senderName}"`
      );
      return {
        success: true,
        messageId: `mock-gas-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        provider: "google_apps_script",
      };
    }

    const payload = {
      token: this.secretToken,
      to,
      subject: options.subject,
      html: options.htmlContent,
      text: options.plainText,
      senderName,
      replyTo,
      attachments: options.attachments && options.attachments.length > 0 ? options.attachments : undefined,
      metadata: options.metadata,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

      const response = await fetch(this.webAppUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "GENAI-Community-Platform/2.0",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
        redirect: "follow", // Important: Google Apps Script Web Apps 302 redirect to echo output
      });

      clearTimeout(timeoutId);

      const resData = await response.json().catch(() => null);

      if (!response.ok || (resData && !resData.success)) {
        const errMsg = resData?.error || `Google Apps Script returned HTTP ${response.status}`;
        const isRateLimitOrQuota =
          response.status === 429 ||
          errMsg.toLowerCase().includes("quota") ||
          errMsg.toLowerCase().includes("limit");

        return {
          success: false,
          error: errMsg,
          isTemporaryError: isRateLimitOrQuota || response.status >= 500,
          httpStatus: response.status,
          provider: "google_apps_script",
        };
      }

      return {
        success: true,
        messageId: resData.messageId || `gas-${Date.now()}`,
        provider: "google_apps_script",
      };
    } catch (err: any) {
      const isTimeout = err.name === "AbortError" || err.message?.includes("timeout");
      return {
        success: false,
        error: isTimeout ? "Google Apps Script connection timed out after 25s" : err.message || "Network error",
        isTemporaryError: true,
        provider: "google_apps_script",
      };
    }
  }

  /**
   * Diagnostic ping to test live connectivity and quota with the Google Apps Script Web App.
   */
  public async pingRelay(): Promise<{
    configured: boolean;
    connected: boolean;
    latencyMs?: number;
    quotaRemaining?: number | null;
    message: string;
    details?: any;
  }> {
    if (!this.isConfigured()) {
      return {
        configured: false,
        connected: false,
        message: "Google Apps Script endpoint is running in Development / Mock Mode (GOOGLE_APPS_SCRIPT_URL not configured).",
      };
    }

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(this.webAppUrl, {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - start;

      if (!response.ok) {
        return {
          configured: true,
          connected: false,
          latencyMs,
          message: `Relay responded with HTTP ${response.status} (${response.statusText}).`,
        };
      }

      const resData = await response.json().catch(() => null);

      return {
        configured: true,
        connected: true,
        latencyMs,
        quotaRemaining: resData?.remainingDailyQuota ?? null,
        message: "Successfully connected to Google Apps Script Web App Relay!",
        details: resData,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      const isTimeout = err.name === "AbortError";
      return {
        configured: true,
        connected: false,
        latencyMs,
        message: isTimeout
          ? "Connection timed out after 12 seconds."
          : `Failed to connect: ${err.message || "Network error"}`,
      };
    }
  }
}

export const googleAppsScriptClient = new GoogleAppsScriptEmailClient();

