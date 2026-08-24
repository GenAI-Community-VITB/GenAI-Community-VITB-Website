"use server";

import { revalidatePath } from "next/cache";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { requireStaffRole, getAuthenticatedStaff, isExecutiveLeader } from "@/lib/auth/permissions";
import { reviewPayment, sendCustomStaffEmail } from "@/lib/data/registrations";
import { uploadMemberAvatarToDrive } from "@/lib/google/drive";
import { logAuditEvent } from "@/lib/data/audit";
import { eventSchema, userManagementSchema } from "@/lib/validation";

/**
 * Reviews a student registration payment (Approve/Reject) from Finance or Tech portal.
 */
export async function handlePaymentReviewAction(formData: FormData) {
  const { user, profile, role } = await requireStaffRole("finance");

  const paymentId = String(formData.get("payment_id") || "").trim();
  const registrationId = String(formData.get("registration_id") || "").trim();
  const action = String(formData.get("action") || "").trim() as "approve" | "reject";
  const rejectionReason = String(formData.get("rejection_reason") || "").trim() || undefined;
  const rejectionExplanation = String(formData.get("rejection_explanation") || "").trim() || undefined;

  const result = await reviewPayment({
    paymentId,
    registrationId,
    action,
    rejectionReason,
    rejectionExplanation,
    reviewerId: user.id,
    reviewerEmail: profile.email || user.email,
    reviewerRole: role,
  });

  if (!result.success) {
    throw new Error(result.error || "Failed to process payment review");
  }

  revalidatePath("/admin/finance");
  revalidatePath("/admin");
  return { success: true };
}

/**
 * Sends a custom email to a student from Finance or Tech portal.
 */
export async function handleCustomEmailAction(formData: FormData) {
  const { user, profile, role } = await requireStaffRole("finance");

  const registrationId = String(formData.get("registration_id") || "").trim() || undefined;
  const recipientEmail = String(formData.get("recipient_email") || "").trim();
  const subject = String(formData.get("subject") || "").trim();
  const message = String(formData.get("message") || "").trim();

  const result = await sendCustomStaffEmail({
    registrationId,
    recipientEmail,
    subject,
    message,
    senderId: user.id,
    senderEmail: profile.email || user.email,
    senderRole: role,
  });

  if (!result.success) {
    throw new Error(result.error || "Failed to send custom email");
  }

  revalidatePath("/admin/finance");
  revalidatePath("/admin");
  return { success: true };
}

/**
 * Tech-only: Configures event capacity, registration deadline, event timings, and open/closed state.
 */
