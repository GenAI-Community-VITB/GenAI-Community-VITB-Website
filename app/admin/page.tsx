import { applyEventLifecycle } from "@/lib/utils/event-lifecycle";
import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStaff, hasRole } from "@/lib/auth/permissions";
import { getAchievements } from "@/lib/data/achievements";
import { getEventWinners } from "@/lib/data/winners";
import { isTop6Admin, getHumanReadableRole, getMemberAssignedName } from "@/lib/utils/format";
import type { Event } from "@/lib/types";
import { redirect } from "next/navigation";
import { getTeamHierarchy } from "@/lib/data/team-hierarchy";

export const revalidate = 0;

export default async function AdminDashboardPage() {
  const { user, profile, role } = await getAuthenticatedStaff();

  if (!user || !profile || !role) {
    redirect("/admin/login");
  }

  const supabase = createAdminSupabase();
  const [
    { data: teams },
    { data: members },
    { data: eventsRaw },
    { data: projects },
    achievements,
    winners,
    hierarchyLayout,
  ] = await Promise.all([
    Promise.resolve(supabase.from("teams").select("*").order("name")).then((r) => { if (r.error) throw new Error(r.error.message); return r; }),
    Promise.resolve(supabase.from("members").select("*").order("created_at", { ascending: false })).then((r) => { if (r.error) throw new Error(r.error.message); return r; }),
    Promise.resolve(supabase.from("events").select("*").order("event_date", { ascending: false })).then((r) => { if (r.error) throw new Error(r.error.message); return r; }),
    Promise.resolve(supabase.from("projects").select("*").order("created_at", { ascending: false })).then((r) => { if (r.error) throw new Error(r.error.message); return r; }),
    getAchievements().catch(() => []),
    getEventWinners().catch(() => []),
    getTeamHierarchy(),
  ]);

  const events: Event[] = await Promise.all(((eventsRaw as Event[]) || []).map(async ev => {
    const {count,error}=await supabase.from("registrations").select("id",{count:"exact",head:true}).eq("event_id",ev.id);
    if(error) throw new Error(error.message);
    return {...applyEventLifecycle(ev),registered_count:count || 0};
  }));
  const blogCountResult=await supabase.from("blog_posts").select("id",{count:"exact",head:true});
  if(blogCountResult.error) throw new Error(blogCountResult.error.message);

  const isTop6 = isTop6Admin(role, profile?.roles);

  // Universally resolve actual student name using official roster mapper + database cascade
  const adminSupabase = createAdminSupabase();
  let dbAssignedName = profile?.assigned_to_name || "";
  let dbFullName = profile?.full_name || "";

  if (user?.id) {
    const { data: up } = await adminSupabase
      .from("user_profiles")
      .select("full_name, assigned_to_name")
      .eq("id", user.id)
      .maybeSingle();
    if (up) {
      if (up.assigned_to_name) dbAssignedName = up.assigned_to_name;
      if (up.full_name) dbFullName = up.full_name;
    }
  }

  const actualName = getMemberAssignedName(
    user?.email,
    dbAssignedName,
    dbFullName || user?.user_metadata?.full_name,
  );

  const displayRoleTitle = getHumanReadableRole(role, profile?.roles);

  return (
    <AdminDashboardClient
      hierarchyLayout={hierarchyLayout}
      canManageContent={hasRole(role, "tech", profile.roles)}
      blogCount={blogCountResult.count || 0}
      teams={teams ?? []}
      members={members ?? []}
      events={events ?? []}
      projects={projects ?? []}
      achievements={achievements ?? []}
      winners={winners ?? []}
      userRole={displayRoleTitle}
      userName={actualName || "Team Member"}
      isTop6={isTop6}
    />
  );
}
