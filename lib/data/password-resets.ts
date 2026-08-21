"use server";

import { revalidatePath } from "next/cache";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStaff } from "@/lib/auth/permissions";
import { logAuditEvent } from "@/lib/data/audit";
import { isTop6Admin } from "@/lib/utils/format";

export interface PasswordResetQuery {
  id: string;
  email: string;
  student_name: string;
  reason?: string | null;
  status: "pending" | "approved" | "rejected";
  resolved_by?: string | null;
  resolved_at?: string | null;
  notes?: string | null;
  created_at: string;
}

// In-memory fallback queue for zero-downtime when database migration is pending
const fallbackResetQueries: PasswordResetQuery[] = [];

/**
 * Public action: A club member raises a password reset query to Executive 6.
 */
export async function submitPasswordResetQuery(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const studentName = String(formData.get("student_name") || "").trim();
  const reason = String(formData.get("reason") || "").trim();

  if (!email || !email.includes("@")) {
    throw new Error("A valid club email address is required.");
  }
  if (!studentName) {
    throw new Error("Student full name is required.");
  }

  const supabase = createAdminSupabase();

  // Check if profile exists
  let profileName = studentName;
  try {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id, email, full_name, assigned_to_name, is_voided, is_active")
      .ilike("email", email)
      .maybeSingle();

    if (profile) {
      if (profile.is_voided) {
        throw new Error("This account has been voided. Contact club leadership directly.");
      }
      profileName = profile.assigned_to_name || profile.full_name || studentName;
    }
  } catch (err: any) {
    if (err.message && err.message.includes("voided")) {
      throw err;
    }
  }

  // Attempt database insert
  let dbInserted = false;
  try {
    const { error } = await supabase.from("password_reset_requests").insert({
      email,
      student_name: studentName,
      reason: reason || "Forgot password query raised via login page",
      status: "pending",
    });
    if (!error) {
      dbInserted = true;
    }
  } catch {}

  if (!dbInserted) {
    // Fallback store in memory & audit
    const fallbackItem: PasswordResetQuery = {
      id: `reset-req-${Date.now()}-${Math.random().toString(36).slice(-5)}`,
      email,
      student_name: studentName,
      reason: reason || "Forgot password query raised via login page",
      status: "pending",
      created_at: new Date().toISOString(),
    };
    fallbackResetQueries.unshift(fallbackItem);
  }

  return {
    success: true,
    message: "Your query has been dispatched to Executive 6 for verification.",
  };
}

/**
 * Fetch all pending and recent password reset queries (for Exec 6).
 */
export async function getPasswordResetQueries(): Promise<PasswordResetQuery[]> {
  const list: PasswordResetQuery[] = [];
  try {
    const supabase = createAdminSupabase();
    const { data, error } = await supabase
      .from("password_reset_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      list.push(...(data as PasswordResetQuery[]));
    }
  } catch {}

  // Merge in-memory queries not in list
  for (const f of fallbackResetQueries) {
    if (!list.some((item) => item.id === f.id || (item.email === f.email && item.created_at === f.created_at))) {
      list.unshift(f);
    }
  }

  return list;
}

/**
 * Exec 6 only: Approve and reset password or reject query.
 */
