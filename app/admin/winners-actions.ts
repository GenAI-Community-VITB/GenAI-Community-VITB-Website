"use server";

import { revalidatePath } from "next/cache";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStaff } from "@/lib/auth/permissions";
import { isTop6Admin } from "@/lib/utils/format";
import { uploadMemberAvatarToDrive } from "@/lib/google/drive";
import type { EventWinner } from "@/lib/data/winners";

/**
 * Server Action: Create or Update an Event Winner (Exec 6 or Event Leads)
 */
export async function upsertWinnerAction(formData: FormData) {
  const { user, role, profile } = await getAuthenticatedStaff();

  const isEventLead = Array.isArray(profile?.roles) && profile.roles.some((r: any) => r.team === "event_management" || r.team === "technical_team");
  const isAllowed = isTop6Admin(role, profile?.roles) || isEventLead || role === "tech" || role === "lead";

  if (!isAllowed) {
    throw new Error("Action denied: Only Executive Panel, Event Leads, or Tech Leads can manage event winners.");
  }

  const id = formData.get("id") as string | null;
  const eventName = String(formData.get("event_name") || "").trim();
  const position = String(formData.get("position") || "1st") as EventWinner["position"];
  const teamName = String(formData.get("team_name") || "").trim();
  const membersRaw = String(formData.get("members") || "").trim();
  const projectTitle = String(formData.get("project_title") || "").trim();
  const projectDescription = String(formData.get("project_description") || "").trim();
  const prizeAward = String(formData.get("prize_award") || "").trim();
  const eventDate = String(formData.get("event_date") || "").trim() || new Date().toISOString().split("T")[0];
  const githubUrl = String(formData.get("github_url") || "").trim() || null;
  const demoUrl = String(formData.get("demo_url") || "").trim() || null;

  if (!eventName || !teamName || !projectTitle) {
    throw new Error("Event name, team name, and project title are required.");
  }

  const membersArray = membersRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Optional image upload
  const imageFile = formData.get("image_file") as File | null;
  let imageUrl: string | undefined = undefined;

  if (
    imageFile &&
    typeof imageFile === "object" &&
    "size" in imageFile &&
    typeof (imageFile as any).size === "number" &&
    (imageFile as any).size > 0 &&
    (imageFile as any).name &&
    typeof (imageFile as any).arrayBuffer === "function"
  ) {
    try {
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const driveRes = await uploadMemberAvatarToDrive({
        buffer,
        fileName: imageFile.name,
        mimeType: imageFile.type || "image/jpeg",
        memberName: `winner_${teamName.slice(0, 15)}`,
      });
      imageUrl = driveRes.viewUrl;
    } catch (err) {
      console.error("Winner photo upload failed:", err);
    }
  }

  const supabase = createAdminSupabase();

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isEdit = Boolean(id && UUID_REGEX.test(id));
  const validCreatorId = user?.id && UUID_REGEX.test(user.id) ? user.id : null;

  let result: any = null;

  if (isEdit) {
    const updatePayload: Record<string, unknown> = {
      event_name: eventName,
      position,
      team_name: teamName,
      members: membersArray,
      project_title: projectTitle,
      project_description: projectDescription,
      prize_award: prizeAward,
      event_date: eventDate,
      github_url: githubUrl,
      demo_url: demoUrl,
      updated_at: new Date().toISOString(),
    };
    if (imageUrl) {
      updatePayload.image_url = imageUrl;
    }

    const { data, error } = await supabase.from("event_winners").update(updatePayload).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    result = data;
  } else {
    const insertPayload: Record<string, unknown> = {
      event_name: eventName,
      position,
      team_name: teamName,
      members: membersArray,
      project_title: projectTitle,
      project_description: projectDescription,
      prize_award: prizeAward,
      event_date: eventDate,
      image_url: imageUrl || null,
      github_url: githubUrl,
      demo_url: demoUrl,
    };
    if (validCreatorId) {
      insertPayload.created_by = validCreatorId;
    }
    const { data, error } = await supabase.from("event_winners").insert(insertPayload).select().single();
    if (error) throw new Error(error.message);
    result = data;
  }

  revalidatePath("/");
  revalidatePath("/winners");
  revalidatePath("/admin");
  return { success: true, winner: result };
}

/**
 * Server Action: Delete an Event Winner
 */
export async function deleteWinnerAction(id: string) {
  const { user } = await getAuthenticatedStaff();
  if (!user) {
    throw new Error("Unauthorized: Please sign in.");
  }

  const cleanId = String(id || "").trim();
  if (!cleanId) throw new Error("Winner ID is required.");

  const supabase = createAdminSupabase();
  const { error } = await supabase.from("event_winners").delete().eq("id", cleanId);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/winners");
  revalidatePath("/admin");
  return { success: true };
}
