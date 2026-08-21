import { cache } from "react";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export interface EventWinner {
  id: string;
  eventId?: string;
  eventName: string;
  position: "1st" | "2nd" | "3rd" | "Special Mention" | "Innovation Award";
  teamName: string;
  members: string[]; // array of student names
  projectTitle: string;
  projectDescription: string;
  prizeAward: string;
  imageUrl?: string | null;
  eventDate: string;
  githubUrl?: string;
  demoUrl?: string;
}

export const getEventWinners = cache(async (): Promise<EventWinner[]> => {
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("event_winners")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) {
      const admin = createAdminSupabase();
      const res = await admin
        .from("event_winners")
        .select("*")
        .order("created_at", { ascending: false });

      if (res.data && res.data.length > 0) {
        return res.data.map(mapDbWinner);
      }
      return [];
    }

    return data.map(mapDbWinner);
  } catch {
    return [];
  }
});

function mapDbWinner(row: any): EventWinner {
  return {
    id: row.id,
    eventId: row.event_id,
    eventName: row.event_name || "Club Technical Challenge",
    position: row.position || "1st",
    teamName: row.team_name || "Champion Team",
    members: Array.isArray(row.members) ? row.members : typeof row.members === "string" ? row.members.split(",").map((s: string) => s.trim()) : ["Student Builder"],
    projectTitle: row.project_title || "Generative AI Project",
    projectDescription: row.project_description || "Exceptional technical contribution.",
    prizeAward: row.prize_award || "Championship Award",
    imageUrl: row.image_url || null,
    eventDate: row.event_date || "2026",
    githubUrl: row.github_url || undefined,
    demoUrl: row.demo_url || undefined,
  };
}
