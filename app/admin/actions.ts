"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { eventSchema, memberSchema, projectSchema, teamSchema } from "@/lib/validation";
import { appendToGoogleSheet } from "@/lib/google/sheets";
import type { ZodError } from "zod";

function formString(formData: FormData, key: string): string {
  const v = formData.get(key);
  if (v == null) return "";
  return String(v).trim();
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Missing or temporary client IDs on create should return `undefined` so Supabase/Zod generates valid UUIDs. */
function formOptionalId(formData: FormData): string | undefined {
  const v = formData.get("id");
  if (v == null || String(v).trim() === "") return undefined;
  const str = String(v).trim();
  if (str.startsWith("official-") || str.startsWith("team-") || str.startsWith("ev-") || str.startsWith("proj-") || !UUID_REGEX.test(str)) {
    return undefined;
  }
  return str;
}

function zodIssuesMessage(err: ZodError) {
  return err.issues.map((i) => `${i.path.join(".") || "form"}: ${i.message}`).join("; ");
}

const HARDCODED_ADMIN_EMAIL = process.env.HARDCODED_ADMIN_EMAIL ?? "admin.club.core@genai.local";
const HARDCODED_ADMIN_PASSWORD = process.env.HARDCODED_ADMIN_PASSWORD ?? "G3nAI!Club#Root$2026@Ultra";
const ADMIN_SESSION_COOKIE = "club_admin_session";

import { uploadMemberAvatarToDrive } from "@/lib/google/drive";
import { verifyCloudflareTurnstile } from "@/lib/security/turnstile";
import { isTeamLoginAllowed } from "@/lib/auth/permissions";

const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
];

async function uploadImageIfPresent(file: unknown): Promise<string | undefined> {
  if (
    !file ||
    typeof file !== "object" ||
    !("size" in file) ||
    typeof (file as any).size !== "number" ||
    (file as any).size === 0 ||
    !(file as any).name ||
    typeof (file as any).arrayBuffer !== "function"
  ) {
    return undefined;
  }

  const validFile = file as File;
  const mimeType = validFile.type || "image/jpeg";
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType.toLowerCase())) {
    throw new Error(`Invalid file type "${mimeType}". Only image files (JPEG, PNG, WebP, GIF, AVIF) are allowed.`);
  }

  if (validFile.size > 8 * 1024 * 1024) {
    throw new Error("Image file too large. Maximum size is 8MB.");
  }

  try {
    const arrayBuffer = await validFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const driveRes = await uploadMemberAvatarToDrive({
      buffer,
      fileName: validFile.name,
      mimeType,
      memberName: `asset_${Date.now()}`,
    });
    return driveRes.viewUrl;
  } catch (err: any) {
    if (err.message?.startsWith("Invalid file type") || err.message?.startsWith("Image file too large")) {
      throw err;
    }
    console.error("Asset upload fallback:", err?.message || err);
    return undefined;
  }
}

/**
 * Pings the Google Apps Script Web App to dynamically update the form's Team dropdown.
 */
async function pingGoogleFormWebhook() {
  const webhookUrl = process.env.GOOGLE_FORM_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    // Fire and forget - don't await so we don't slow down the admin's action
    fetch(webhookUrl, { method: "POST" }).catch(() => {});
  } catch (e) {
    // Ignore errors
  }
}

/**
 * Fire-and-forget: logs a community internal management action (team/project/event/member CRUD)
 * to the "Internal Management Log" tab in the Website Logs Google Sheet.
 */
function logInternalChange(
  action: string,
  module: string,
  recordId: string,
  recordName: string,
  changeSummary: string,
  prevValue?: string,
  newValue?: string,
) {
  const now = new Date();
  const istStr = now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const logId = `log_${Date.now()}_${Math.random().toString(36).slice(-4)}`;
  appendToGoogleSheet("Internal Management Log", [[
    logId,
    istStr,
    "genaicommunityvitbofficial@gmail.com", // will be overridden with actor when available
    "admin",
    action,
    module,
    recordId,
    recordName,
    changeSummary,
    prevValue || "",
    newValue || "",
  ]]).catch(() => {}); // Non-blocking, never throws
}

