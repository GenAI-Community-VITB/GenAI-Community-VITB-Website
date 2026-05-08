import { cache } from "react";
import { createServerSupabase } from "@/lib/supabase/server";

export const getTeamsWithMembers = cache(async () => {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("teams")
    .select("*, members(*)")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getProjects = cache(async () => {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getEvents = cache(async () => {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("event_date", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});