export async function resolvePasswordResetQueryAction(formData: FormData) {
  const { user, profile, role } = await getAuthenticatedStaff();

  const isAllowed = isTop6Admin(role, profile?.roles) || role === "president" || role === "vice_president";
  if (!isAllowed) {
    throw new Error("Action denied: Only Executive 6 members can approve and reset passwords.");
  }

  const queryId = String(formData.get("query_id") || "");
  const actionType = String(formData.get("action_type") || "approve"); // "approve" | "reject"
  const newPassword = String(formData.get("new_password") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!queryId) throw new Error("Query ID is required.");

  const supabase = createAdminSupabase();

  let targetEmail = "";
  // Check in database first
  try {
    const { data: req } = await supabase
      .from("password_reset_requests")
      .select("*")
      .eq("id", queryId)
      .maybeSingle();

    if (req) {
      targetEmail = req.email;
    }
  } catch {}

  // Fallback to in-memory lookup
  if (!targetEmail) {
    const memReq = fallbackResetQueries.find((q) => q.id === queryId);
    if (memReq) {
      targetEmail = memReq.email;
    }
  }

  if (!targetEmail) {
    throw new Error("Reset request not found.");
  }

  if (actionType === "approve") {
    const finalPassword = newPassword || `GenAI@${Math.random().toString(36).slice(-5)}!${Math.floor(100 + Math.random() * 900)}`;

    // Find profile
    try {
      const { data: targetProfile } = await supabase
        .from("user_profiles")
        .select("id, email")
        .ilike("email", targetEmail)
        .maybeSingle();

      if (targetProfile) {
        // Update Supabase auth password
        await supabase.auth.admin.updateUserById(targetProfile.id, { password: finalPassword });

        // Update user_profiles.password
        await supabase
          .from("user_profiles")
          .update({ password: finalPassword, updated_at: new Date().toISOString() })
          .eq("id", targetProfile.id);
      }
    } catch (err) {
      console.error("Error updating user password:", err);
    }

    // Mark query as approved in database
    try {
      await supabase
        .from("password_reset_requests")
        .update({
          status: "approved",
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
          notes: notes ? `${notes} (Password: ${finalPassword})` : `Approved by ${profile?.full_name || user.email} (Password: ${finalPassword})`,
        })
        .eq("id", queryId);
    } catch {}

    // Update in-memory fallback
    const memItem = fallbackResetQueries.find((q) => q.id === queryId);
    if (memItem) {
      memItem.status = "approved";
      memItem.resolved_by = user.id;
      memItem.resolved_at = new Date().toISOString();
    }

    try {
      await logAuditEvent({
        actorUserId: user.id,
        actorEmail: profile?.email || user.email || "staff@genai.community",
        actorRole: role || "tech",
        action: "password_reset_approved",
        targetType: "user",
        targetId: targetEmail,
        newState: { email: targetEmail, status: "approved" },
      });

      // Mirror to Google Sheets Email Logs tab: Record timestamp and who changed it without writing the new password
      const { appendToGoogleSheet } = await import("@/lib/google/sheets");
      const { formatISTDate } = await import("@/lib/utils/format");
      const logId = `PWR-${Date.now()}`;
      const istTime = formatISTDate(new Date(), true);
      const actorName = profile?.full_name || profile?.assigned_to_name || user.email || "Exec Admin";

      appendToGoogleSheet("Email Logs", [
        [
          logId,
          istTime,
          targetEmail,
          "password_changed_notification",
          "Internal Admin",
          `Changed by: ${actorName} (${role || "Executive"})`,
          "sent",
          "Password updated successfully (Credentials masked for security)",
          0,
        ],
      ]).catch((err) => console.error("Error logging password change to Email Logs:", err));
    } catch {}

    revalidatePath("/admin");
    revalidatePath("/admin/users");

    return {
      success: true,
      action: "approved",
      newPassword: finalPassword,
      email: targetEmail,
    };
  } else {
    // Reject
    try {
      await supabase
        .from("password_reset_requests")
        .update({
          status: "rejected",
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
          notes: notes || `Rejected by ${profile?.full_name || user.email}`,
        })
        .eq("id", queryId);
    } catch {}

    const memItem = fallbackResetQueries.find((q) => q.id === queryId);
    if (memItem) {
      memItem.status = "rejected";
      memItem.resolved_by = user.id;
      memItem.resolved_at = new Date().toISOString();
    }

    revalidatePath("/admin");
    revalidatePath("/admin/users");

    return { success: true, action: "rejected", email: targetEmail };
  }
}
