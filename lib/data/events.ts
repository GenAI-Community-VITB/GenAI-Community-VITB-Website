import { applyEventLifecycle } from "@/lib/utils/event-lifecycle";
import { cache } from "react";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { Event, Branch } from "@/lib/types";
import { ALL_APPROVED_BRANCHES } from "@/lib/validation";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Fetches all events for public display.
 */
export const getPublicEvents = cache(async (): Promise<Event[]> => {
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: true });

    let rawList: Event[] = [];
    if (error) {
      console.warn("Public client event fetch fallback to admin client:", error.message);
      const adminSupabase = createAdminSupabase();
      const adminRes = await adminSupabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: true });
      rawList = (adminRes.data as Event[]) ?? [];
    } else {
      rawList = (data as Event[]) ?? [];
    }

    // Filter out dummy/test events
    return rawList.map(e => applyEventLifecycle(e)).filter(
      (e) =>
        e.slug !== "test-event-2026" &&
        !e.title?.toLowerCase().includes("test event") &&
        !e.title?.toLowerCase().includes("dummy"),
    );
  } catch (err) {
    console.error("Error fetching public events:", err);
    try {
      const adminSupabase = createAdminSupabase();
      const adminRes = await adminSupabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: true });
      const rawList = (adminRes.data as Event[]) ?? [];
      return rawList.map(e => applyEventLifecycle(e)).filter(
        (e) =>
          e.slug !== "test-event-2026" &&
          !e.title?.toLowerCase().includes("test event") &&
          !e.title?.toLowerCase().includes("dummy"),
      );
    } catch {
      return [];
    }
  }
});

/**
 * Fetches the next upcoming event that is open for registration within an N-day window.
 */
export const getUpcomingRegisterableEvent = cache(
  async (daysWindow = 365): Promise<Event | null> => {
    try {
      const events = await getPublicEvents();
      if (!events || events.length === 0) return null;

      // First check for any event marked as 'live'
      const liveEvent = events.find((e) => e.status === "live" && e.is_registration_open);
      if (liveEvent) return liveEvent;

      // Next look for upcoming events with registration open
      const now = new Date().getTime();
      const upcoming = events
        .filter((e) => e.is_registration_open && e.status !== "past" && new Date(e.event_date).getTime() >= now && new Date(e.event_date).getTime() <= now + daysWindow * 86400000)
        .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

      if (upcoming.length > 0) {
        return upcoming[0];
      }

      // Fallback: Return the latest event
      return null;
    } catch {
      return null;
    }
  },
);

/**
 * Fetches an event by slug or ID with resilient fallback.
 */
export const getEventBySlugOrId = cache(async (slugOrId: string): Promise<Event | null> => {
  if (!slugOrId) return null;
  let value: string;
  try { value = decodeURIComponent(slugOrId).trim(); } catch { return null; }
  const db = await createServerSupabase();
  const slug = await db.from("events").select("*").eq("slug", value).maybeSingle();
  if (slug.error) throw new Error(slug.error.message);
  if (slug.data) return applyEventLifecycle(slug.data as Event);
  if (!UUID_REGEX.test(value)) return null;
  const id = await db.from("events").select("*").eq("id", value).maybeSingle();
  if (id.error) throw new Error(id.error.message);
  return id.data ? applyEventLifecycle(id.data as Event) : null;
});

/**
 * Fetches all approved VIT Bhopal branches (M.Tech at top, followed by B.Tech).
 */
export const getActiveBranches = cache(async (): Promise<Branch[]> => {
  try {
    const supabase = await createServerSupabase();
    let { data, error } = await supabase
      .from("branches")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error || !data || data.length === 0) {
      const adminSupabase = createAdminSupabase();
      const res = await adminSupabase
        .from("branches")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      data = res.data;
    }

    if (data && data.length > 0) {
      return data as Branch[];
    }

    return ALL_APPROVED_BRANCHES.map((name, i) => ({
      id: `branch-${i}`,
      name,
      code: name.slice(0, 10).toUpperCase(),
      is_active: true,
      display_order: i,
    })) as Branch[];
  } catch (err) {
    console.error("Error fetching branches:", err);
    return ALL_APPROVED_BRANCHES.map((name, i) => ({
      id: `branch-${i}`,
      name,
      code: name.slice(0, 10).toUpperCase(),
      is_active: true,
      display_order: i,
    })) as Branch[];
  }
});

/**
 * Gets live registration count for an event.
 */
export async function getEventRegistrationStats(eventId: string): Promise<{
  totalRegistered: number;
  pendingCount: number;
  verifiedCount: number;
  checkedInCount: number;
  maxCapacity: number;
  isFull: boolean;
}> {
  try {
    const supabase = createAdminSupabase();

    const [
      { data: event },
      { count: validCount },
      { count: pendingCount },
      { count: verifiedCount },
      { count: checkedInCount },
    ] = await Promise.all([
      supabase.from("events").select("max_capacity").eq("id", eventId).maybeSingle(),
      supabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .in("registration_status", ["pending", "verified", "checked_in"]),
      supabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("registration_status", "pending"),
      supabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("registration_status", "verified"),
      supabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("registration_status", "checked_in"),
    ]);

    const maxCapacity = event?.max_capacity || 2000;
    const total = validCount || 0;

    return {
      totalRegistered: total,
      pendingCount: pendingCount || 0,
      verifiedCount: verifiedCount || 0,
      checkedInCount: checkedInCount || 0,
      maxCapacity,
      isFull: total >= maxCapacity,
    };
  } catch (err) {
    console.error("Error fetching registration stats:", err);
    return {
      totalRegistered: 0,
      pendingCount: 0,
      verifiedCount: 0,
      checkedInCount: 0,
      maxCapacity: 2000,
      isFull: false,
    };
  }
}
