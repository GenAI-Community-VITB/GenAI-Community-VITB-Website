import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = await createServerSupabase();
  const [{ data: teams }, { data: members }, { data: events }, { data: projects }] =
    await Promise.all([
      supabase.from("teams").select("*").order("name"),
      supabase.from("members").select("*").order("created_at", { ascending: false }),
      supabase.from("events").select("*").order("event_date", { ascending: false }),
      supabase.from("projects").select("*").order("created_at", { ascending: false }),
    ]);

  return (
    <AdminDashboardClient
      teams={teams ?? []}
      members={members ?? []}
      events={events ?? []}
      projects={projects ?? []}
    />
  );
}