/**
 * Fire-and-forget: logs an event lifecycle change (create/edit/delete) to the
 * "Event Lifecycle Log" tab in the Internal Management Google Sheet.
 */
function logEventLifecycle(
  action: string,
  eventId: string,
  eventTitle: string,
  changedFields: string,
  prevValues: string,
  newValues: string,
  notes?: string,
) {
  const now = new Date();
  const istStr = now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const logId = `evt_${Date.now()}_${Math.random().toString(36).slice(-4)}`;
  appendToGoogleSheet("Event Lifecycle Log", [[
    logId,
    istStr,
    "genaicommunityvitbofficial@gmail.com",
    "admin",
    action,
    eventId,
    eventTitle,
    changedFields,
    prevValues,
    newValues,
    notes || "",
  ]]).catch(() => {}); // Non-blocking
}

/**
 * Cookie-only “dev admin” bypass. Does not create a Supabase session — DB writes still require
 * a real Supabase login for RLS.
 */
export async function tryHardcodedAdminSession(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false }> {
  const cleanEmail = (email || "").trim().toLowerCase();
  const targetEmail = (HARDCODED_ADMIN_EMAIL || "admin.club.core@genai.local").trim().toLowerCase();
  const targetPassword = HARDCODED_ADMIN_PASSWORD || "G3nAI!Club#Root$2026@Ultra";

  if (cleanEmail !== targetEmail || password !== targetPassword) {
    return { ok: false };
  }
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });
  return { ok: true };
}

/**
 * Unified Server-Side Staff & Admin Login Handler
 * Sets session cookies atomically on the response headers.
 */
async function dispatchLoginSecurityEmail(email: string) {
  try {
    const { sendEmail } = await import("@/lib/email/mailer");
    const { getLoginSecurityAlertTemplate } = await import("@/lib/email/templates");
    const { formatISTDate, getHumanReadableRole, getMemberAssignedName } = await import("@/lib/utils/format");

    const adminSupabase = createAdminSupabase();
    const { data: profile } = await adminSupabase
      .from("user_profiles")
      .select("id, email, full_name, assigned_to_name, role, roles:member_roles(*)")
      .ilike("email", email)
      .maybeSingle();

    const fullName = getMemberAssignedName(
      email,
      profile?.assigned_to_name,
      profile?.full_name,
    );
    const roleTitle = getHumanReadableRole(profile?.role || "member", profile?.roles);
    const nowIST = formatISTDate(new Date(), true);

    const template = getLoginSecurityAlertTemplate({
      fullName,
      email,
      loginTime: nowIST,
      roleTitle,
    });

    const recipients = new Set<string>();
    if (email && email.includes("@")) recipients.add(email.toLowerCase().trim());

    try {
      const { data: member } = await adminSupabase
        .from("members")
        .select("email, name")
        .or(`email.ilike.${email},name.ilike.${fullName}`)
        .maybeSingle();

      if (member?.email && member.email.includes("@")) {
        recipients.add(member.email.toLowerCase().trim());
      }
    } catch {}

    const recipientList = Array.from(recipients);
    if (recipientList.length > 0) {
      await sendEmail({
        to: recipientList,
        subject: template.subject,
        html: template.html,
        emailType: "login_security_alert",
        senderRole: "security_daemon",
      });
    }
  } catch (err: any) {
    console.warn("Failed to dispatch login security alert email:", err?.message || err);
  }
}

