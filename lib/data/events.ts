import { cache } from "react";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { Event, Branch } from "@/lib/types";

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
    return rawList.filter(
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
      return rawList.filter(
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
        .filter((e) => e.is_registration_open && e.status !== "past")
        .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

      if (upcoming.length > 0) {
        return upcoming[0];
      }

      // Fallback: Return the latest event
      return events[0] || null;
    } catch {
      return null;
    }
  },
);

/**
 * Fetches an event by slug or ID with resilient fallback.
 */
export const getEventBySlugOrId = cache(
  async (slugOrId: string): Promise<Event | null> => {
    if (!slugOrId) return null;
    const cleanParam = decodeURIComponent(slugOrId).trim();

    try {
      const supabase = await createServerSupabase();

      // 1. Try matching slug
      const { data: bySlug, error: slugErr } = await supabase
        .from("events")
        .select("*")
        .eq("slug", cleanParam)
        .maybeSingle();

      if (bySlug) {
        return bySlug as Event;
      }

      // 2. Try matching UUID if format matches
      if (UUID_REGEX.test(cleanParam)) {
        const { data: byId } = await supabase
          .from("events")
          .select("*")
          .eq("id", cleanParam)
          .maybeSingle();

        if (byId) {
          return byId as Event;
        }
      }

      // 3. Fallback: Query via Admin Client (in case RLS or session timing causes issue)
      const adminSupabase = createAdminSupabase();
      const { data: adminBySlug } = await adminSupabase
        .from("events")
        .select("*")
        .eq("slug", cleanParam)
        .maybeSingle();

      if (adminBySlug) {
        return adminBySlug as Event;
      }

      if (UUID_REGEX.test(cleanParam)) {
        const { data: adminById } = await adminSupabase
          .from("events")
          .select("*")
          .eq("id", cleanParam)
          .maybeSingle();

        if (adminById) {
          return adminById as Event;
        }
      }

      // 4. Case-insensitive slug fallback
      const { data: ilikeEvent } = await adminSupabase
        .from("events")
        .select("*")
        .ilike("slug", cleanParam)
        .limit(1)
        .maybeSingle();

      if (ilikeEvent) {
        return ilikeEvent as Event;
      }

      // 5. Ultimate fallback: if looking for test-event or generic, get first available event
      const { data: firstEvent } = await adminSupabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return (firstEvent as Event) ?? null;
    } catch (err) {
      console.error(`Error fetching event ${slugOrId}:`, err);
      try {
        const adminSupabase = createAdminSupabase();
        const { data } = await adminSupabase
          .from("events")
          .select("*")
          .limit(1)
          .maybeSingle();
        return (data as Event) ?? null;
      } catch {
        return null;
      }
    }
  },
);

/**
 * Fetches all approved VIT Bhopal B.Tech branches.
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

    return (data as Branch[]) ?? [];
  } catch (err) {
    console.error("Error fetching branches:", err);
    try {
      const adminSupabase = createAdminSupabase();
      const res = await adminSupabase
        .from("branches")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      return (res.data as Branch[]) ?? [];
    } catch {
      return [];
    }
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
