import { createAdminSupabase } from "@/lib/supabase/admin";
import { appendToGoogleSheet } from "@/lib/google/sheets";
import { formatISTDate } from "@/lib/utils/format";

export interface LogAuditParams {
  actorUserId?: string | null;
  actorEmail?: string | null;
  actorRole: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Records an audit log into Supabase `audit_logs` and mirrors it to Google Sheets.
 */
export async function logAuditEvent(params: LogAuditParams) {
  try {
    const supabase = createAdminSupabase();
    const { data, error } = await supabase
      .from("audit_logs")
      .insert({
        actor_user_id: params.actorUserId || null,
        actor_email: params.actorEmail || null,
        actor_role: params.actorRole,
        action: params.action,
        target_type: params.targetType,
        target_id: params.targetId || null,
        previous_state: params.previousState || null,
        new_state: params.newState || null,
        reason: params.reason || null,
        metadata: params.metadata || {},
        ip_address: params.ipAddress || null,
        user_agent: params.userAgent || null,
      })
      .select("id, created_at")
      .single();

    if (error) {
      console.error("Database audit log insert error:", error);
    }

    // Mirror to Google Sheets non-blockingly
    const istTime = formatISTDate(data?.created_at ? new Date(data.created_at) : new Date(), true);
    appendToGoogleSheet("System Audit Logs", [
      [
        data?.id || `AUDIT-${Date.now()}`,
        istTime,
        params.actorEmail || params.actorUserId || "System",
        params.actorRole,
        params.action,
        params.targetType,
        params.targetId || "Global",
        "SUCCESS",
        params.ipAddress || "Internal",
        JSON.stringify(params.metadata || {}),
      ],
    ]).catch((err) => console.error("Error mirroring audit log to Google Sheets:", err));
  } catch (err) {
    console.error("Error in logAuditEvent:", err);
  }
}

export interface LogSystemFailureParams {
  module: string;
  errorMessage: string;
  stackTrace?: string | null;
  severity?: "low" | "medium" | "high" | "critical";
  userAffected?: string | null;
  eventAffected?: string | null;
  payload?: Record<string, unknown>;
}

/**
 * Records a system failure into Supabase and Google Sheets System Failure Logs tab.
 */
export async function logSystemFailure(params: LogSystemFailureParams) {
  try {
    const failureId = `FAIL-${Date.now()}`;
    const istTime = formatISTDate(new Date(), true);
    const severity = params.severity || "medium";

    // 1. Record in Supabase
    try {
      const supabase = createAdminSupabase();
      await supabase.from("sync_failures").insert({
        service: params.module,
        operation: "system_error",
        payload: {
          failureId,
          userAffected: params.userAffected,
          eventAffected: params.eventAffected,
          stackTrace: params.stackTrace,
          details: params.payload,
        },
        error_message: params.errorMessage,
        resolved: false,
      });
    } catch (dbErr) {
      console.warn("Could not write failure to Supabase table:", dbErr);
    }

    // 2. Mirror to Google Sheets System Failure Logs tab
    appendToGoogleSheet("System Failure Logs", [
      [
        failureId,
        istTime,
        params.module,
        params.errorMessage,
        params.stackTrace || "N/A",
        severity.toUpperCase(),
        params.userAffected || "N/A",
        params.eventAffected || "N/A",
        "UNRESOLVED",
      ],
    ]).catch((err) => console.error("Error mirroring failure to Google Sheets:", err));
  } catch (err) {
    console.error("Error in logSystemFailure:", err);
  }
}
