import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/mailer";
import { getFinanceReminderTemplate } from "@/lib/email/templates";
import { logAuditEvent } from "@/lib/data/audit";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminSupabase();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Find pending registrations older than 24h
    const { data: pendingRegs, error: regErr } = await supabase
      .from("registrations")
      .select("id, created_at")
      .eq("registration_status", "pending")
      .lte("created_at", twentyFourHoursAgo);

    if (regErr) {
      return NextResponse.json({ error: regErr.message }, { status: 500 });
    }

    if (!pendingRegs || pendingRegs.length === 0) {
      return NextResponse.json({
        message: "No registrations pending > 24 hours. No reminder needed.",
        count: 0,
      });
    }

    // Find recipient emails for Finance and Tech users
    const { data: staffList } = await supabase
      .from("user_profiles")
      .select("email, role")
      .in("role", ["finance", "tech"])
      .eq("is_active", true);

    const recipientEmails = (staffList || []).map((s) => s.email);

    if (recipientEmails.length === 0) {
      return NextResponse.json({
        message: "No active Finance/Tech staff emails found.",
        pendingCount: pendingRegs.length,
      });
    }

    // Calculate oldest pending hours
    const oldestTimestamp = new Date(pendingRegs[0].created_at).getTime();
    const oldestHours = Math.round((Date.now() - oldestTimestamp) / (1000 * 60 * 60));

    const reminderTemplate = getFinanceReminderTemplate({
      pendingCount: pendingRegs.length,
      oldestPendingHours: oldestHours,
    });

    let sentCount = 0;
    for (const email of recipientEmails) {
      const res = await sendEmail({
        to: email,
        subject: reminderTemplate.subject,
        html: reminderTemplate.html,
        emailType: "finance_reminder",
        senderRole: "system",
      });
      if (res.success) sentCount++;
    }

    await logAuditEvent({
      actorRole: "system",
      action: "finance_reminder_sent",
      targetType: "system",
      metadata: {
        pendingCount: pendingRegs.length,
        recipients: recipientEmails,
        sentCount,
      },
    });

    return NextResponse.json({
      success: true,
      pendingCount: pendingRegs.length,
      recipientsNotified: sentCount,
    });
  } catch (err: any) {
    console.error("Error in /api/admin/reminders:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