export async function loginStaff(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = (formData.get("email") as string || "").trim().toLowerCase();
  const password = (formData.get("password") as string || "").trim();
  const turnstileToken = (formData.get("cf_turnstile_response") as string || formData.get("turnstile_token") as string || "").trim();

  if (!email || !password) {
    return { ok: false, error: "Please enter both your official email and password." };
  }

  // Cloudflare Turnstile Bot Check
  const turnstileRes = await verifyCloudflareTurnstile(turnstileToken);
  if (!turnstileRes.success) {
    return { ok: false, error: turnstileRes.error || "Security verification failed. Please complete the Cloudflare challenge." };
  }

  // 1. Try Root / Dev Admin credentials
  const hardcoded = await tryHardcodedAdminSession(email, password);
  if (hardcoded.ok) {
    dispatchLoginSecurityEmail(email).catch(() => {});
    return { ok: true };
  }

  // 2. Try Supabase Auth via Server Client (Atomically sets auth cookies)
  let authErrorDetail = "";
  try {
    const supabase = await createServerSupabase();
    const adminSupabase = createAdminSupabase();

    // Check user_profiles and team login policy before completing login
    const { data: profile } = await adminSupabase
      .from("user_profiles")
      .select("id, email, password, is_active, is_login_disabled, is_voided, role, full_name, assigned_to_name, roles:member_roles(*)")
      .ilike("email", email)
      .maybeSingle();

    if (profile) {
      if (profile.is_login_disabled || profile.is_voided || profile.is_active === false) {
        return {
          ok: false,
          error: `Account Login Disabled: The account for "${email}" (${profile.assigned_to_name || profile.full_name || "Member"}) has login access disabled. Please contact the Technical Lead or President.`,
        };
      }

      if (!isTeamLoginAllowed(profile.role, profile.roles, profile.email)) {
        return {
          ok: false,
          error: `Account Login Disabled: Logins are currently restricted to President, Vice President, Tech Team, AIML Team, Finance Team, and HR Team accounts only.`,
        };
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (!error && data.user) {
      const cookieStore = await cookies();
      cookieStore.set(ADMIN_SESSION_COOKIE, "1", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24, // 24 hours
      });

      cookieStore.set("club_admin_email", email, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24, // 24 hours
      });

      dispatchLoginSecurityEmail(email).catch(() => {});
      return { ok: true };
    }
    if (error) {
      authErrorDetail = error.message;
    }
  } catch (err: any) {
    authErrorDetail = err?.message || "Auth client initialization failed";
  }

  // 3. Resilient Fallback: Verify directly against user_profiles table
  try {
    const adminSupabase = createAdminSupabase();
    const { data: profile, error: profileErr } = await adminSupabase
      .from("user_profiles")
      .select("id, email, password, is_active, is_login_disabled, is_voided, role, full_name, assigned_to_name, roles:member_roles(*)")
      .ilike("email", email)
      .maybeSingle();

    if (profileErr) {
      return {
        ok: false,
        error: `Database profile lookup failed: ${profileErr.message} (Supabase code: ${profileErr.code || "unknown"})`,
      };
    }

    if (!profile) {
      return {
        ok: false,
        error: `No staff account found with email "${email}". Please verify that you are using your registered @vitbhopal.ac.in email or contact the Student Coordinator.`,
      };
    }

    if (profile.is_login_disabled || profile.is_voided || profile.is_active === false) {
      return {
        ok: false,
        error: `Account Login Disabled: The account for "${email}" (${profile.assigned_to_name || profile.full_name || "Member"}) has login access disabled. Please contact the Technical Lead or President.`,
      };
    }

    if (!isTeamLoginAllowed(profile.role, profile.roles, profile.email)) {
      return {
        ok: false,
        error: `Account Login Disabled: Logins are currently restricted to President, Vice President, Tech Team, AIML Team, Finance Team, and HR Team accounts only.`,
      };
    }

    if (profile.password && profile.password === password) {
      // Automatically synchronize password with Supabase Auth service
      try {
        await adminSupabase.auth.admin.updateUserById(profile.id, {
          password: password,
          email_confirm: true,
        });
      } catch {}

      // Set admin session cookies
      const cookieStore = await cookies();
      cookieStore.set(ADMIN_SESSION_COOKIE, "1", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
      });

      cookieStore.set("club_admin_email", profile.email || email, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
      });

      dispatchLoginSecurityEmail(profile.email || email).catch(() => {});
      return { ok: true };
    }

    return {
      ok: false,
      error: `Incorrect password entered for "${email}". ${authErrorDetail ? `(Auth response: ${authErrorDetail})` : "Please verify your credentials or use the Forgot Password option."}`,
    };
  } catch (fallbackErr: any) {
    console.error("Database fallback login check error:", fallbackErr);
    return {
      ok: false,
      error: `Authentication failed: ${fallbackErr?.message || "Internal server error"}.`,
    };
  }
}

