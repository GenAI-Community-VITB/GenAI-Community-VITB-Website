import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedStaff } from "@/lib/auth/permissions";
import { EmailService } from "@/lib/email/service";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getRegistrationConfirmedTemplate, getEventReminderTemplate } from "@/lib/email/templates";
import { generateEntryPassQRCodeBuffer } from "@/lib/qr/generator";
import { formatISTDate } from "@/lib/utils/format";
import { checkRateLimit, createRateLimitResponse } from "@/lib/security/rate-limiter";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user, profile, role } = await getAuthenticatedStaff();
    if (!user || !profile) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const eventId = req.nextUrl.searchParams.get("eventId") || undefined;
    const stats = await EmailService.getStatistics(eventId);

    const supabase = createAdminSupabase();
    let query = supabase
      .from("email_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (eventId) {
      query = query.eq("event_id", eventId);
    }

    const { data: logs } = await query;

    return NextResponse.json({
      success: true,
      stats,
      logs: logs || [],
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, profile, role } = await getAuthenticatedStaff();
    if (!user || !profile) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // ── ADMIN EMAIL RATE LIMIT (10 actions / hour) ──
    const rateCheck = await checkRateLimit(user.id, "email");
    if (rateCheck.limited) {
      return createRateLimitResponse(
        rateCheck,
        "Admin email sending quota exceeded. Please wait before triggering more email actions."
      );
    }

    const body = await req.json();
    const { action, eventId, registrationId, forceResend } = body;
    const supabase = createAdminSupabase();

    // 0. Diagnostic Ping to Google Apps Script Web App
    if (action === "test_relay_ping") {
      const { googleAppsScriptClient } = await import("@/lib/email/google-apps-script");
      const pingResult = await googleAppsScriptClient.pingRelay();
      return NextResponse.json({ success: true, ping: pingResult });
    }

    // 0.1 Send Diagnostic Test Email
    if (action === "send_test_email") {
      const recipient = String(body.recipient || user.email || "").trim();
      if (!recipient || !recipient.includes("@")) {
        return NextResponse.json({ success: false, error: "Valid recipient email address is required." }, { status: 400 });
      }

      const sendResult = await EmailService.send({
        to: recipient,
        recipientName: profile.full_name || "Club Admin",
        subject: "⚡ [Test Relay] GenAI Community VIT Bhopal Email Engine Diagnostic",
        html: `<div style="font-family: sans-serif; background: #000; color: #fff; padding: 24px; border-radius: 12px; border: 1px solid #f5b642;">
          <h2 style="color: #f5b642; margin-top: 0;">⚡ Google Apps Script Relay Active</h2>
          <p>This is a real-time transactional test dispatch from the <strong>GenAI Community VIT Bhopal</strong> administrative dashboard.</p>
          <p style="color: #a1a1aa; font-size: 12px;">Triggered by: <strong>${profile.full_name || user.email}</strong> (${role || "Staff"})</p>
          <p style="color: #38bdf8; font-size: 12px; font-family: monospace;">Timestamp: ${new Date().toISOString()}</p>
        </div>`,
        emailType: "test_email",
        senderId: user.id,
        senderRole: role || undefined,
        forceResend: true,
      });

      return NextResponse.json({ success: sendResult.success, sendResult });
    }

    // 1. Retry failed emails
    if (action === "retry_failed") {
      const retryResult = await EmailService.retryFailed(eventId);
      return NextResponse.json({ success: true, ...retryResult });
    }

    // 2. Resend single confirmation QR pass
    if (action === "resend_confirmation" && registrationId) {
      const { data: reg } = await supabase
        .from("registrations")
        .select("*, event:events(*)")
        .eq("id", registrationId)
        .single();

      if (!reg) {
        return NextResponse.json({ success: false, message: "Registration not found" }, { status: 404 });
      }

      const qrToken = reg.qr_token || `GENAI_QR_${reg.registration_number}_${Date.now()}`;
      const qrBuffer = await generateEntryPassQRCodeBuffer({
        qrToken,
        registrationNumber: reg.registration_number,
        fullName: reg.full_name,
        vitRegNumber: reg.vit_registration_number,
      });

      const qrCid = `entry-pass-${reg.registration_number}`;
      const eventTitle = reg.event?.title || "GenAI Community Event";
      const eventDate = reg.event?.event_date ? formatISTDate(reg.event.event_date) : "TBA";
      const venue = reg.event?.venue || "Main Auditorium";

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

      const sendResult = await EmailService.send({
        to: destinationEmails,
        recipientName: reg.full_name,
        subject: emailData.subject,
        html: emailData.html,
        emailType: "payment_approved_qr",
        registrationId: reg.id,
        eventId: reg.event_id,
        senderId: user.id,
        senderRole: role || undefined,
        forceResend: true,
        attachments: [
          {
            filename: `QR_Pass_${reg.registration_number}.png`,
            content: qrBuffer,
            cid: qrCid,
            contentType: "image/png",
          },
        ],
      });

      return NextResponse.json({ success: sendResult.success, sendResult });
    }

    // 3. Bulk send confirmation emails to all verified registrations (Capacity up to 5,000)
    if (action === "bulk_send_confirmations" && eventId) {
      const { data: registrations } = await supabase
        .from("registrations")
        .select("*, event:events(*)")
        .eq("event_id", eventId)
        .in("registration_status", ["verified", "checked_in"]);

      if (!registrations || registrations.length === 0) {
        return NextResponse.json({ success: true, count: 0, message: "No verified registrations found." });
      }

      // Prepare jobs
      const jobs = [];
      for (const reg of registrations) {
        const qrToken = reg.qr_token || `GENAI_QR_${reg.registration_number}_${Date.now()}`;
        const qrBuffer = await generateEntryPassQRCodeBuffer({
          qrToken,
          registrationNumber: reg.registration_number,
          fullName: reg.full_name,
          vitRegNumber: reg.vit_registration_number,
        });

        const qrCid = `entry-pass-${reg.registration_number}`;
        const eventTitle = reg.event?.title || "GenAI Community Event";
        const eventDate = reg.event?.event_date ? formatISTDate(reg.event.event_date) : "TBA";
        const venue = reg.event?.venue || "Main Auditorium";

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

        jobs.push({
          to: destinationEmails,
          recipientName: reg.full_name,
          subject: emailData.subject,
          html: emailData.html,
          emailType: "payment_approved_qr" as const,
          registrationId: reg.id,
          eventId: reg.event_id,
          senderId: user.id,
          senderRole: role || undefined,
          forceResend: Boolean(forceResend),
          attachments: [
            {
              filename: `QR_Pass_${reg.registration_number}.png`,
              content: qrBuffer,
              cid: qrCid,
              contentType: "image/png",
            },
          ],
        });
      }

      // Execute non-blocking batch dispatch
      const batchResult = await EmailService.dispatchBulk(jobs, {
        batchSize: 25,
        delayBetweenBatchesMs: 150,
      });

      return NextResponse.json({
        success: true,
        totalScheduled: registrations.length,
        sent: batchResult.sent,
        skipped: batchResult.skipped,
        failed: batchResult.failed,
      });
    }

    // 4. Bulk send event reminders
    if (action === "bulk_send_reminders" && eventId) {
      const { data: registrations } = await supabase
        .from("registrations")
        .select("*, event:events(*)")
        .eq("event_id", eventId)
        .in("registration_status", ["verified", "checked_in"]);

      if (!registrations || registrations.length === 0) {
        return NextResponse.json({ success: true, count: 0, message: "No verified attendees found." });
      }

      const jobs = [];
      for (const reg of registrations) {
        const eventTitle = reg.event?.title || "GenAI Community Event";
        const eventDate = reg.event?.event_date ? formatISTDate(reg.event.event_date) : "TBA";
        const venue = reg.event?.venue || "Main Auditorium";

        const emailData = getEventReminderTemplate({
          fullName: reg.full_name,
          vitRegNumber: reg.vit_registration_number,
          registrationNumber: reg.registration_number,
          eventTitle,
          eventDate,
          venue,
        });

        const destinationEmails = Array.from(new Set([reg.personal_email, reg.college_email].filter(Boolean)));

        jobs.push({
          to: destinationEmails,
          recipientName: reg.full_name,
          subject: emailData.subject,
          html: emailData.html,
          emailType: "event_reminder" as const,
          registrationId: reg.id,
          eventId: reg.event_id,
          senderId: user.id,
          senderRole: role || undefined,
          forceResend: Boolean(forceResend),
        });
      }

      const batchResult = await EmailService.dispatchBulk(jobs, {
        batchSize: 25,
        delayBetweenBatchesMs: 150,
      });

      return NextResponse.json({
        success: true,
        totalScheduled: registrations.length,
        sent: batchResult.sent,
        skipped: batchResult.skipped,
        failed: batchResult.failed,
      });
    }

    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Admin Email API Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
