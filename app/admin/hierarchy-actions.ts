"use server";

import { revalidatePath } from "next/cache";
import { requireStaffActionRole } from "@/lib/auth/permissions";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { validateHierarchy } from "@/lib/utils/team-hierarchy";

export async function saveTeamHierarchy(input: unknown, version: number) {
  try {
    await requireStaffActionRole("tech");
    if (!Number.isSafeInteger(version) || version < 0 || version >= 2147483647) throw new Error("Invalid layout version. Reload the page.");
    const nodes = validateHierarchy(input);
    const supabase = createAdminSupabase();
    const ids = nodes.flatMap(n => n.memberId ? [n.memberId] : []);
    if (ids.length) {
      const { data, error } = await supabase.from("members").select("id").in("id", ids).eq("status", "active");
      if (error) throw new Error("Could not verify the roster. Please try again.");
      if (data?.length !== ids.length) throw new Error("Some members were removed or made pending. Reload the page before saving.");
    }
    const payload = { nodes, version: version + 1, updated_at: new Date().toISOString() };
    // Conditional update prevents two administrators from silently overwriting each other.
    const query = version === 0
      ? supabase.from("team_hierarchy_layout").insert({ id: true, ...payload })
      : supabase.from("team_hierarchy_layout").update(payload).eq("id", true).eq("version", version);
    const { data, error } = await query.select("version").maybeSingle();
    if (error?.code === "23505" || (!error && !data)) throw new Error("Another administrator saved changes. Reload the page to get the latest tree.");
    if (error) throw new Error("The hierarchy could not be saved. Please try again.");
    revalidatePath("/team");
    revalidatePath("/admin");
    return { success: true as const, version: data!.version as number };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Unable to save the hierarchy." };
  }
}