export async function logoutStaff(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  cookieStore.delete("club_admin_email");

  try {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
  } catch {}

  redirect("/admin/login");
}

export const logoutAdmin = logoutStaff;

export async function upsertMember(formData: FormData): Promise<{ success: boolean; member?: any; error?: string }> {
  try {
    const uploaded = await uploadImageIfPresent((formData.get("image_file") as File) || null);
    const rawId = formOptionalId(formData);
    const isEdit = Boolean(rawId && UUID_REGEX.test(rawId));

    const parsed = memberSchema.safeParse({
      id: isEdit ? rawId : undefined,
      team_id: formString(formData, "team_id"),
      name: formString(formData, "name"),
      role: formString(formData, "role"),
      position: formString(formData, "position"),
      github_url: formString(formData, "github_url"),
      linkedin_url: formString(formData, "linkedin_url"),
      image_url: uploaded ?? formString(formData, "image_url"),
      status: (formString(formData, "status") as "active" | "pending") || "active",
    });
    if (!parsed.success) return { success: false, error: `Invalid member details: ${zodIssuesMessage(parsed.error)}` };
    const supabase = createAdminSupabase();

    const payload: Record<string, unknown> = { ...parsed.data };
    let result: any = null;

    if (isEdit) {
      const { data, error } = await supabase.from("members").update(payload).eq("id", rawId).select().single();
      if (error) return { success: false, error: `Database error updating member: ${error.message}` };
      result = data;
    } else {
      delete payload.id;
      const { data, error } = await supabase.from("members").insert(payload).select().single();
      if (error) return { success: false, error: `Database error inserting member: ${error.message}` };
      result = data;
    }

    // Log to Internal Management Log sheet (fire-and-forget)
    logInternalChange(
      isEdit ? "MEMBER_UPDATED" : "MEMBER_CREATED",
      "member",
      result?.id || "new",
      parsed.data.name || "",
      `${parsed.data.role || "Core Member"} in team ${parsed.data.team_id}`,
      "",
      JSON.stringify({ name: parsed.data.name, role: parsed.data.role, position: parsed.data.position }),
    );

    // Revalidate the specific team page so the change is live immediately
    if (parsed.data.team_id) {
      const { data: team } = await supabase
        .from("teams")
        .select("slug")
        .eq("id", parsed.data.team_id)
        .maybeSingle();
      if (team?.slug) revalidatePath(`/team/${team.slug}`);
    }

    revalidatePath("/");
    revalidatePath("/admin");
    return { success: true, member: result };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to save member." };
  }
}

export async function deleteMember(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const id = String(formData.get("id") || "").trim();
    if (!id) return { success: false, error: "Member ID is required." };
    const supabase = createAdminSupabase();

    // Look up the team slug before deleting so we can revalidate that page
    const { data: existing } = await supabase
      .from("members")
      .select("team_id, name")
      .eq("id", id)
      .maybeSingle();

    const { error } = await supabase.from("members").delete().eq("id", id);
    if (error) return { success: false, error: `Database error deleting member: ${error.message}` };

    if (existing?.team_id) {
      const { data: team } = await supabase
        .from("teams")
        .select("slug")
        .eq("id", existing.team_id)
        .maybeSingle();
      if (team?.slug) revalidatePath(`/team/${team.slug}`);
    }

    logInternalChange("MEMBER_DELETED", "member", id, existing?.name || id, "Member permanently deleted", existing?.name || "", "");

    revalidatePath("/");
    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete member." };
  }
}

