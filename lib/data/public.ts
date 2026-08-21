import { cache } from "react";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const getTeamsWithMembers = cache(async () => {
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("teams")
      .select("*, members(*)")
      .order("created_at", { ascending: true });

    if (error) {
      const admin = createAdminSupabase();
      const res = await admin
        .from("teams")
        .select("*, members(*)")
        .order("created_at", { ascending: true });
      return res.data ?? [];
    }
    return data ?? [];
  } catch {
    try {
      const admin = createAdminSupabase();
      const res = await admin
        .from("teams")
        .select("*, members(*)")
        .order("created_at", { ascending: true });
      return res.data ?? [];
    } catch {
      return [];
    }
  }
});

export const getProjects = cache(async () => {
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    if (error || !data) {
      const admin = createAdminSupabase();
      const res = await admin
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      return res.data ?? [];
    }
    return data;
  } catch {
    try {
      const admin = createAdminSupabase();
      const res = await admin
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      return res.data ?? [];
    } catch {
      return [];
    }
  }
});

export const getEvents = cache(async () => {
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: true });
    if (error) {
      const admin = createAdminSupabase();
      const res = await admin
        .from("events")
        .select("*")
        .order("event_date", { ascending: true });
      return res.data ?? [];
    }
    return data ?? [];
  } catch {
    try {
      const admin = createAdminSupabase();
      const res = await admin
        .from("events")
        .select("*")
        .order("event_date", { ascending: true });
      return res.data ?? [];
    } catch {
      return [];
    }
  }
});

export const getHierarchyMembers = cache(async () => {
  try {
    const admin = createAdminSupabase();
    const { data: profiles } = await admin
      .from("user_profiles")
      .select("id, email, full_name, assigned_to_name, avatar_url, role, is_voided, roles:member_roles(team, position)")
      .eq("is_active", true)
      .eq("is_voided", false);

    if (!profiles || profiles.length === 0) {
      return null;
    }

    // Map database profiles to hierarchy cards with volunteer as secondary
    return profiles.map((p) => {
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
      const isPanel = !isPresident && (p.role === "vice_president" || p.full_name?.toLowerCase().includes("secretary") || p.full_name?.toLowerCase().includes("coordinator") || p.role.includes("panel"));
      const isLead = !isPresident && !isPanel && (p.role.includes("lead") || p.full_name?.toLowerCase().includes("lead"));
      const tier = isPresident ? "president" : isPanel ? "panel" : isLead ? "lead" : "core";

      const primaryRoleObj = sortedRoles[0];
      const teamFormatted = primaryRoleObj?.team ? primaryRoleObj.team.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) : "Executive Panel";

      const hasVolunteer = sortedRoles.some((r) => r.position === "volunteer" || r.team === "volunteer_crew") || p.role === "volunteer";

      return {
        name: p.assigned_to_name || p.full_name,
        roleTitle: p.full_name,
        secondaryRole: hasVolunteer ? "Volunteer / Event Scanner" : "General Operations",
        teamName: teamFormatted,
        email: p.email,
        tier: tier as "president" | "panel" | "lead" | "core",
        caption: `Contributing to ${teamFormatted} operations and community technical innovation.`,
        avatarUrl: p.avatar_url || null,
      };
    });
  } catch {
    return null;
  }
});

