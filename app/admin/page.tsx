import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStaff } from "@/lib/auth/permissions";
import { getAchievements } from "@/lib/data/achievements";
import { getEventWinners } from "@/lib/data/winners";
import { isTop6Admin, getHumanReadableRole, getMemberAssignedName } from "@/lib/utils/format";
import type { Event } from "@/lib/types";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function AdminDashboardPage() {
  const { user, profile, role } = await getAuthenticatedStaff();

  if (!user || !profile || !role) {
    redirect("/admin/login");
  }

  // Route staff directly based on role if they only have specific access
  if (role === "volunteer") {
    redirect("/admin/scanner");
  }

  const supabase = createAdminSupabase();
  const [
    { data: teams },
    { data: members },
    { data: eventsRaw },
    { data: projects },
    achievements,
    winners,
  ] = await Promise.all([
    Promise.resolve(supabase.from("teams").select("*").order("name")).then((r) => (r.error ? { data: [] } : r)).catch(() => ({ data: [] })),
    Promise.resolve(supabase.from("members").select("*").order("created_at", { ascending: false })).then((r) => (r.error ? { data: [] } : r)).catch(() => ({ data: [] })),
    Promise.resolve(supabase.from("events").select("*").order("event_date", { ascending: false })).then((r) => (r.error ? { data: [] } : r)).catch(() => ({ data: [] })),
    Promise.resolve(supabase.from("projects").select("*").order("created_at", { ascending: false })).then((r) => (r.error ? { data: [] } : r)).catch(() => ({ data: [] })),
    getAchievements().catch(() => []),
    getEventWinners().catch(() => []),
  ]);

  // Fetch live registration counts for each event to show "registered / max"
  let events: Event[] = (eventsRaw as Event[]) || [];
  if (events.length > 0) {
    const { data: regCounts } = await supabase
      .from("registrations")
      .select("event_id");

    if (regCounts) {
      const countMap = new Map<string, number>();
      (regCounts as { event_id: string }[]).forEach((r) => {
        if (r.event_id) {
          countMap.set(r.event_id, (countMap.get(r.event_id) || 0) + 1);
        }
      });
      events = events.map((ev: Event) => ({
        ...ev,
        registered_count: countMap.get(ev.id) || 0,
      }));
    }
  }

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