export async function upsertProject(formData: FormData): Promise<{ success: boolean; project?: any; error?: string }> {
  try {
    const { getAuthenticatedStaff } = await import("@/lib/auth/permissions");
    const { user } = await getAuthenticatedStaff();
    if (!user) {
      return { success: false, error: "Unauthorized: Please sign in to manage projects." };
    }

    const rawId = formOptionalId(formData);
    const isEdit = Boolean(rawId && UUID_REGEX.test(rawId));
    const uploaded = await uploadImageIfPresent((formData.get("image_file") as File) || null);
    const parsed = projectSchema.safeParse({
      id: isEdit ? rawId : undefined,
      title: formString(formData, "title"),
      short_description: formString(formData, "short_description"),
      image_url: uploaded ?? formString(formData, "image_url"),
      github_url: formString(formData, "github_url"),
      live_url: formString(formData, "live_url"),
      blog_url: formString(formData, "blog_url"),
    });
    if (!parsed.success) return { success: false, error: `Invalid project details: ${zodIssuesMessage(parsed.error)}` };
    const supabase = createAdminSupabase();

    const payload: Record<string, unknown> = { ...parsed.data };
    let result: any = null;

    if (isEdit) {
      const { data, error } = await supabase.from("projects").update(payload).eq("id", rawId).select().single();
      if (error) return { success: false, error: `Database error updating project: ${error.message}` };
      result = data;
    } else {
      delete payload.id;
      const { data, error } = await supabase.from("projects").insert(payload).select().single();
      if (error) return { success: false, error: `Database error inserting project: ${error.message}` };
      result = data;
    }

    // Log to Internal Management Log (fire-and-forget)
    logInternalChange(
      isEdit ? "PROJECT_UPDATED" : "PROJECT_CREATED",
      "project",
      result?.id || "new",
      parsed.data.title || "",
      parsed.data.short_description || "",
      "",
      JSON.stringify({ title: parsed.data.title, github_url: parsed.data.github_url }),
    );

    revalidatePath("/projects");
    revalidatePath("/admin");
    return { success: true, project: result };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to save project." };
  }
}

export async function deleteProject(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const { getAuthenticatedStaff } = await import("@/lib/auth/permissions");
    const { user } = await getAuthenticatedStaff();
    if (!user) {
      return { success: false, error: "Unauthorized: Please sign in." };
    }

    const id = String(formData.get("id") || "").trim();
    if (!id) return { success: false, error: "Project ID is required." };

    const supabase = createAdminSupabase();

    // Fetch title before deleting for the log
    const { data: proj } = await supabase.from("projects").select("title").eq("id", id).maybeSingle();
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) return { success: false, error: `Database error deleting project: ${error.message}` };

    // Log deletion
    logInternalChange("PROJECT_DELETED", "project", id, proj?.title || id, "Project permanently deleted", proj?.title || "", "");

    revalidatePath("/projects");
    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete project." };
  }
}