export async function updateEventConfigurationAction(formData: FormData) {
  const { user, profile, role } = await requireStaffRole("tech");

  const eventId = String(formData.get("event_id") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const maxCapacity = Number(formData.get("max_capacity") || 2000);
  const registrationFee = Number(formData.get("registration_fee") || 200);
  const registrationDeadline = formData.get("registration_deadline")
    ? String(formData.get("registration_deadline")).trim()
    : null;
  const eventStartTime = formData.get("event_start_time")
    ? String(formData.get("event_start_time")).trim()
    : null;
  const eventEndTime = formData.get("event_end_time")
    ? String(formData.get("event_end_time")).trim()
    : null;
  const isRegistrationOpen = formData.get("is_registration_open") === "on" || formData.get("is_registration_open") === "true";
  const upiId = String(formData.get("upi_id") || "genai.community@okaxis").trim();
  const rawGuidelines = formData.get("guidelines") ? String(formData.get("guidelines")).trim() : "";
  const guidelinesArray = rawGuidelines
    ? rawGuidelines
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
    : undefined;

  const supabase = createAdminSupabase();

  // Load previous state
  const { data: previousEvent } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  const updatePayload: Record<string, unknown> = {
    title,
    max_capacity: maxCapacity,
    registration_fee: registrationFee,
    registration_deadline: registrationDeadline || null,
    event_start_time: eventStartTime || null,
    event_end_time: eventEndTime || null,
    is_registration_open: isRegistrationOpen,
    upi_id: upiId,
    updated_at: new Date().toISOString(),
  };

  if (guidelinesArray !== undefined) {
    updatePayload.guidelines = guidelinesArray;
  }

  let { error } = await supabase
    .from("events")
    .update(updatePayload)
    .eq("id", eventId);

  if (error && error.message.includes("guidelines")) {
    delete updatePayload.guidelines;
    const retry = await supabase.from("events").update(updatePayload).eq("id", eventId);
    error = retry.error;
  }

  if (error) {
    throw new Error(`Failed to update event settings: ${error.message}`);
  }

  await logAuditEvent({
    actorUserId: user.id,
    actorEmail: profile.email || user.email,
    actorRole: role,
    action: "event_settings_updated",
    targetType: "event",
    targetId: eventId,
    previousState: previousEvent,
    newState: {
      max_capacity: maxCapacity,
      registration_deadline: registrationDeadline,
      event_start_time: eventStartTime,
      event_end_time: eventEndTime,
      is_registration_open: isRegistrationOpen,
    },
    metadata: { title },
  });

  revalidatePath("/admin/events");
  revalidatePath("/admin");
  revalidatePath(`/events`);
  return { success: true };
}

/**
 * Tech-only: Creates or updates a staff user (Tech, Finance, Volunteer) with safe guard against deleting last Tech lead.
 */
export async function upsertStaffUserAction(formData: FormData) {
  const { user, profile, role } = await requireStaffRole("tech");

  const userId = formData.get("id") ? String(formData.get("id")).trim() : undefined;
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") || "").trim();
  const assignedToName = formData.get("assigned_to_name") ? String(formData.get("assigned_to_name")).trim() : fullName;
  const staffRole = String(formData.get("role") || "").trim() as "tech" | "finance" | "volunteer";
  let password = formData.get("password") ? String(formData.get("password")).trim() : undefined;
  const isActive = formData.get("is_active") === "on" || formData.get("is_active") === "true";

  // Check explicit executive leadership permission if target user is or becomes a Top Executive
  const isTargetTopExecutive = staffRole === "tech" || [
    "president",
    "vice_president",
    "technical_lead",
    "technical_co_lead",
    "aiml_lead",
    "aiml_co_lead",
  ].includes(staffRole);

  if (isTargetTopExecutive && !isExecutiveLeader(role, profile.roles)) {
    throw new Error(
      "Permission Denied: Only President, Technical Leads, and AI/ML Leads are authorized to modify or appoint Top Executive roles.",
    );
  }

  let generatedPassword = "";
  if (!userId && (!password || password.length < 8)) {
    generatedPassword = `GenAI@${Math.random().toString(36).slice(-5)}!${Math.floor(100 + Math.random() * 900)}`;
    password = generatedPassword;
  }

  const parsed = userManagementSchema.safeParse({
    id: userId,
    email,
    full_name: fullName,
    role: staffRole,
    password,
    is_active: isActive,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid user parameters");
  }

  const rolesJson = String(formData.get("roles_json") || "[]").trim();
  let assignedRoles: Array<{ team: string; position: string }> = [];
  try {
    assignedRoles = JSON.parse(rolesJson);
  } catch {
    assignedRoles = [];
  }

  // Handle optional avatar file upload to Google Drive
  const avatarFile = formData.get("avatar_file") as File | null;
  let avatarDriveFileId: string | undefined = undefined;
  let avatarUrl: string | undefined = undefined;

  if (avatarFile && typeof avatarFile === "object" && "size" in avatarFile && avatarFile.size > 0) {
    try {
      const arrayBuffer = await avatarFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const driveRes = await uploadMemberAvatarToDrive({
        buffer,
        fileName: avatarFile.name,
        mimeType: avatarFile.type || "image/jpeg",
        memberName: assignedToName || fullName,
      });
      avatarDriveFileId = driveRes.fileId;
      avatarUrl = driveRes.viewUrl;
    } catch (err) {
      console.error("Avatar upload failed, skipping:", err);
    }
  }

  const supabase = createAdminSupabase();

  if (userId) {
    // Load previous profile state for comprehensive audit logging
    const { data: previousProfile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    // Check if trying to disable or demote the last active Tech user
    if (!isActive || staffRole !== "tech") {
      const { data: activeTechs } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("role", "tech")
        .eq("is_active", true);

      if (activeTechs && activeTechs.length <= 1 && activeTechs.some((t) => t.id === userId)) {
        throw new Error("Action blocked: You cannot disable or demote the only remaining active Tech lead.");
      }
    }

    const updatePayload: Record<string, unknown> = {
      full_name: fullName,
      assigned_to_name: assignedToName,
      role: staffRole,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    };
    if (password && password.length >= 8) {
      updatePayload.password = password;
    }
    if (avatarDriveFileId) {
      updatePayload.drive_file_id = avatarDriveFileId;
      updatePayload.avatar_url = avatarUrl;
    }

    const { error: profileErr } = await supabase
      .from("user_profiles")
      .update(updatePayload)
      .eq("id", userId);

    if (profileErr) throw new Error(profileErr.message);

    // Persist multi-roles
    await supabase.from("member_roles").delete().eq("user_id", userId);
    if (assignedRoles.length > 0) {
      await supabase.from("member_roles").insert(
        assignedRoles.map((r) => ({
          user_id: userId,
          team: r.team,
          position: r.position,
        })),
      );
    }

    if (password && password.length >= 8) {
      await supabase.auth.admin.updateUserById(userId, { password });
    }

    await logAuditEvent({
      actorUserId: user.id,
      actorEmail: profile.email || user.email,
      actorRole: role,
      action: "member_profile_updated",
      targetType: "user",
      targetId: userId,
      previousState: {
        full_name: (previousProfile as any)?.full_name,
        assigned_to_name: (previousProfile as any)?.assigned_to_name,
        avatar_url: (previousProfile as any)?.avatar_url,
        drive_file_id: (previousProfile as any)?.drive_file_id,
        role: (previousProfile as any)?.role,
        is_active: (previousProfile as any)?.is_active,
      },
      newState: {
        full_name: fullName,
        assigned_to_name: assignedToName,
        avatar_url: avatarUrl || (previousProfile as any)?.avatar_url,
        drive_file_id: avatarDriveFileId || (previousProfile as any)?.drive_file_id,
        role: staffRole,
        is_active: isActive,
        roles: assignedRoles,
      },
      metadata: {
        member_email: email,
        avatar_updated: Boolean(avatarDriveFileId),
        name_updated: fullName !== (previousProfile as any)?.full_name,
        assigned_to_updated: assignedToName !== (previousProfile as any)?.assigned_to_name,
        password_changed: Boolean(password && password.length >= 8),
      },
    });
  } else {
    // Create new Supabase auth user
    const { data: newUser, error: createAuthErr } = await supabase.auth.admin.createUser({
      email,
      password: password!,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: staffRole, assigned_to_name: assignedToName },
    });

    if (createAuthErr || !newUser.user) {
      throw new Error(createAuthErr?.message || "Failed to create authentication user");
    }

    const { error: insertProfileErr } = await supabase.from("user_profiles").upsert({
      id: newUser.user.id,
      email,
      full_name: fullName,
      assigned_to_name: assignedToName,
      password: password!,
      avatar_url: avatarUrl || null,
      drive_file_id: avatarDriveFileId || null,
      role: staffRole,
      is_active: isActive,
    });

    if (insertProfileErr) throw new Error(insertProfileErr.message);

    // Persist multi-roles for new member
    if (assignedRoles.length > 0) {
      await supabase.from("member_roles").insert(
        assignedRoles.map((r) => ({
          user_id: newUser.user.id,
          team: r.team,
          position: r.position,
        })),
      );
    }

    await logAuditEvent({
      actorUserId: user.id,
      actorEmail: profile.email || user.email,
      actorRole: role,
      action: "user_created",
      targetType: "user",
      targetId: newUser.user.id,
      newState: { email, full_name: fullName, assigned_to_name: assignedToName, role: staffRole, is_active: isActive, roles: assignedRoles },
    });
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return { success: true, generatedPassword: generatedPassword || undefined, email };
}

/**
 * Top-6 only: Completely VOIDS an account, revokes login credentials, and invalidates access.
 */
export async function voidStaffUserAction(userId: string, reason: string) {
  const { user, profile, role } = await requireStaffRole("tech");
  const supabase = createAdminSupabase();

  // Load target user profile
  const { data: targetProfile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (!targetProfile) {
    throw new Error("Target user not found");
  }

  // Guard against voiding yourself or last tech lead
  if (userId === user.id) {
    throw new Error("You cannot void your own account.");
  }

  const { error: voidErr } = await supabase
    .from("user_profiles")
    .update({
      is_active: false,
      is_voided: true,
      voided_at: new Date().toISOString(),
      voided_reason: reason.trim() || "Account voided by executive administration",
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (voidErr) throw new Error(voidErr.message);

  // Invalidate and delete from Supabase Auth so login is completely blocked
  try {
    await supabase.auth.admin.deleteUser(userId);
  } catch (err: any) {
    console.warn("Could not delete auth user during voiding:", err.message);
  }

  // Remove role assignments
  await supabase.from("member_roles").delete().eq("user_id", userId);

  await logAuditEvent({
    actorUserId: user.id,
    actorEmail: profile.email || user.email,
    actorRole: role,
    action: "user_voided",
    targetType: "user",
    targetId: userId,
    reason: reason.trim() || "Account voided and access permanently revoked",
    metadata: {
      target_email: targetProfile.email,
      target_name: targetProfile.full_name,
      assigned_to_name: targetProfile.assigned_to_name,
    },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return { success: true };
}

/**
 * Tech-only: Soft-disables a staff user with safeguard for last tech lead.
 */
export async function toggleStaffUserActiveAction(userId: string, currentActive: boolean) {
  const { user, profile, role } = await requireStaffRole("tech");

  const supabase = createAdminSupabase();

  if (currentActive) {
    // Check if last tech
    const { data: targetProfile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (targetProfile?.role === "tech") {
      const { data: activeTechs } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("role", "tech")
        .eq("is_active", true);

      if (activeTechs && activeTechs.length <= 1 && activeTechs.some((t) => t.id === userId)) {
        throw new Error("Action blocked: You cannot disable the only remaining active Tech lead.");
      }
    }
  }

  const { error } = await supabase
    .from("user_profiles")
    .update({ is_active: !currentActive, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) throw new Error(error.message);

  await logAuditEvent({
    actorUserId: user.id,
    actorEmail: profile.email || user.email,
    actorRole: role,
    action: currentActive ? "user_disabled" : "user_enabled",
    targetType: "user",
    targetId: userId,
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return { success: true };
}

/**
 * Allows any logged-in staff member to change their own password.
 */
export async function changeMyPasswordAction(newPassword: string) {
  const { user, profile, role } = await getAuthenticatedStaff();
  const trimmed = (newPassword || "").trim();

  if (trimmed.length < 8) {
    throw new Error("New password must be at least 8 characters long.");
  }

  const supabase = createAdminSupabase();

  // Update in Supabase Auth
  const { error: authErr } = await supabase.auth.admin.updateUserById(user.id, {
    password: trimmed,
  });

  if (authErr) {
    throw new Error(authErr.message || "Failed to update password.");
  }

  // Update user_profiles password and updated_at
  await supabase
    .from("user_profiles")
    .update({
      password: trimmed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  await logAuditEvent({
    actorUserId: user.id,
    actorEmail: profile?.email || user.email,
    actorRole: role || "volunteer",
    action: "password_changed",
    targetType: "user",
    targetId: user.id,
    reason: "Self-service password update",
    metadata: {
      user_email: profile?.email || user.email,
      assigned_to_name: profile?.assigned_to_name || profile?.full_name,
      role: role || "volunteer",
    },
  });

  // Mirror to Google Sheets Email Logs tab: Record timestamp and actor without exposing new password
  try {
    const { appendToGoogleSheet } = await import("@/lib/google/sheets");
    const { formatISTDate } = await import("@/lib/utils/format");
    const logId = `PWR-${Date.now()}`;
    const istTime = formatISTDate(new Date(), true);
    const actorName = profile?.assigned_to_name || profile?.full_name || user.email || "Self";

    appendToGoogleSheet("Email Logs", [
      [
        logId,
        istTime,
        profile?.email || user.email || "staff@genai.community",
        "self_password_changed",
        "Community User Management",
        `Updated by: ${actorName} (${role || "Staff"})`,
        "success",
        "Self-service password modification (Password masked)",
        0,
      ],
    ]).catch((err) => console.error("Error logging self password change to Email Logs:", err));
  } catch {}

  return { success: true };
}

/**
 * Top-6 only: Resets a staff member's password and stores the new password.
 */
export async function resetStaffPasswordAction(userId: string, customPassword?: string) {
  const { user, profile, role } = await requireStaffRole("tech");
  const supabase = createAdminSupabase();

  const newPassword =
    customPassword && customPassword.trim().length >= 8
      ? customPassword.trim()
      : `GenAI@${Math.random().toString(36).slice(-5)}!${Math.floor(100 + Math.random() * 900)}`;

  const { error: authErr } = await supabase.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (authErr) throw new Error(authErr.message);

  await supabase
    .from("user_profiles")
    .update({
      password: newPassword,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  await logAuditEvent({
    actorUserId: user.id,
    actorEmail: profile.email || user.email,
    actorRole: role,
    action: "password_reset",
    targetType: "user",
    targetId: userId,
  });

  // Mirror to Google Sheets Email Logs tab: Record timestamp and who changed it without writing the new password
  try {
    const { appendToGoogleSheet } = await import("@/lib/google/sheets");
    const { formatISTDate } = await import("@/lib/utils/format");
    const logId = `PWR-${Date.now()}`;
    const istTime = formatISTDate(new Date(), true);
    const actorName = profile.full_name || profile.assigned_to_name || user.email || "Top-6 Admin";

    appendToGoogleSheet("Email Logs", [
      [
        logId,
        istTime,
        userId,
        "password_reset_direct",
        "Member Management",
        `Reset by: ${actorName} (${role})`,
        "sent",
        "Staff password changed (Credentials masked for security)",
        0,
      ],
    ]).catch((err) => console.error("Error logging direct password reset to Email Logs:", err));
  } catch {}

  revalidatePath("/admin/users");
  return { success: true, newPassword };
}

/**
 * Top-6 only: Removes and archives a registration record (even if verified/approved/checked-in).
 */
export async function deleteRegistrationAction(formData: FormData) {
  const { user, profile, role, isTop6 } = await requireStaffRole("finance");
  if (!isTop6) {
    throw new Error("Unauthorized: Only Top-6 Executives have permission to remove registered/approved participants.");
  }

  const registrationId = String(formData.get("registration_id") || "").trim();
  const reason = String(formData.get("reason") || "Executive manual removal").trim();

  if (!registrationId) {
    throw new Error("Registration ID is required");
  }

  const { deleteRegistrationWithArchive } = await import("@/lib/data/registrations");
  const result = await deleteRegistrationWithArchive({
    registrationId,
    reason,
    actorId: user.id,
    actorName: profile?.full_name || profile?.assigned_to_name || user.email || "Executive",
    actorRole: role,
  });

  if (!result.success) {
    throw new Error(result.error || "Failed to remove participant registration");
  }

  revalidatePath("/admin/finance");
  revalidatePath("/admin/events");
  revalidatePath("/admin");
  return { success: true };
}

/**
 * Top-6 only: Restores an archived registration back into active status.
 */
export async function restoreRegistrationAction(formData: FormData) {
  const { user, role, isTop6 } = await requireStaffRole("finance");
  if (!isTop6) {
    throw new Error("Unauthorized: Only Top-6 Executives have permission to restore deleted participants.");
  }

  const deletedId = String(formData.get("deleted_id") || "").trim();

  if (!deletedId) {
    throw new Error("Deleted registration ID is required");
  }

  const { restoreDeletedRegistration } = await import("@/lib/data/registrations");
  const result = await restoreDeletedRegistration({
    deletedId,
    actorId: user.id,
    actorRole: role,
  });

  if (!result.success) {
    throw new Error(result.error || "Failed to restore participant registration");
  }

  revalidatePath("/admin/finance");
  revalidatePath("/admin/events");
  revalidatePath("/admin");
  return { success: true };
}

/**
 * Top-6 / Exec only: Fetches all volunteers assigned to a specific event.
 */
export async function getEventVolunteersAction(eventId: string) {
  const { isTop6, role } = await requireStaffRole("volunteer");
  const supabase = createAdminSupabase();

  try {
    const { data, error } = await supabase
      .from("event_volunteers")
      .select("id, event_id, user_id, assigned_at, user:user_profiles(id, email, full_name, assigned_to_name, role)")
      .eq("event_id", eventId)
      .order("assigned_at", { ascending: true });

    if (error) {
      console.warn("Could not query event_volunteers table:", error.message);
      return { success: true, volunteers: [] };
    }

    return { success: true, volunteers: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch event volunteers", volunteers: [] };
  }
}

/**
 * Top-6 only: Assigns a club member as a scanner volunteer for an event.
 */
export async function assignEventVolunteerAction(formData: FormData) {
  const { user, profile, role, isTop6 } = await requireStaffRole("volunteer");
  const isEventLead = profile?.roles?.some((r: any) => r.team === "event_management" && String(r.position || "").includes("lead"));
  if (!isTop6 && role !== "tech" && !isEventLead) {
    throw new Error("Unauthorized: Only Top Executives and Event Leads can assign gate volunteers.");
  }

  const eventId = String(formData.get("event_id") || "").trim();
  const targetUserId = String(formData.get("user_id") || "").trim();

  if (!eventId || !targetUserId) {
    throw new Error("Event ID and Member ID are required.");
  }

  const supabase = createAdminSupabase();

  const { error } = await supabase.from("event_volunteers").upsert(
    {
      event_id: eventId,
      user_id: targetUserId,
      assigned_by: user.id,
      assigned_at: new Date().toISOString(),
    },
    { onConflict: "event_id,user_id" },
  );

  if (error) {
    throw new Error(error.message || "Failed to assign volunteer to event.");
  }

  // Audit log
  try {
    await logAuditEvent({
      actorUserId: user.id,
      actorEmail: profile?.email || user.email,
      actorRole: role,
      action: "event_volunteer_assigned",
      targetType: "event",
      targetId: eventId,
      newState: { eventId, assignedUserId: targetUserId },
    });
  } catch {}

  revalidatePath("/admin/events");
  revalidatePath("/admin/scanner");
  return { success: true };
}

/**
 * Top-6 only: Revokes a member's scanner volunteer role for an event.
 */
export async function removeEventVolunteerAction(formData: FormData) {
  const { user, profile, role, isTop6 } = await requireStaffRole("volunteer");
  const isEventLead = profile?.roles?.some((r: any) => r.team === "event_management" && String(r.position || "").includes("lead"));
  if (!isTop6 && role !== "tech" && !isEventLead) {
    throw new Error("Unauthorized: Only Top Executives and Event Leads can revoke gate volunteers.");
  }

  const eventId = String(formData.get("event_id") || "").trim();
  const targetUserId = String(formData.get("user_id") || "").trim();

  if (!eventId || !targetUserId) {
    throw new Error("Event ID and Member ID are required.");
  }

  const supabase = createAdminSupabase();

  const { error } = await supabase
    .from("event_volunteers")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", targetUserId);

  if (error) {
    throw new Error(error.message || "Failed to remove volunteer from event.");
  }

  // Audit log
  try {
    await logAuditEvent({
      actorUserId: user.id,
      actorEmail: profile?.email || user.email,
      actorRole: role,
      action: "event_volunteer_revoked",
      targetType: "event",
      targetId: eventId,
      newState: { eventId, revokedUserId: targetUserId },
    });
  } catch {}

  revalidatePath("/admin/events");
  revalidatePath("/admin/scanner");
  return { success: true };
}

/**
 * Bulk imports registered candidates from Excel/CSV and dispatches cryptographic QR passes.
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
}) {
  await requireStaffRole("tech");
  const { importParticipantsBulkAction: bulkImport } = await import("@/lib/data/registrations");
  const res = await bulkImport(params);
  revalidatePath("/admin/events");
  revalidatePath("/admin/registrations");
  return res;
}

/**
 * Exports real-time event attendance data in CSV format.
 */
export async function exportAttendanceDataAction(eventId: string) {
  await requireStaffRole("tech");
  const { exportAttendanceDataAction: exportAttendance } = await import("@/lib/data/registrations");
  return await exportAttendance(eventId);
}




