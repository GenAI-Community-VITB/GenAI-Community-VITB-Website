"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { eventSchema, memberSchema, projectSchema, teamSchema } from "@/lib/validation";
import type { ZodError } from "zod";

function formString(formData: FormData, key: string): string {
  const v = formData.get(key);
  if (v == null) return "";
  return String(v).trim();
}

/** Missing `id` on create sends `null` from FormData; Zod `.optional()` expects `undefined`, not `null`. */
function formOptionalId(formData: FormData): string | undefined {
  const v = formData.get("id");
  if (v == null || String(v).trim() === "") return undefined;
  return String(v).trim();
}

function zodIssuesMessage(err: ZodError) {
  return err.issues.map((i) => `${i.path.join(".") || "form"}: ${i.message}`).join("; ");
}

const HARDCODED_ADMIN_EMAIL = "admin.club.core@genai.local";
const HARDCODED_ADMIN_PASSWORD = "G3nAI!Club#Root$2026@Ultra";
const ADMIN_SESSION_COOKIE = "club_admin_session";

async function uploadImageIfPresent(file: File | null) {
  if (!file || file.size === 0) return undefined;
  const supabase = createAdminSupabase();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("club-assets").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("club-assets").getPublicUrl(path);
  return data.publicUrl;
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
  revalidatePath("/projects");
  revalidatePath("/admin");
}

export async function deleteProject(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = createAdminSupabase();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/projects");
  revalidatePath("/admin");
}

export async function upsertEvent(formData: FormData) {
  const uploaded = await uploadImageIfPresent((formData.get("image_file") as File) || null);
  const parsed = eventSchema.safeParse({
    id: formOptionalId(formData),
    title: formString(formData, "title"),
    description: formString(formData, "description"),
    venue: formString(formData, "venue"),
    event_date: formString(formData, "event_date"),
    status: formString(formData, "status") || "upcoming",
    image_url: uploaded ?? formString(formData, "image_url"),
    register_url: formString(formData, "register_url"),
  });
  if (!parsed.success) throw new Error(zodIssuesMessage(parsed.error));
  const supabase = createAdminSupabase();
  const { error } = await supabase.from("events").upsert(parsed.data);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath("/admin");
}

export async function deleteEvent(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = createAdminSupabase();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath("/admin");
}

export async function upsertTeam(formData: FormData) {
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
  
  // Ping Webhook
  pingGoogleFormWebhook();

  revalidatePath(`/team/${parsed.data.slug}`);
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function deleteTeam(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = createAdminSupabase();
  const { data: team } = await supabase.from("teams").select("slug").eq("id", id).single();
  const { error } = await supabase.from("teams").delete().eq("id", id);
  if (error) throw new Error(error.message);

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