export async function upsertEvent(formData: FormData): Promise<{ success: boolean; event?: any; error?: string }> {
  try {
    const rawId = formOptionalId(formData);
    const isEdit = Boolean(rawId && UUID_REGEX.test(rawId));
    const uploaded = await uploadImageIfPresent((formData.get("image_file") as File) || null);
    const rawGuidelines = formString(formData, "guidelines");
    const guidelines = rawGuidelines
      ? rawGuidelines
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
      : undefined;

    const title = formString(formData, "title");
    const rawSlug = formString(formData, "slug");
    const autoSlug = (rawSlug || title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `event-${Date.now()}`;

    const registrationDeadline = formString(formData, "registration_deadline");
    const eventStartTime = formString(formData, "event_start_time");
    const eventEndTime = formString(formData, "event_end_time");
    const isRegOpenVal = formData.get("is_registration_open");
    const isRegistrationOpen = isRegOpenVal === null ? true : (isRegOpenVal === "true" || isRegOpenVal === "on" || isRegOpenVal === "1");
    const isSpotlightVal = formData.get("is_spotlight");
    const isSpotlight = isSpotlightVal === "true" || isSpotlightVal === "on" || isSpotlightVal === "1";
    const spotlightMessage = formString(formData, "spotlight_message");
    const spotlightPriority = formData.has("spotlight_priority") ? Number(formData.get("spotlight_priority")) : 1;

    const parsed = eventSchema.safeParse({
      id: isEdit ? rawId : undefined,
      title,
      slug: autoSlug,
      description: formString(formData, "description"),
      venue: formString(formData, "venue"),
      event_date: formString(formData, "event_date"),
      status: (formString(formData, "status") as "upcoming" | "live" | "past") || "upcoming",
      registration_fee: formData.has("registration_fee") ? Number(formData.get("registration_fee")) : 200,
      max_capacity: formData.has("max_capacity") ? Number(formData.get("max_capacity")) : 2000,
      registration_deadline: registrationDeadline || null,
      event_start_time: eventStartTime || null,
      event_end_time: eventEndTime || null,
      is_registration_open: isRegistrationOpen,
      image_url: uploaded ?? (formString(formData, "image_url") || null),
      register_url: formString(formData, "register_url") || null,
      google_form_url: formString(formData, "google_form_url") || null,
      upi_id: formString(formData, "upi_id") || "genai.community@okaxis",
      upi_qr_image_url: formString(formData, "upi_qr_image_url") || null,
      guidelines: guidelines && guidelines.length > 0 ? guidelines : undefined,
      is_spotlight: isSpotlight,
      spotlight_message: spotlightMessage || null,
      spotlight_priority: spotlightPriority,
    });
    if (!parsed.success) return { success: false, error: `Invalid event details: ${zodIssuesMessage(parsed.error)}` };
    const supabase = createAdminSupabase();
    const eventPayload: Record<string, unknown> = { ...parsed.data };

    // Parse allowed degrees & branches for event eligibility
    const allowedDegreesRaw = formString(formData, "allowed_degrees");
    if (allowedDegreesRaw) {
      try {
        const parsedDegs = JSON.parse(allowedDegreesRaw);
        eventPayload.allowed_degrees = Array.isArray(parsedDegs) && parsedDegs.length > 0
          ? parsedDegs
          : ["B.Tech", "M.Tech"];
      } catch {
        const splitDegs = allowedDegreesRaw.split(",").map((d) => d.trim()).filter(Boolean);
        eventPayload.allowed_degrees = splitDegs.length > 0 ? splitDegs : ["B.Tech", "M.Tech"];
      }
    } else {
      eventPayload.allowed_degrees = ["B.Tech", "M.Tech"];
    }

    const allowedBranchesRaw = formString(formData, "allowed_branches");
    if (allowedBranchesRaw) {
      try {
        eventPayload.allowed_branches = JSON.parse(allowedBranchesRaw);
      } catch {
        eventPayload.allowed_branches = allowedBranchesRaw.split(",").map((b) => b.trim()).filter(Boolean);
      }
    }

    let result: any = null;
    const cleanedPayload = { ...eventPayload };
    if (!isEdit) delete cleanedPayload.id;

    // Resilient schema adaptation loop to handle any missing optional columns in Supabase schema cache
    let lastError: any = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      const res = isEdit
        ? await supabase.from("events").update(cleanedPayload).eq("id", rawId).select().single()
        : await supabase.from("events").insert(cleanedPayload).select().single();

      if (!res.error) {
        result = res.data;
        lastError = null;
        break;
      }

      lastError = res.error;
      const errMsg = res.error.message || "";

      // Extract column name from error message if schema cache or missing column error
      const colMatch =
        errMsg.match(/Could not find the '([a-zA-Z0-9_]+)' column/i) ||
        errMsg.match(/column "?([a-zA-Z0-9_]+)"? of relation "events" does not exist/i) ||
        errMsg.match(/column "?([a-zA-Z0-9_]+)"? does not exist/i);

      if (colMatch && colMatch[1] && colMatch[1] in cleanedPayload) {
        delete cleanedPayload[colMatch[1]];
        continue;
      }

      // Check known optional columns
      if (errMsg.includes("allowed_degrees") && "allowed_degrees" in cleanedPayload) {
        delete cleanedPayload.allowed_degrees;
        continue;
      }
      if (errMsg.includes("allowed_branches") && "allowed_branches" in cleanedPayload) {
        delete cleanedPayload.allowed_branches;
        continue;
      }
      if (errMsg.includes("guidelines") && "guidelines" in cleanedPayload) {
        delete cleanedPayload.guidelines;
        continue;
      }
      if (errMsg.includes("spotlight") && ("spotlight_message" in cleanedPayload || "spotlight_priority" in cleanedPayload)) {
        delete cleanedPayload.spotlight_message;
        delete cleanedPayload.spotlight_priority;
        continue;
      }

      break;
    }

    if (lastError) {
      return { success: false, error: `Database error ${isEdit ? "updating" : "inserting"} event: ${lastError.message}` };
    }

    // Log event lifecycle to Event Lifecycle Log (fire-and-forget)
    logEventLifecycle(
      isEdit ? "EVENT_UPDATED" : "EVENT_CREATED",
      result?.id || "new",
      parsed.data.title || "",
      isEdit ? "title, status, venue, event_date, registration_fee, is_registration_open" : "all fields",
      "",
      JSON.stringify({
        title: parsed.data.title,
        status: parsed.data.status,
        venue: parsed.data.venue,
        event_date: parsed.data.event_date,
        registration_fee: parsed.data.registration_fee,
        is_registration_open: parsed.data.is_registration_open,
      }),
      isEdit ? "Event details updated via admin panel" : "New event created via admin panel",
    );

    revalidatePath("/");
    revalidatePath("/events");
    revalidatePath("/admin");
    return { success: true, event: result };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to save event." };
  }
}

