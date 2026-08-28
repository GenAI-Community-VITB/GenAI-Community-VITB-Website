import { cache } from "react";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { normalizeDriveImageUrl } from "@/lib/utils/format";

// Ultra-fast in-memory LRU-style cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const MEMORY_CACHE = new Map<string, CacheEntry<any>>();
const CACHE_TTL_MS = 60_000; // 60 seconds memory persistence

function getCached<T>(key: string): T | null {
  const entry = MEMORY_CACHE.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.data;
  }
  return null;
}

function setCache<T>(key: string, data: T): void {
  MEMORY_CACHE.set(key, { data, timestamp: Date.now() });
}

export const getTeamsWithMembers = cache(async () => {
  const cached = getCached<any[]>("teams_with_members");
  if (cached) return cached;

  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("teams")
      .select("*, members(*)")
      .order("created_at", { ascending: true });

    let result = data ?? [];
    if (error || !data) {
      const admin = createAdminSupabase();
      const res = await admin
        .from("teams")
        .select("*, members(*)")
        .order("created_at", { ascending: true });
      result = res.data ?? [];
    }
    if (result.length > 0) setCache("teams_with_members", result);
    return result;
  } catch {
    try {
      const admin = createAdminSupabase();
      const res = await admin
        .from("teams")
        .select("*, members(*)")
        .order("created_at", { ascending: true });
      const fallback = res.data ?? [];
      if (fallback.length > 0) setCache("teams_with_members", fallback);
      return fallback;
    } catch {
      return [];
    }
  }
});

export const getProjects = cache(async () => {
  const cached = getCached<any[]>("public_projects");
  if (cached) return cached;

  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    let result = data ?? [];
    if (error || !data) {
      const admin = createAdminSupabase();
      const res = await admin
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      result = res.data ?? [];
    }
    if (result.length > 0) setCache("public_projects", result);
    return result;
  } catch {
    try {
      const admin = createAdminSupabase();
      const res = await admin
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      const fallback = res.data ?? [];
      if (fallback.length > 0) setCache("public_projects", fallback);
      return fallback;
    } catch {
      return [];
    }
  }
});

export const getEvents = cache(async () => {
  const cached = getCached<any[]>("public_events");
  if (cached) return cached;

  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: true });
    
    let list: any[] = [];
    if (error) {
      const admin = createAdminSupabase();
      const res = await admin
        .from("events")
        .select("*")
        .order("event_date", { ascending: true });
      list = res.data ?? [];
    } else {
      list = data ?? [];
    }

    const filtered = list.filter(
      (e: any) =>
        e.slug !== "test-event-2026" &&
        !e.title?.toLowerCase().includes("test event") &&
        !e.title?.toLowerCase().includes("dummy"),
    );

    if (filtered.length > 0) setCache("public_events", filtered);
    return filtered;
  } catch {
    try {
      const admin = createAdminSupabase();
      const res = await admin
        .from("events")
        .select("*")
        .order("event_date", { ascending: true });
      const list = res.data ?? [];
      const filtered = list.filter(
        (e: any) =>
          e.slug !== "test-event-2026" &&
          !e.title?.toLowerCase().includes("test event") &&
          !e.title?.toLowerCase().includes("dummy"),
      );
      if (filtered.length > 0) setCache("public_events", filtered);
      return filtered;
    } catch {
      return [];
    }
  }
});

export const getHierarchyMembers = cache(async () => {
  const cached = getCached<any[]>("hierarchy_members_51");
  if (cached) return cached;

  try {
    const admin = createAdminSupabase();
    const { data: profiles } = await admin
      .from("user_profiles")
      .select("id, email, full_name, assigned_to_name, avatar_url, drive_file_id, role, is_voided, github_url, official_email, roles:member_roles(team, position)")
      .order("created_at", { ascending: true });

    if (!profiles || profiles.length === 0) {
      return null;
    }

    // Map database profiles to hierarchy cards with volunteer as secondary
    const result = profiles.map((p) => {
      const rawRoles = Array.isArray(p.roles) ? (p.roles as any[]) : [];
      // Sort roles so non-volunteer is first (primary) and volunteer is last (secondary)
      const sortedRoles = [...rawRoles].sort((a, b) => {
        const isAVolunteer = a.position === "volunteer" || a.team === "volunteer_crew";
        const isBVolunteer = b.position === "volunteer" || b.team === "volunteer_crew";
        if (isAVolunteer && !isBVolunteer) return 1;
        if (!isAVolunteer && isBVolunteer) return -1;
        return 0;
      });

      const isPresident = p.role === "president" || (p.full_name && p.full_name.toLowerCase().includes("president") && !p.full_name.toLowerCase().includes("vice"));
      const isPanel = !isPresident && (p.role === "vice_president" || p.full_name?.toLowerCase().includes("secretary") || p.full_name?.toLowerCase().includes("coordinator") || p.role?.includes("panel"));
      const isLead = !isPresident && !isPanel && (p.role?.includes("lead") || p.full_name?.toLowerCase().includes("lead"));
      const tier = isPresident ? "president" : isPanel ? "panel" : isLead ? "lead" : "core";

      const primaryRoleObj = sortedRoles[0];
      const teamFormatted = primaryRoleObj?.team ? primaryRoleObj.team.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) : "Executive Panel";

      const hasVolunteer = sortedRoles.some((r) => r.position === "volunteer" || r.team === "volunteer_crew") || p.role === "volunteer";

      const rawAvatar = p.avatar_url || (p.drive_file_id ? `/api/drive/asset/${p.drive_file_id}` : null);
      const normalizedAvatar = normalizeDriveImageUrl(rawAvatar);

      const authenticEmail = (p.official_email || p.email || "")?.toLowerCase().trim();
      const memberDisplayName = p.assigned_to_name || p.full_name || "member";
      const validEmail = authenticEmail.endsWith("@vitbhopal.ac.in")
        ? authenticEmail
        : `${memberDisplayName.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, ".")}@vitbhopal.ac.in`;

      return {
        id: p.id,
        name: memberDisplayName,
        roleTitle: p.full_name,
        rawRole: p.role,
        primaryTeam: primaryRoleObj?.team || "",
        primaryPosition: primaryRoleObj?.position || "",
        secondaryRole: hasVolunteer ? "Volunteer / Event Scanner" : "General Operations",
        teamName: teamFormatted,
        email: validEmail,
        githubUrl: (p as any).github_url || null,
        tier: tier as "president" | "panel" | "lead" | "core",
        caption: `Contributing to ${teamFormatted} operations and community technical innovation.`,
        avatarUrl: normalizedAvatar || null,
      };
    });

    if (result && result.length > 0) {
      setCache("hierarchy_members_51", result);
    }
    return result;
  } catch {
    return null;
  }
});

