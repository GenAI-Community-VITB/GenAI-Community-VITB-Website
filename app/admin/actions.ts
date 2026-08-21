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

const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
];

async function uploadImageIfPresent(file: File | null) {
  if (!file || file.size === 0) return undefined;

  // Security: Validate MIME type against allowlist
  const mimeType = file.type || "image/jpeg";
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType.toLowerCase())) {
    throw new Error(`Invalid file type "${mimeType}". Only image files (JPEG, PNG, WebP, GIF, AVIF) are allowed.`);
  }

  // Security: Limit file size to 8MB
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Image file too large. Maximum size is 8MB.");
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const driveRes = await uploadMemberAvatarToDrive({
      buffer,
      fileName: file.name,
      mimeType,
      memberName: `asset_${Date.now()}`,
    });
    return driveRes.viewUrl;
  } catch (err: any) {
    // Re-throw validation errors, swallow upload errors with fallback
    if (err.message?.startsWith("Invalid file type") || err.message?.startsWith("Image file too large")) {
      throw err;
    }
    console.error("Asset upload failed, fallback to placeholder:", err);
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
    "admin@genai.community", // will be overridden with actor when available
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
    "admin@genai.community",
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
  if (email !== HARDCODED_ADMIN_EMAIL || password !== HARDCODED_ADMIN_PASSWORD) {
    return { ok: false };
  }
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return { ok: true };
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function upsertMember(formData: FormData) {
  const uploaded = await uploadImageIfPresent((formData.get("image_file") as File) || null);
  const isEdit = !!formOptionalId(formData);
  const parsed = memberSchema.safeParse({
    id: formOptionalId(formData),
    team_id: formString(formData, "team_id"),
    name: formString(formData, "name"),
    role: formString(formData, "role"),
    position: formString(formData, "position"),
    linkedin_url: formString(formData, "linkedin_url"),
    image_url: uploaded ?? formString(formData, "image_url"),
    status: (formString(formData, "status") as "active" | "pending") || "active",
  });
  if (!parsed.success) throw new Error(zodIssuesMessage(parsed.error));
  const supabase = createAdminSupabase();
  const { error } = await supabase.from("members").upsert(parsed.data);
  if (error) throw new Error(error.message);

  // Log to Internal Management Log sheet (fire-and-forget)
  logInternalChange(
    isEdit ? "MEMBER_UPDATED" : "MEMBER_CREATED",
    "member",
    parsed.data.id || "new",
    parsed.data.name || "",
    `${parsed.data.role || "Core Member"} in team ${parsed.data.team_id}`,
    "",
    JSON.stringify({ name: parsed.data.name, role: parsed.data.role, position: parsed.data.position }),
  );

  // Revalidate the specific team page so the change is live immediately
  const { data: team } = await supabase
    .from("teams")
    .select("slug")
    .eq("id", parsed.data.team_id)
    .single();
  if (team?.slug) revalidatePath(`/team/${team.slug}`);

  revalidatePath("/");
  revalidatePath("/admin");
}


export async function deleteMember(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = createAdminSupabase();

  // Look up the team slug before deleting so we can revalidate that page
  const { data: existing } = await supabase
    .from("members")
    .select("team_id")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("members").delete().eq("id", id);
  if (error) throw new Error(error.message);

  if (existing?.team_id) {
    const { data: team } = await supabase
      .from("teams")
      .select("slug")
      .eq("id", existing.team_id)
      .single();
    if (team?.slug) revalidatePath(`/team/${team.slug}`);
  }

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function upsertProject(formData: FormData) {
  const supabaseServer = await createServerSupabase();
  const { data: { user } } = await supabaseServer.auth.getUser();
  
  if (user) {
    const adminSupabase = createAdminSupabase();
    const { data: profile } = await adminSupabase.from("user_profiles").select("role, roles:member_roles(team, position)").eq("id", user.id).single();
    if (profile) {
      const { isTop6Admin } = await import("@/lib/utils/format");
      if (!isTop6Admin(profile.role, profile.roles)) {
        throw new Error("Action restricted: Only Top-6 Executives can create or edit projects.");
      }
    }
  }

  const isEdit = !!formOptionalId(formData);
  const uploaded = await uploadImageIfPresent((formData.get("image_file") as File) || null);
  const parsed = projectSchema.safeParse({
    id: formOptionalId(formData),
    title: formString(formData, "title"),
    short_description: formString(formData, "short_description"),
    image_url: uploaded ?? formString(formData, "image_url"),
    github_url: formString(formData, "github_url"),
    live_url: formString(formData, "live_url"),
    blog_url: formString(formData, "blog_url"),
  });
  if (!parsed.success) throw new Error(`Invalid project: ${zodIssuesMessage(parsed.error)}`);
  const supabase = createAdminSupabase();
  const { error } = await supabase.from("projects").upsert(parsed.data);
  if (error) throw new Error(error.message);

  // Log to Internal Management Log (fire-and-forget)
  logInternalChange(
    isEdit ? "PROJECT_UPDATED" : "PROJECT_CREATED",
    "project",
    parsed.data.id || "new",
    parsed.data.title || "",
    parsed.data.short_description || "",
    "",
    JSON.stringify({ title: parsed.data.title, github_url: parsed.data.github_url }),
  );

  revalidatePath("/projects");
  revalidatePath("/admin");
}

export async function deleteProject(formData: FormData) {
  const supabaseServer = await createServerSupabase();
  const { data: { user } } = await supabaseServer.auth.getUser();
  
  if (user) {
    const adminSupabase = createAdminSupabase();
    const { data: profile } = await adminSupabase.from("user_profiles").select("role, roles:member_roles(team, position)").eq("id", user.id).single();
    if (profile) {
      const { isTop6Admin } = await import("@/lib/utils/format");
      if (!isTop6Admin(profile.role, profile.roles)) {
        throw new Error("Action restricted: Only Top-6 Executives can delete projects.");
      }
    }
  }

  const id = String(formData.get("id"));
  const supabase = createAdminSupabase();

  // Fetch title before deleting for the log
  const { data: proj } = await supabase.from("projects").select("title").eq("id", id).maybeSingle();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);

  // Log deletion
  logInternalChange("PROJECT_DELETED", "project", id, proj?.title || id, "Project permanently deleted", proj?.title || "", "");

  revalidatePath("/projects");
  revalidatePath("/admin");
}

export async function upsertEvent(formData: FormData) {
  const isEdit = !!formOptionalId(formData);
  const uploaded = await uploadImageIfPresent((formData.get("image_file") as File) || null);
  const rawGuidelines = formString(formData, "guidelines");
  const guidelines = rawGuidelines
    ? rawGuidelines
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
    : undefined;

  const registrationDeadline = formString(formData, "registration_deadline");
  const eventStartTime = formString(formData, "event_start_time");
  const eventEndTime = formString(formData, "event_end_time");
  const isRegOpenVal = formData.get("is_registration_open");
  const isRegistrationOpen = isRegOpenVal === "true" || isRegOpenVal === "on" || isRegOpenVal === "1";

  const parsed = eventSchema.safeParse({
    id: formOptionalId(formData),
    title: formString(formData, "title"),
    slug: formString(formData, "slug") || undefined,
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
    upi_id: formString(formData, "upi_id") || "genai.community@okaxis",
    upi_qr_image_url: formString(formData, "upi_qr_image_url") || null,
    guidelines: guidelines && guidelines.length > 0 ? guidelines : undefined,
  });
  if (!parsed.success) throw new Error(zodIssuesMessage(parsed.error));
  const supabase = createAdminSupabase();
  const eventPayload: Record<string, unknown> = { ...parsed.data };

  let { error } = await supabase.from("events").upsert(eventPayload);
  
  // If column doesn't exist in Supabase schema yet, retry without guidelines gracefully
  if (error && error.message.includes("guidelines")) {
    delete eventPayload.guidelines;
    const retry = await supabase.from("events").upsert(eventPayload);
    error = retry.error;
  }

  if (error) throw new Error(error.message);

  // Log event lifecycle to Event Lifecycle Log (fire-and-forget)
  logEventLifecycle(
    isEdit ? "EVENT_UPDATED" : "EVENT_CREATED",
    parsed.data.id || "new",
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
}

export async function deleteEvent(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = createAdminSupabase();

  // Fetch event details before deleting for the log
  const { data: evt } = await supabase.from("events").select("title, status, event_date").eq("id", id).maybeSingle();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw new Error(error.message);

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
}

export async function upsertTeam(formData: FormData) {
  const isEdit = !!formOptionalId(formData);
  const uploaded = await uploadImageIfPresent((formData.get("image_file") as File) || null);
  const parsed = teamSchema.safeParse({
    id: formOptionalId(formData),
    name: formString(formData, "name"),
    slug: formString(formData, "slug"),
    description: formString(formData, "description"),
    image_url: uploaded ?? formString(formData, "image_url"),
  });
  if (!parsed.success) throw new Error(zodIssuesMessage(parsed.error));
  const supabase = createAdminSupabase();
  const { error } = await supabase.from("teams").upsert(parsed.data);
  if (error) throw new Error(error.message);

  // Log to Internal Management Log (fire-and-forget)
  logInternalChange(
    isEdit ? "TEAM_UPDATED" : "TEAM_CREATED",
    "team",
    parsed.data.id || "new",
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
}

export async function deleteTeam(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = createAdminSupabase();
  const { data: team } = await supabase.from("teams").select("slug, name").eq("id", id).single();
  const { error } = await supabase.from("teams").delete().eq("id", id);
  if (error) throw new Error(error.message);

  // Log deletion
  logInternalChange("TEAM_DELETED", "team", id, team?.name || id, "Team permanently deleted", team?.name || "", "");

  // Ping Webhook
  pingGoogleFormWebhook();

  if (team?.slug) revalidatePath(`/team/${team.slug}`);
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function approveMember(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = createAdminSupabase();

  const { data: existing } = await supabase
    .from("members")
    .select("team_id")
    .eq("id", id)
    .single();

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
      .single();
    if (team?.slug) revalidatePath(`/team/${team.slug}`);
  }

  revalidatePath("/");
  revalidatePath("/admin");
}