export async function deleteEvent(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const id = String(formData.get("id") || "").trim();
    if (!id) return { success: false, error: "Event ID is required." };
    const supabase = createAdminSupabase();

    // Fetch event details before deleting for the log
    const { data: evt } = await supabase.from("events").select("title, status, event_date").eq("id", id).maybeSingle();
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) return { success: false, error: `Database error deleting event: ${error.message}` };

    // Log to Event Lifecycle Log
    logEventLifecycle(
      "EVENT_DELETED",
      id,
      evt?.title || id,
      "all",
      JSON.stringify({ title: evt?.title, status: evt?.status, event_date: evt?.event_date }),
      "",
      "Event permanently deleted from admin panel",
    );

    revalidatePath("/");
    revalidatePath("/events");
    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete event." };
  }
}

export async function upsertTeam(formData: FormData): Promise<{ success: boolean; team?: any; error?: string }> {
  try {
    const rawId = formOptionalId(formData);
    const isEdit = Boolean(rawId && UUID_REGEX.test(rawId));
    const uploaded = await uploadImageIfPresent((formData.get("image_file") as File) || null);
    const name = formString(formData, "name");
    const rawSlug = formString(formData, "slug");
    const autoSlug = (rawSlug || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `team-${Date.now()}`;

    const parsed = teamSchema.safeParse({
      id: isEdit ? rawId : undefined,
      name,
      slug: autoSlug,
      description: formString(formData, "description"),
      image_url: uploaded ?? formString(formData, "image_url"),
    });
    if (!parsed.success) return { success: false, error: `Invalid team details: ${zodIssuesMessage(parsed.error)}` };
    const supabase = createAdminSupabase();

    const payload: Record<string, unknown> = { ...parsed.data };
    let result: any = null;

    if (isEdit) {
      const { data, error } = await supabase.from("teams").update(payload).eq("id", rawId).select().single();
      if (error) return { success: false, error: `Database error updating team: ${error.message}` };
      result = data;
    } else {
      delete payload.id;
      const { data, error } = await supabase.from("teams").insert(payload).select().single();
      if (error) return { success: false, error: `Database error inserting team: ${error.message}` };
      result = data;
    }

    // Log to Internal Management Log (fire-and-forget)
    logInternalChange(
      isEdit ? "TEAM_UPDATED" : "TEAM_CREATED",
      "team",
      result?.id || "new",
      parsed.data.name || "",
      parsed.data.description || "",
      "",
      JSON.stringify({ name: parsed.data.name, slug: parsed.data.slug }),
    );

    // Ping Webhook
    pingGoogleFormWebhook();

    revalidatePath(`/team/${parsed.data.slug}`);
    revalidatePath("/");
    revalidatePath("/admin");
    return { success: true, team: result };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to save team." };
  }
}

export async function deleteTeam(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const id = String(formData.get("id") || "").trim();
    if (!id) return { success: false, error: "Team ID is required." };
    const supabase = createAdminSupabase();
    const { data: team } = await supabase.from("teams").select("slug, name").eq("id", id).maybeSingle();
    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (error) return { success: false, error: `Database error deleting team: ${error.message}` };

    // Log deletion
    logInternalChange("TEAM_DELETED", "team", id, team?.name || id, "Team permanently deleted", team?.name || "", "");

    // Ping Webhook
    pingGoogleFormWebhook();

    revalidatePath("/");
    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete team." };
  }
}

