"use server";
import { campusDateTime, validateEventTimes } from "@/lib/utils/event-time";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createAdminSupabase } from "@/lib/supabase/admin";
import {
  requireStaffActionRole,
  assertCanManageStaff,
  STAFF_PROFILE_FIELDS,
  getAuthenticatedStaff,
  isExecutiveLeader,
  isSupremeExecutive,
  isExecutiveAccount,
  isTop6Admin,
  isTeamLoginAllowed,
} from "@/lib/auth/permissions";
import { reviewPayment, sendCustomStaffEmail } from "@/lib/data/registrations";
import { uploadMemberAvatarToDrive } from "@/lib/google/drive";
import { logAuditEvent } from "@/lib/data/audit";
import { eventSchema, userManagementSchema } from "@/lib/validation";
import type { UserProfile } from "@/lib/types";
import { requireCredentialExecutive, saveTemporaryPassword, getTemporaryCredential } from "@/lib/data/staff-credentials";
import { encryptTemporaryPassword } from "@/lib/security/temporary-password";
import { getStaffCredentialsTemplate } from "@/lib/email/templates";

/**
 * Reviews a student registration payment (Approve/Reject) from Finance or Tech portal.
 */
export async function handlePaymentReviewAction(formData: FormData) {
  const { user, profile, role } = await requireStaffActionRole("finance");

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
    reviewerEmail: profile.email || user.email || "",
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
  const { user, profile, role } = await requireStaffActionRole("finance");

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
    senderEmail: profile.email || user.email || "",
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
  const { user, profile, role } = await requireStaffActionRole("tech");

  const eventId = String(formData.get("event_id") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const maxCapacity = Number(formData.get("max_capacity") || 2000);
  const registrationFee = Number(formData.get("registration_fee") ?? 200);
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
    registration_deadline: campusDateTime(registrationDeadline),
    event_start_time: campusDateTime(eventStartTime, previousEvent?.event_date),
    event_end_time: campusDateTime(eventEndTime, previousEvent?.event_date),
    is_registration_open: isRegistrationOpen,
    upi_id: upiId,
    updated_at: new Date().toISOString(),
  };

  if (guidelinesArray !== undefined) {
    updatePayload.guidelines = guidelinesArray;
  }

  validateEventTimes(updatePayload.event_start_time as string | null, updatePayload.event_end_time as string | null, updatePayload.registration_deadline as string | null);
  if (!Number.isInteger(maxCapacity) || maxCapacity<1 || !Number.isFinite(registrationFee) || registrationFee<0) throw new Error("Invalid capacity or fee.");
  const { error } = await supabase.from("events").update(updatePayload).eq("id", eventId).select("id").single();
  if (error) throw new Error(`Failed to update event settings: ${error.message}`);

  await logAuditEvent({
    actorUserId: user.id,
    actorEmail: profile.email || user.email || "",
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
  const actor = await requireStaffActionRole("tech");
  const db = createAdminSupabase();
  let id = String(formData.get("id") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") || "").trim();
  const role = String(formData.get("role") || "volunteer");
  const isActive = ["on", "true"].includes(String(formData.get("is_active")));
  const roles = JSON.parse(String(formData.get("roles_json") || "[]"));
  if (!Array.isArray(roles) || roles.some(r => !r.team || !r.position)) throw new Error("Invalid team assignments.");
  if (isExecutiveAccount(role, roles) && !isSupremeExecutive(actor.role, actor.profile.roles)) throw new Error("Only executive leadership can grant executive roles.");
  if (role === "superadmin" && actor.role !== "superadmin") throw new Error("Only a system administrator can grant this role.");
  const suppliedPassword = String(formData.get("password") || "");
  if (!id || suppliedPassword) {
    await requireCredentialExecutive();
    encryptTemporaryPassword(id || "new-account", suppliedPassword || "configuration-check");
  }
  if (suppliedPassword && suppliedPassword.length < 12) throw new Error("Use at least 12 characters for a password.");
  const parsed = userManagementSchema.safeParse({ id: id || undefined, email, full_name: fullName, role, is_active: isActive, password: suppliedPassword || undefined });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Invalid staff details.");
  let created = false;
  let generatedPassword: string | undefined;
  if (id) {
    const { target } = await assertCanManageStaff(id);
    if (target.email.toLowerCase() !== email) throw new Error("Login email cannot be changed here. Provision a replacement account instead.");
    if (isExecutiveAccount(target.role, target.roles) && (!isActive || !isExecutiveAccount(role, roles))) throw new Error("Executive accounts cannot be disabled or demoted here.");
  } else {
    generatedPassword = suppliedPassword || randomBytes(24).toString("base64url");
    const { data, error } = await db.auth.admin.createUser({ email, password: generatedPassword, email_confirm: true });
    if (error || !data.user) throw new Error(error?.message || "Account creation failed.");
    id = data.user.id; created = true;
  }
  const patch: Record<string, unknown> = { id, email, full_name: fullName, assigned_to_name: String(formData.get("assigned_to_name") || fullName), role, is_active: isActive };
  if (created) { patch.is_login_disabled = !isTeamLoginAllowed(role, roles); patch.is_voided = false; }
  try {
    const avatar = formData.get("avatar_file") as File | null;
    if (avatar?.size) {
      if (avatar.size > 8 * 1024 * 1024 || !/^image\/(png|jpeg|webp|gif|avif)$/.test(avatar.type)) throw new Error("Choose an image smaller than 8MB.");
      const uploaded = await uploadMemberAvatarToDrive({ buffer: Buffer.from(await avatar.arrayBuffer()), fileName: avatar.name, mimeType: avatar.type, memberName: fullName });
      patch.avatar_url = uploaded.viewUrl; patch.drive_file_id = uploaded.fileId;
    }
    const { error } = await db.rpc("save_staff_profile", { p_profile: patch, p_roles: roles });
    if (error) throw new Error(error.message);
    if (created && generatedPassword) await saveTemporaryPassword(id, generatedPassword, actor.user.id);
  } catch (error) {
    if (created) {
      const cleanup = await db.auth.admin.deleteUser(id);
      if (cleanup.error) throw new Error("Profile save failed and account cleanup failed. The new account has no enabled profile; contact an administrator.");
    }
    throw error;
  }
  if (!created && suppliedPassword) {
    const { error } = await db.auth.admin.updateUserById(id, { password: suppliedPassword });
    if (error) throw new Error(`Profile saved, but password change failed: ${error.message}`);
    await saveTemporaryPassword(id, suppliedPassword, actor.user.id);
    generatedPassword = suppliedPassword;
  }
  revalidatePath("/admin/users");
  return { success: true, id, generatedPassword, email };
}

export async function disableStaffLoginAction(userId: string, reason: string) {
  const { actor, target } = await assertCanManageStaff(userId);
  if (actor.user.id === userId || isExecutiveAccount(target.role, target.roles)) throw new Error("Executive and own accounts cannot be disabled here.");
  if (reason.trim().length < 3) throw new Error("Provide a reason.");
  const { error } = await createAdminSupabase().from("user_profiles").update({ is_login_disabled: true, login_disabled_at: new Date().toISOString(), login_disabled_reason: reason }).eq("id", userId).select("id").single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/users"); return { success: true };
}

export const voidStaffUserAction = disableStaffLoginAction;

/**
 * Admin Action: Enables login access for a staff member profile, restores active status, and assigns/synchronizes credentials.
 */
export async function enableStaffLoginAction(userId: string, customPassword?: string) {
  const actor = await requireCredentialExecutive();
  const { target } = await assertCanManageStaff(userId);
  const db = createAdminSupabase();
  const assignment = await db.from("event_volunteers").select("id").eq("user_id", userId).limit(1);
  if (assignment.error) throw new Error(assignment.error.message);
  if (!isTeamLoginAllowed(target.role, target.roles) && !assignment.data.length) throw new Error("Assign an eligible team or event before enabling login.");
  const auth = await db.auth.admin.getUserById(userId);
  if (auth.error || !auth.data.user) throw new Error("The linked Supabase Auth account is missing. Provision a replacement account.");
  const newPassword = customPassword || randomBytes(24).toString("base64url");
  if (newPassword.length < 12) throw new Error("Use at least 12 characters for a password.");
  encryptTemporaryPassword(userId, newPassword);
  const changed = await db.auth.admin.updateUserById(userId, { password: newPassword });
  if (changed.error) throw new Error(changed.error.message);
  await saveTemporaryPassword(userId, newPassword, actor.user.id);
  const { error } = await db.from("user_profiles").update({ is_active: true, is_login_disabled: false, is_voided: false, login_disabled_at: null, login_disabled_reason: null }).eq("id", userId).select("id").single();
  if (error) throw new Error(`Password updated but login could not be enabled: ${error.message}`);
  revalidatePath("/admin/users"); return { success: true, newPassword, email: target.email };
}

export const unvoidStaffUserAction = enableStaffLoginAction;

/**
 * Admin-only: Updates GitHub Profile URL for a member.
 */
export async function updateMemberGitHubUrlAction(userId: string, githubUrl: string) {
  await assertCanManageStaff(userId);
  const { user, profile, role } = await requireStaffActionRole("tech");
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
    actorEmail: profile.email || user.email || "",
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
 * Enforces the Club Login Policy:
 * Logins are active ONLY for President, Vice President, Tech Team, AIML Team, Finance Team, and HR Team.
 * For all other accounts, login is disabled.
 */
export async function enforceTeamLoginPolicyAction(): Promise<{success:boolean;enabledCount:number;disabledCount:number;error?:string}> {
  await requireStaffActionRole("superadmin");
  const db=createAdminSupabase();
  const profiles=await db.from("user_profiles").select(STAFF_PROFILE_FIELDS);
  const assignments=await db.from("event_volunteers").select("user_id");
  if (profiles.error || assignments.error) throw new Error(profiles.error?.message || assignments.error?.message);
  const assigned=new Set(assignments.data.map(v=>v.user_id));
  let enabledCount=0,disabledCount=0;
  for (const p of profiles.data) {
    if (isTeamLoginAllowed(p.role,p.roles) || assigned.has(p.id)) { if(p.is_active && !p.is_login_disabled && !p.is_voided) enabledCount++; continue; }
    const saved=await db.from("user_profiles").update({is_login_disabled:true,login_disabled_reason:"No eligible team or event assignment",login_disabled_at:new Date().toISOString()}).eq("id",p.id).select("id").single();
    if(saved.error) throw new Error(saved.error.message);
    disabledCount++;
  }
  revalidatePath("/admin/users");
  return {success:true,enabledCount,disabledCount};
}

export async function toggleStaffUserActiveAction(userId: string, _currentActive: boolean) {
  const { actor, target } = await assertCanManageStaff(userId);
  if (actor.user.id === userId || isExecutiveAccount(target.role, target.roles)) throw new Error("Executive and own accounts cannot be deactivated here.");
  const { error } = await createAdminSupabase().from("user_profiles").update({ is_active: !target.is_active }).eq("id", userId).eq("is_active", target.is_active).select("id").single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/users"); return { success: true };
}

export async function changeMyPasswordAction(newPassword: string) {
  const { user } = await requireStaffActionRole("volunteer");
  if (newPassword.length < 12) throw new Error("Use at least 12 characters for a password.");
  const { error } = await createAdminSupabase().auth.admin.updateUserById(user.id, { password: newPassword });
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function requestMyPasswordOTPAction() {
  const { user, profile } = await requireStaffActionRole("volunteer");
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
  const { user, profile } = await requireStaffActionRole("volunteer");
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
  const { user, profile } = await requireStaffActionRole("volunteer");
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
  const { user, profile, role, isTop6 } = await requireStaffActionRole("volunteer");
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
  const actor = await requireCredentialExecutive();
  await assertCanManageStaff(userId);
  const newPassword = customPassword || randomBytes(24).toString("base64url");
  if (newPassword.length < 12) throw new Error("Use at least 12 characters for a password.");
  encryptTemporaryPassword(userId, newPassword);
  const { error } = await createAdminSupabase().auth.admin.updateUserById(userId, { password: newPassword });
  if (error) throw new Error(error.message);
  await saveTemporaryPassword(userId, newPassword, actor.user.id);
  revalidatePath("/admin/users");
  return { success: true, newPassword };
}

export async function deleteRegistrationAction(formData: FormData) {
  const { user, profile, role } = await requireStaffActionRole("finance");

  const registrationId = String(formData.get("registration_id") || "").trim();
  const reason = String(formData.get("reason") || "Staff manual removal").trim();

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
  const { user, role } = await requireStaffActionRole("finance");

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
  const { isTop6, role } = await requireStaffActionRole("volunteer");
  const supabase = createAdminSupabase();

  try {
    const { data, error } = await supabase
      .from("event_volunteers")
      .select("id, event_id, user_id, assigned_at, user:user_profiles(id, email, full_name, assigned_to_name, role)")
      .eq("event_id", eventId)
      .order("assigned_at", { ascending: true });

    if (error) {
      console.warn("Could not query event_volunteers table:", error.message);
      throw new Error(error.message);
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
  const { user } = await requireStaffActionRole("tech");
  const eventId = String(formData.get("event_id") || "");
  const targetUserId = String(formData.get("user_id") || "");
  await assertCanManageStaff(targetUserId);
  const db = createAdminSupabase();
  const { error } = await db.from("event_volunteers").upsert({ event_id: eventId, user_id: targetUserId, assigned_by: user.id }, { onConflict: "event_id,user_id" });
  if (error) throw new Error(error.message);
  const enabled = await db.from("user_profiles").update({ is_active: true, is_login_disabled: false, is_voided: false, login_disabled_at: null, login_disabled_reason: null }).eq("id", targetUserId).select("id").single();
  if (enabled.error) throw new Error(`Assignment saved, but enabling access failed: ${enabled.error.message}`);
  revalidatePath("/admin/events"); return { success: true };
}

export async function removeEventVolunteerAction(formData: FormData) {
  await requireStaffActionRole("tech");
  const eventId = String(formData.get("event_id") || "");
  const userId = String(formData.get("user_id") || "");
  await assertCanManageStaff(userId);
  const { error } = await createAdminSupabase().from("event_volunteers").delete().eq("event_id", eventId).eq("user_id", userId).select("id").single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/events"); return { success: true };
}

export async function overrideAttendanceStatusAction(formData: FormData) {
  const { user, profile, role } = await requireStaffActionRole("tech");

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
    actorName: profile.full_name || profile.assigned_to_name || user.email || "Staff",
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
  await requireStaffActionRole("tech");
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
  await requireStaffActionRole("finance");
  const { exportAttendanceDataAction: exportAttendance } = await import("@/lib/data/registrations");
  return await exportAttendance(eventId);
}

/**
 * Fetches all 50 active community club members for volunteer assignment modal.
 */
export async function getAllStaffMembersAction(): Promise<{ success: boolean; members: UserProfile[] }> {
  await requireStaffActionRole("tech");
  const { data, error } = await createAdminSupabase().from("user_profiles").select(STAFF_PROFILE_FIELDS).order("full_name");
  if (error) throw new Error(error.message);
  return { success: true, members: data as UserProfile[] };
}

export async function revealStaffTemporaryPasswordAction(userId: string) {
  const { actor, password, email } = await getTemporaryCredential(userId);
  await logAuditEvent({ actorUserId: actor.user.id, actorRole: actor.role, action: "staff_temporary_password_revealed", targetType: "staff", targetId: userId });
  return { password, email };
}

export async function sendStaffCredentialsEmailAction(userId: string) {
  const { actor, target, password, email } = await getTemporaryCredential(userId);
  if (!target.is_active || target.is_voided || target.is_login_disabled) throw new Error("Enable the account before sending access instructions.");
  if (!password) throw new Error("No current temporary password is saved. Use Reset to issue one before sending credentials.");
  const { sendEmail } = await import("@/lib/email/mailer");
  const template = getStaffCredentialsTemplate({ name: target.assigned_to_name || target.full_name, email, password });
  const result = await sendEmail({ to: email, ...template, emailType: "custom_email", sensitiveContent: true, senderId: actor.user.id, senderRole: actor.role, forceResend: true });
  if (!result.success) throw new Error(result.error || "Email delivery failed.");
  return { success: true };
}

export async function broadcastAllEnabledStaffCredentialsAction() {
  const { user, profile, role } = await requireStaffActionRole("superadmin");
  const supabase = createAdminSupabase();

  // Query all enabled staff members
  const { data: staffList, error: staffErr } = await supabase
    .from("user_profiles")
    .select(STAFF_PROFILE_FIELDS)
    .order("created_at", { ascending: true });

  if (staffErr) throw new Error(staffErr.message);

  const enabledStaff = (staffList || []).filter(
    (s) => s.is_active !== false && s.is_login_disabled !== true && s.is_voided !== true && s.email && s.email.includes("@")
  );

  if (enabledStaff.length === 0) {
    return { success: false, error: "No enabled staff accounts found to receive credentials." };
  }

  let sentCount = 0;
  let failedCount = 0;
  const results: { email: string; success: boolean; error?: string }[] = [];

  for (const staff of enabledStaff) {
    try {
      const res = await sendStaffCredentialsEmailAction(staff.id);
      if (res.success) {
        sentCount++;
        results.push({ email: staff.email, success: true });
      } else {
        failedCount++;
        results.push({ email: staff.email, success: false, error: "Delivery failed" });
      }
    } catch (err: any) {
      failedCount++;
      results.push({ email: staff.email, success: false, error: err.message });
    }
  }

  // Audit log
  await logAuditEvent({
    actorUserId: user.id,
    actorEmail: profile.email || user.email || "",
    actorRole: role,
    action: "staff_credentials_broadcasted",
    targetType: "user",
    targetId: user.id,
    reason: `Dispatched portal login credentials via email to ${sentCount} enabled staff accounts`,
    metadata: { sentCount, failedCount, total: enabledStaff.length },
  });

  return {
    success: true,
    sentCount,
    failedCount,
    totalEnabled: enabledStaff.length,
    results,
  };
}




