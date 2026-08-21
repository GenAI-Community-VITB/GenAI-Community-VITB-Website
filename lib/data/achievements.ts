"use server";

import { revalidatePath } from "next/cache";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStaff, requireStaffRole } from "@/lib/auth/permissions";
import { uploadMemberAvatarToDrive } from "@/lib/google/drive";
import { Achievement, AchievementCategory } from "@/lib/types";
import { isTop6Admin } from "@/lib/utils/format";

export async function getAchievements(): Promise<Achievement[]> {
  try {
    const supabase = createAdminSupabase();
    const { data, error } = await supabase
      .from("achievements")
      .select("*")
      .order("achievement_date", { ascending: false });

    if (error || !data) {
      return [];
    }

    return data as Achievement[];
  } catch {
    return [];
  }
}

/**
 * Panel and Top-6 Admins only: Create or update an achievement.
 */
export async function upsertAchievementAction(formData: FormData) {
  const { user, role, profile } = await getAuthenticatedStaff();

  const isAllowed = isTop6Admin(role, profile?.roles) || role === "president" || role === "vice_president";
  if (!isAllowed) {
    throw new Error("Action denied: Only Executive Panel and Top-6 Admins can manage achievements.");
  }

  const id = formData.get("id") as string | null;
  const title = String(formData.get("title") || "").trim();
  const caption = String(formData.get("caption") || "").trim();
  const category = String(formData.get("category") || "Hackathon") as AchievementCategory;
  const achievementDate = String(formData.get("achievement_date") || "").trim() || new Date().toISOString().split("T")[0];
  const linkUrl = String(formData.get("link_url") || "").trim() || null;

  if (!title || !caption) {
    throw new Error("Headline and caption are required.");
  }

  // Handle optional image
  const imageFile = formData.get("image_file") as File | null;
  let driveFileId: string | undefined = undefined;
  let imageUrl: string | undefined = undefined;

  if (imageFile && typeof imageFile === "object" && "size" in imageFile && imageFile.size > 0) {
    try {
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const driveRes = await uploadMemberAvatarToDrive({
        buffer,
        fileName: imageFile.name,
        mimeType: imageFile.type || "image/jpeg",
        memberName: `achievement_${title.slice(0, 15)}`,
      });
      driveFileId = driveRes.fileId;
      imageUrl = driveRes.viewUrl;
    } catch (err) {
      console.error("Achievement image upload failed:", err);
    }
  }

  const supabase = createAdminSupabase();

  if (id) {
    const updatePayload: Record<string, unknown> = {
      title,
      caption,
      category,
      achievement_date: achievementDate,
      link_url: linkUrl,
      updated_at: new Date().toISOString(),
    };
    if (imageUrl) {
      updatePayload.image_url = imageUrl;
      updatePayload.drive_file_id = driveFileId;
    }

    const { error } = await supabase.from("achievements").update(updatePayload).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("achievements").insert({
      title,
      caption,
      category,
      achievement_date: achievementDate,
      image_url: imageUrl || null,
      drive_file_id: driveFileId || null,
      link_url: linkUrl,
      created_by: user.id,
    });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { success: true };
}

/**
 * Panel and Top-6 Admins only: Delete an achievement.
 */
export async function deleteAchievementAction(id: string) {
  const { role, profile } = await getAuthenticatedStaff();

  const isAllowed = isTop6Admin(role, profile?.roles) || role === "president" || role === "vice_president";
  if (!isAllowed) {
    throw new Error("Action denied: Only Executive Panel and Top-6 Admins can delete achievements.");
  }

  const supabase = createAdminSupabase();
  const { error } = await supabase.from("achievements").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/admin");
  return { success: true };
}