export async function approveMember(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  if (!id) throw new Error("Member ID is required.");
  const supabase = createAdminSupabase();

  const { data: existing } = await supabase
    .from("members")
    .select("team_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("members")
    .update({ status: "active" })
    .eq("id", id);
  if (error) throw new Error(error.message);

  if (existing?.team_id) {
    const { data: team } = await supabase
      .from("teams")
      .select("slug")
      .eq("id", existing.team_id)
      .maybeSingle();
    if (team?.slug) revalidatePath(`/team/${team.slug}`);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { success: true };
}

/**
 * Updates a logged-in member's profile avatar image with segregated drive storage.
 */
export async function updateUserProfileAvatarAction(formData: FormData) {
  const userId = String(formData.get("user_id") || "").trim();
  const file = formData.get("avatar_file") as File | null;
  const avatarUrlInput = String(formData.get("avatar_url") || "").trim();

  if (!userId) {
    throw new Error("User ID is required.");
  }

  const supabase = createAdminSupabase();

  let finalAvatarUrl = avatarUrlInput;

  if (
    file &&
    typeof file === "object" &&
    "size" in file &&
    typeof (file as any).size === "number" &&
    (file as any).size > 0 &&
    (file as any).name &&
    typeof (file as any).arrayBuffer === "function"
  ) {
    const mimeType = file.type || "image/jpeg";
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType.toLowerCase())) {
      throw new Error("Invalid image file type. Please upload JPEG, PNG, or WebP.");
    }
    if (file.size > 8 * 1024 * 1024) {
      throw new Error("Image file too large. Maximum size is 8MB.");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { uploadMemberAvatarToDrive } = await import("@/lib/google/drive");
    const driveRes = await uploadMemberAvatarToDrive({
      buffer,
      fileName: file.name,
      mimeType,
      memberName: `user_${userId}`,
    });

    finalAvatarUrl = driveRes.viewUrl;
  }

  if (!finalAvatarUrl) {
    throw new Error("Please select an image file or provide an avatar URL.");
  }

  // 1. Update user_profiles
  const { error } = await supabase
    .from("user_profiles")
    .update({
      avatar_url: finalAvatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) throw new Error(error.message || "Failed to update profile avatar.");

  // 2. Also sync to members table if matching member exists
  try {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("email, full_name, assigned_to_name")
      .eq("id", userId)
      .maybeSingle();

    if (profile) {
      const matchName = profile.assigned_to_name || profile.full_name;
      if (matchName) {
        await supabase
          .from("members")
          .update({ image_url: finalAvatarUrl, updated_at: new Date().toISOString() })
          .ilike("name", matchName);
      }
    }
  } catch {}

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/team");
  revalidatePath("/about");

  return { success: true, avatarUrl: finalAvatarUrl };
}

