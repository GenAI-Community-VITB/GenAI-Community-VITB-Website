import { createAdminSupabase } from "@/lib/supabase/admin";
import { validateHierarchy, type HierarchyLayout } from "@/lib/utils/team-hierarchy";
import type { Member } from "@/lib/types";

export async function getTeamHierarchy(): Promise<HierarchyLayout | null> {
  const { data, error } = await createAdminSupabase().from("team_hierarchy_layout").select("nodes, version").eq("id", true).maybeSingle();
  // Safe rollout: continue serving the existing tree before the additive migration.
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return null;
    throw new Error("Unable to load the team layout. Please try again.");
  }
  return data ? { nodes: validateHierarchy(data.nodes), version: data.version } : null;
}

export async function getPublicHierarchyRoster(): Promise<Member[]> {
  const { data, error } = await createAdminSupabase().from("members")
    .select("id, team_id, name, role, position, image_url, github_url, linkedin_url, status, created_at, updated_at")
    .eq("status", "active").order("created_at");
  if (error) throw new Error("Unable to load the team roster.");
  return data ?? [];
}
