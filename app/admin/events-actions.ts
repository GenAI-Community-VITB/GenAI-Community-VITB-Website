"use server";

import { revalidatePath } from "next/cache";
import { createAdminSupabase } from "@/lib/supabase/admin";
import {
  requireStaffRole,
  getAuthenticatedStaff,
  isExecutiveLeader,
  isSupremeExecutive,
  isExecutiveAccount,
  isTop6Admin,
} from "@/lib/auth/permissions";
import { reviewPayment, sendCustomStaffEmail } from "@/lib/data/registrations";
import { uploadMemberAvatarToDrive } from "@/lib/google/drive";
import { logAuditEvent } from "@/lib/data/audit";
import { eventSchema, userManagementSchema } from "@/lib/validation";
import type { UserProfile } from "@/lib/types";

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
    .maybeSingle();

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

  const supabase = createAdminSupabase();

  // Load existing target profile & roles if editing
  let previousProfile: any = null;
  let previousRoles: any[] = [];
  if (userId) {
    const { data: prevProf } = await supabase
      .from("user_profiles")
      .select("*, roles:member_roles(*)")
      .eq("id", userId)
      .maybeSingle();
    previousProfile = prevProf;
    previousRoles = prevProf?.roles || [];
  }

  // Check if target is currently an Executive or being assigned an Executive role
  const isTargetExecutive =
    isExecutiveAccount(staffRole, assignedRoles) ||
    (previousProfile ? isExecutiveAccount(previousProfile.role, previousRoles) : false);

  const actorIsSupreme = isSupremeExecutive(role, profile.roles, profile.email || user.email);

  if (isTargetExecutive) {
    if (!actorIsSupreme) {
      throw new Error(
        "Permission Denied: Only the President, AI/ML Lead, and Technical Lead are authorized to appoint or modify Top Executive members.",
      );
    }
    if (!isActive) {
      throw new Error("Action blocked: Top Executive accounts are protected and cannot be disabled.");
    }
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

  if (userId) {
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

    const githubUrl = formData.get("github_url") ? String(formData.get("github_url")).trim() : undefined;

    const updatePayload: Record<string, unknown> = {
      full_name: fullName,
      assigned_to_name: assignedToName,
      role: staffRole,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    };
    if (githubUrl !== undefined) {
      updatePayload.github_url = githubUrl || null;
    }
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
      await supabase.auth.admin.updateUserById(userId!, { password });
    }

    await logAuditEvent({
      actorUserId: user.id,
      actorEmail: profile.email || user.email,
      actorRole: role,
      action: "member_profile_updated",
      targetType: "user",
      targetId: userId!,
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

  // Sync to public members table for seamless 2-way reflection across admin and website
  try {
    const matchName = assignedToName || fullName;
    const primaryRole = assignedRoles[0];
    const teamSlug = primaryRole?.team ? primaryRole.team.replace(/_/g, "-") : undefined;

    let resolvedTeamId: string | undefined = undefined;
    if (teamSlug) {
      const { data: teamRec } = await supabase
        .from("teams")
        .select("id")
        .or(`slug.eq.${teamSlug},name.ilike.%${primaryRole.team.replace(/_/g, " ")}%`)
        .maybeSingle();
      if (teamRec) resolvedTeamId = teamRec.id;
    }

    const { data: existingMember } = await supabase
      .from("members")
      .select("id")
      .or(`official_email.ilike.${email},name.ilike.${matchName}`)
      .maybeSingle();

    if (existingMember) {
      const memberUpdate: Record<string, unknown> = {
        name: matchName,
        role: fullName || staffRole,
        position: primaryRole?.position ? primaryRole.position.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Core Member",
        official_email: email.endsWith("@vitbhopal.ac.in") ? email : undefined,
        status: isActive ? "active" : "pending",
      };
      if (avatarUrl) memberUpdate.image_url = avatarUrl;
      if (resolvedTeamId) memberUpdate.team_id = resolvedTeamId;

      await supabase.from("members").update(memberUpdate).eq("id", existingMember.id);
    }
  } catch (syncErr) {
    console.warn("Public member sync notice:", syncErr);
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  revalidatePath("/team");
  revalidatePath("/about");
  revalidatePath("/");
  return { success: true, generatedPassword: generatedPassword || undefined, email };
}

/**
 * Admin Action: Disables login access for a staff member without deleting their records, password, or roles.
 */
export async function disableStaffLoginAction(userId: string, reason: string) {
  const { user, profile, role } = await requireStaffRole("tech");
  const supabase = createAdminSupabase();

  // Load target user profile & roles
  const { data: targetProfile } = await supabase
    .from("user_profiles")
    .select("*, roles:member_roles(*)")
    .eq("id", userId)
    .maybeSingle();

  if (!targetProfile) {
    throw new Error("Target user not found");
  }

  // Guard against disabling yourself
  if (userId === user.id) {
    throw new Error("You cannot disable login access for your own account.");
  }

  // Guard against disabling Top Executive accounts
  if (isExecutiveAccount(targetProfile.role, targetProfile.roles)) {
    throw new Error("Action blocked: Top Executive accounts are protected and cannot be disabled.");
  }

  const { error: disableErr } = await supabase
    .from("user_profiles")
    .update({
      is_active: false,
      is_login_disabled: true,
      login_disabled_at: new Date().toISOString(),
      login_disabled_reason: reason.trim() || "Login access disabled by executive administration",
      is_voided: true, // legacy compatibility
      voided_at: new Date().toISOString(),
      voided_reason: reason.trim() || "Login access disabled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (disableErr) throw new Error(disableErr.message);

  await logAuditEvent({
    actorUserId: user.id,
    actorEmail: profile.email || user.email,
    actorRole: role,
    action: "user_login_disabled",
    targetType: "user",
    targetId: userId,
    reason: reason.trim() || "Account login access disabled",
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

/** Legacy alias */
export const voidStaffUserAction = disableStaffLoginAction;

/**
 * Admin Action: Enables login access for a staff member profile, restores active status, and assigns/synchronizes credentials.
 */
export async function enableStaffLoginAction(userId: string, customPassword?: string) {
  const { user, profile, role } = await requireStaffRole("tech");
  const supabase = createAdminSupabase();

  const { data: targetProfile } = await supabase
    .from("user_profiles")
    .select("*, roles:member_roles(*)")
    .eq("id", userId)
    .maybeSingle();

  if (!targetProfile) {
    throw new Error("Target user not found");
  }

  // Generate random strong password if none provided
  const newPassword =
    customPassword && customPassword.trim().length >= 8
      ? customPassword.trim()
      : targetProfile.password && targetProfile.password.length >= 8
      ? targetProfile.password
      : `GenAI#${Math.random().toString(36).slice(2, 6).toUpperCase()}!${Math.floor(1000 + Math.random() * 9000)}`;

  // Re-create or update Supabase Auth User
  try {
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: targetProfile.email,
      password: newPassword,
      email_confirm: true,
      user_metadata: { full_name: targetProfile.full_name, role: targetProfile.role },
    });

    if (authErr && authErr.message.includes("already registered")) {
      await supabase.auth.admin.updateUserById(userId, {
        password: newPassword,
        email_confirm: true,
      });
    }
  } catch (err: any) {
    console.warn("Auth user synchronization notice:", err.message);
  }

  // Enable user profile
  const { error: updateErr } = await supabase
    .from("user_profiles")
    .update({
      is_active: true,
      is_login_disabled: false,
      login_disabled_at: null,
      login_disabled_reason: null,
      is_voided: false, // legacy compatibility
      voided_at: null,
      voided_reason: null,
      password: newPassword,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (updateErr) throw new Error(updateErr.message);

  // Restore default role if missing
  const existingRoles = Array.isArray(targetProfile.roles) ? targetProfile.roles : [];
  if (existingRoles.length === 0) {
    await supabase.from("member_roles").insert({
      user_id: userId,
      team: "technical",
      position: "core_member",
    });
  }

  // Audit log
  await logAuditEvent({
    actorUserId: user.id,
    actorEmail: profile.email || user.email,
    actorRole: role,
    action: "user_login_enabled",
    targetType: "user",
    targetId: userId,
    reason: "Account login enabled and credentials synchronized by administrator",
    metadata: {
      target_email: targetProfile.email,
      target_name: targetProfile.full_name,
      assigned_to_name: targetProfile.assigned_to_name,
    },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  revalidatePath("/team");
  revalidatePath("/");

  return { success: true, newPassword, email: targetProfile.email };
}

/** Legacy alias */
export const unvoidStaffUserAction = enableStaffLoginAction;

/**
 * Admin-only: Updates GitHub Profile URL for a member.
 */
export async function updateMemberGitHubUrlAction(userId: string, githubUrl: string) {
  const { user, profile, role } = await requireStaffRole("tech");
  const cleanUrl = (githubUrl || "").trim();

  const supabase = createAdminSupabase();

  // 1. Update user_profiles
  const { data: updatedProfile, error: profileErr } = await supabase
    .from("user_profiles")
    .update({
      github_url: cleanUrl || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("id, email, full_name, assigned_to_name")
    .maybeSingle();

  if (profileErr) throw new Error(profileErr.message);

  // 2. Sync to members table
  try {
    const matchName = updatedProfile?.assigned_to_name || updatedProfile?.full_name;
    if (matchName || updatedProfile?.email) {
      await supabase
        .from("members")
        .update({
          github_url: cleanUrl || null,
          updated_at: new Date().toISOString(),
        })
        .or(`official_email.ilike.${updatedProfile?.email},name.ilike.${matchName}`);
    }
  } catch (syncErr) {
    console.warn("Public member github sync notice:", syncErr);
  }

  await logAuditEvent({
    actorUserId: user.id,
    actorEmail: profile.email || user.email,
    actorRole: role,
    action: "github_url_updated",
    targetType: "user",
    targetId: userId,
    metadata: {
      github_url: cleanUrl,
      target_email: updatedProfile?.email,
    },
  });

  revalidatePath("/admin/users");
  revalidatePath("/team");
  revalidatePath("/");
  return { success: true };
}

/**
 * Tech-only: Soft-disables a staff user with safeguard for last tech lead and Top Executive accounts.
 */
export async function toggleStaffUserActiveAction(userId: string, currentActive: boolean) {
  const { user, profile, role } = await requireStaffRole("tech");

  const supabase = createAdminSupabase();

  const { data: targetProfile } = await supabase
    .from("user_profiles")
    .select("*, roles:member_roles(*)")
    .eq("id", userId)
    .maybeSingle();

  if (!targetProfile) {
    throw new Error("Target user not found");
  }

  // Guard against disabling Top Executive accounts
  if (isExecutiveAccount(targetProfile.role, targetProfile.roles)) {
    throw new Error("Action blocked: Top Executive accounts are protected and cannot be disabled.");
  }

  if (currentActive) {
    // Check if last tech
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
        profile?.email || user.email || "genaicommunityvitbofficial@gmail.com",
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
 * Sends a 6-digit OTP to the currently authenticated staff member's registered email.
 */
export async function requestMyPasswordOTPAction() {
  const { user, profile } = await getAuthenticatedStaff();
  const email = (profile?.email || user.email || "").trim().toLowerCase();

  if (!email) {
    throw new Error("Unable to determine your registered account email address.");
  }

  const { requestPasswordResetOTP } = await import("@/lib/data/password-resets");
  const res = await requestPasswordResetOTP(email);

  if (!res.success) {
    throw new Error(res.message || "Failed to dispatch verification code.");
  }

  return {
    success: true,
    email,
    message: `A 6-digit verification code has been dispatched to ${email}.`,
  };
}

/**
 * Verifies OTP code and updates the authenticated staff member's password.
 */
export async function verifyMyOTPAndChangePasswordAction(otp: string, newPassword: string) {
  const { user, profile } = await getAuthenticatedStaff();
  const email = (profile?.email || user.email || "").trim().toLowerCase();

  if (!email) {
    throw new Error("Unable to determine your registered account email address.");
  }

  const { verifyOTPAndResetPassword } = await import("@/lib/data/password-resets");
  const res = await verifyOTPAndResetPassword({
    email,
    otp,
    newPassword,
  });

  if (!res.success) {
    throw new Error(res.message || "Invalid or expired verification code.");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  return { success: true, message: "Password updated successfully!" };
}

/**
 * Self-service: Allows any logged-in staff member to update their own avatar image.
 */
export async function updateMyAvatarAction(formData: FormData) {
  const { user, profile } = await getAuthenticatedStaff();
  const file = formData.get("avatar_file") as File | null;

  if (!file || file.size === 0) {
    throw new Error("Please select an avatar image to upload.");
  }

  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Avatar image must be smaller than 8MB.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const memberName = profile?.assigned_to_name || profile?.full_name || user.email || `user_${user.id}`;

  const driveRes = await uploadMemberAvatarToDrive({
    buffer,
    fileName: file.name,
    mimeType: file.type || "image/jpeg",
    memberName,
  });

  const supabase = createAdminSupabase();

  // 1. Update user_profiles
  const { error: profileErr } = await supabase
    .from("user_profiles")
    .update({
      avatar_url: driveRes.viewUrl,
      drive_file_id: driveRes.fileId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (profileErr) {
    console.error("Supabase user_profiles avatar update error:", profileErr);
    throw new Error(
      `Failed to save avatar in database: ${profileErr.message}. (Table column: ${profileErr.details || profileErr.hint || profileErr.code})`
    );
  }

  // 2. Sync to members table for public hierarchy and team cards
  try {
    const matchName = profile?.assigned_to_name || profile?.full_name;
    if (matchName) {
      await supabase
        .from("members")
        .update({ image_url: driveRes.viewUrl, updated_at: new Date().toISOString() })
        .ilike("name", matchName);
    }
  } catch (syncErr: any) {
    console.warn("Non-fatal members table sync notice:", syncErr?.message || syncErr);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/team");
  revalidatePath("/about");
  revalidatePath("/");

  return {
    success: true,
    avatarUrl: driveRes.viewUrl,
    fileId: driveRes.fileId,
    message: "Profile photo updated successfully!",
  };
}

/**
 * Self-service: Retrieves account profile info for the currently authenticated staff member.
 */
export async function getMyAccountInfoAction() {
  const { user, profile, role, isTop6 } = await getAuthenticatedStaff();
  return {
    id: user.id,
    email: profile?.email || user.email || "",
    fullName: profile?.full_name || "",
    assignedToName: profile?.assigned_to_name || profile?.full_name || "",
    role: role || "volunteer",
    avatarUrl: profile?.avatar_url || null,
    roles: profile?.roles || [],
    isTop6,
  };
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
 * Staff Action: Restores an archived registration back into active status.
 */
export async function restoreRegistrationAction(formData: FormData) {
  const { user, role } = await requireStaffRole("finance");

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
 * Top-6 & Event Lead: Assigns a club member as a scanner volunteer for an event, automatically enabling their login and sending credentials.
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

  // Load target user profile and automatically enable account with random password
  const { data: targetProfile } = await supabase
    .from("user_profiles")
    .select("id, email, full_name, assigned_to_name, role, password")
    .eq("id", targetUserId)
    .maybeSingle();

  if (targetProfile) {
    const volunteerPassword = `GenAI#VOL!${Math.floor(1000 + Math.random() * 9000)}`;

    // Enable account & set new password
    await supabase
      .from("user_profiles")
      .update({
        is_active: true,
        is_login_disabled: false,
        login_disabled_at: null,
        login_disabled_reason: null,
        password: volunteerPassword,
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetUserId);

    // Sync to Supabase Auth
    try {
      const { error: authErr } = await supabase.auth.admin.updateUserById(targetUserId, {
        password: volunteerPassword,
        email_confirm: true,
      });
      if (authErr && authErr.message.includes("not found")) {
        await supabase.auth.admin.createUser({
          email: targetProfile.email,
          password: volunteerPassword,
          email_confirm: true,
          user_metadata: { full_name: targetProfile.full_name, role: "volunteer" },
        });
      }
    } catch (e: any) {
      console.warn("Volunteer auth update notice:", e?.message);
    }

    // Fetch event title for email context
    const { data: eventData } = await supabase
      .from("events")
      .select("title, venue, event_date")
      .eq("id", eventId)
      .maybeSingle();

    // Send credentials to official VIT email
    if (targetProfile.email) {
      const { sendEmail } = await import("@/lib/email/mailer");
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://genai-vitbhopal.vercel.app";
      await sendEmail({
        to: targetProfile.email,
        emailType: "custom_email",
        eventId: eventId,
        subject: `Gate Volunteer Assignment & Access Credentials — ${eventData?.title || "GenAI Club Event"}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0c0a08; color: #ffffff; padding: 32px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid #2e2618;">
            <div style="border-bottom: 1px solid #2e2618; padding-bottom: 16px; margin-bottom: 20px;">
              <span style="font-size: 11px; font-weight: 800; color: #f5b642; text-transform: uppercase; letter-spacing: 0.1em; background: rgba(245, 182, 66, 0.1); padding: 4px 10px; border-radius: 9999px; border: 1px solid rgba(245, 182, 66, 0.2);">Official Assignment</span>
              <h2 style="color: #ffffff; margin: 12px 0 4px 0; font-size: 22px; font-weight: 800;">Gate Scanner Volunteer Credentials</h2>
              <p style="color: #a1a1aa; font-size: 13px; margin: 0;">Event: <strong style="color: #f5b642;">${eventData?.title || "Upcoming Community Event"}</strong></p>
            </div>
            
            <p style="font-size: 14px; line-height: 1.6; color: #d4d4d8;">
              Hello <strong>${targetProfile.assigned_to_name || targetProfile.full_name}</strong>,<br/>
              You have been appointed as an official gate scanner volunteer. Your volunteer login account has been automatically activated.
            </p>

            <div style="background-color: #14110b; border: 1px solid #2e2618; padding: 20px; border-radius: 12px; margin: 24px 0;">
              <div style="margin-bottom: 12px;">
                <span style="font-size: 11px; color: #71717a; text-transform: uppercase; font-weight: 700;">Volunteer Portal URL</span><br/>
                <a href="${appUrl}/admin/login" style="color: #f5b642; font-size: 14px; font-weight: 600; text-decoration: none;">${appUrl}/admin/login</a>
              </div>
              <div style="margin-bottom: 12px;">
                <span style="font-size: 11px; color: #71717a; text-transform: uppercase; font-weight: 700;">Official Login Email</span><br/>
                <strong style="color: #ffffff; font-size: 15px;">${targetProfile.email}</strong>
              </div>
              <div>
                <span style="font-size: 11px; color: #71717a; text-transform: uppercase; font-weight: 700;">Temporary Access Key</span><br/>
                <strong style="color: #4ade80; font-family: monospace; font-size: 18px; letter-spacing: 0.05em;">${volunteerPassword}</strong>
              </div>
            </div>

            <p style="font-size: 12px; color: #71717a; line-height: 1.5;">
              🔒 <strong>Permissions Notice:</strong> Your volunteer account is restricted exclusively to the QR Scanner, attendance check-ins, and scan history for your assigned event. Login access will automatically expire upon event completion.
            </p>
          </div>
        `,
      }).catch((err: any) => console.warn("Failed to dispatch volunteer email:", err));
    }
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
      newState: { eventId, assignedUserId: targetUserId, email: targetProfile?.email },
    });
  } catch {}

  revalidatePath("/admin/events");
  revalidatePath("/admin/scanner");
  return { success: true };
}

/**
 * Top-6 & Event Lead: Revokes a member's scanner volunteer role for an event and disables login if no other active duties.
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

  // Check if volunteer has other active volunteer assignments
  const { data: remainingAssignments } = await supabase
    .from("event_volunteers")
    .select("id")
    .eq("user_id", targetUserId);

  if (!remainingAssignments || remainingAssignments.length === 0) {
    const { data: targetProfile } = await supabase
      .from("user_profiles")
      .select("*, roles:member_roles(*)")
      .eq("id", targetUserId)
      .maybeSingle();

    if (targetProfile && !isExecutiveAccount(targetProfile.role, targetProfile.roles)) {
      await supabase
        .from("user_profiles")
        .update({
          is_active: false,
          is_login_disabled: true,
          login_disabled_at: new Date().toISOString(),
          login_disabled_reason: "Volunteer assignment revoked or completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", targetUserId);
    }
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
 * Tech/Superadmin Action: Manually overrides attendance status for a participant with full audit trail.
 */
export async function overrideAttendanceStatusAction(formData: FormData) {
  const { user, profile, role } = await requireStaffRole("tech");

  const registrationId = String(formData.get("registration_id") || "").trim();
  const newStatus = String(formData.get("new_status") || "checked_in").trim();
  const reason = String(formData.get("reason") || "").trim();

  if (!registrationId || !reason || reason.length < 3) {
    throw new Error("Registration ID and a valid reason are required for attendance override.");
  }

  const { overrideAttendanceStatus } = await import("@/lib/data/registrations");
  const result = await overrideAttendanceStatus({
    registrationId,
    newStatus,
    reason,
    actorId: user.id,
    actorName: profile.full_name || profile.assigned_to_name || user.email,
    actorRole: role,
  });

  if (!result.success) {
    throw new Error(result.error || "Failed to override attendance status.");
  }

  revalidatePath("/admin/scanner");
  revalidatePath("/admin/events");
  revalidatePath("/admin");
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
    vitRegistrationNumber?: string;
    branch?: string;
    branchName?: string;
    collegeEmail?: string;
    personalEmail?: string;
    email?: string;
    phoneNumber?: string;
    phone?: string;
    transactionId?: string;
    utr?: string;
    college?: string;
    amount?: number;
    paymentStatus?: string;
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

/**
 * Fetches all 50 active community club members for volunteer assignment modal.
 */
export async function getAllStaffMembersAction(): Promise<{ success: boolean; members: UserProfile[] }> {
  try {
    const supabase = createAdminSupabase();
    const [profilesRes, membersRes] = await Promise.all([
      supabase
        .from("user_profiles")
        .select("id, email, full_name, assigned_to_name, role, is_active, avatar_url, roles:member_roles(team, position)")
        .order("assigned_to_name", { ascending: true }),
      supabase
        .from("members")
        .select("id, name, role, position, official_email, team_id, teams(name, slug)")
        .order("name", { ascending: true }),
    ]);

    const profiles = (profilesRes.data as any[]) || [];
    const members = (membersRes.data as any[]) || [];

    const memberMap = new Map<string, UserProfile>();

    // 1. Add all active user_profiles
    profiles.forEach((p) => {
      if (p.is_active !== false) {
        memberMap.set(p.id, p);
      }
    });

    // 2. Cross-reference with members table to ensure all 50 members are present
    members.forEach((m) => {
      // Find if already present by email or name
      const existing = Array.from(memberMap.values()).find(
        (p) =>
          (p.email && m.official_email && p.email.toLowerCase() === m.official_email.toLowerCase()) ||
          (p.assigned_to_name && p.assigned_to_name.toLowerCase() === m.name.toLowerCase()) ||
          (p.full_name && p.full_name.toLowerCase() === m.name.toLowerCase())
      );

      if (!existing) {
        memberMap.set(m.id, {
          id: m.id,
          email: m.official_email || `${m.name.toLowerCase().replace(/\s+/g, ".")}@vitbhopal.ac.in`,
          full_name: m.name,
          assigned_to_name: m.name,
          role: m.role || "core_member",
          is_active: true,
          roles: [{ team: m.teams?.slug || "general", position: m.position || m.role || "Core Member" }],
        } as any);
      }
    });

    const result = Array.from(memberMap.values()).sort((a, b) =>
      (a.assigned_to_name || a.full_name || "").localeCompare(b.assigned_to_name || b.full_name || "")
    );

    return { success: true, members: result };
  } catch (err: any) {
    console.error("Error fetching staff members for volunteer assignment:", err);
    return { success: false, members: [] };
  }
}




