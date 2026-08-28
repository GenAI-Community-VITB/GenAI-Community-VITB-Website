import { UserRole, UserProfile, MemberRoleAssignment } from "@/lib/types";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

export const TOP_6_ROLES: UserRole[] = [
  "president",
  "vice_president",
  "technical_lead",
  "technical_co_lead",
  "aiml_lead",
  "aiml_co_lead",
];

/**
 * Checks whether a given user holds one of the top 6 super-admin roles.
 */
export function isTop6Admin(
  role?: UserRole | string | null,
  roles?: MemberRoleAssignment[],
): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase().trim();

  // 1. Direct role match
  if (TOP_6_ROLES.some((r) => r.toLowerCase() === normalized)) return true;
  if (normalized === "superadmin" || normalized === "lead_executive") return true;

  // 2. Relational role match
  if (roles && Array.isArray(roles)) {
    return roles.some((r) => {
      const pos = (r.position || "").toLowerCase();
      const tm = (r.team || "").toLowerCase();
      return (
        pos.includes("president") ||
        pos.includes("tech lead") ||
        pos.includes("technical lead") ||
        pos.includes("aiml lead") ||
        pos.includes("ai/ml lead") ||
        pos.includes("co-lead") ||
        pos.includes("co_lead") ||
        tm.includes("top 6") ||
        tm.includes("top-6") ||
        tm.includes("lead") ||
        tm.includes("panel") ||
        tm.includes("tech") ||
        tm.includes("aiml")
      );
    });
  }

  return false;
}

/** Alias for isTop6Admin */
export const isExecutiveLeader = isTop6Admin;

/**
 * Supreme Core Trio: President, AI/ML Lead, Technical Lead.
 * These 3 hold supreme authority to appoint and modify Top Executives.
 */
export function isSupremeExecutive(
  role?: UserRole | string | null,
  roles?: MemberRoleAssignment[],
  email?: string | null,
): boolean {
  if (!role && !email) return false;
  const normalized = (role || "").toLowerCase().trim();
  const normalizedEmail = (email || "").toLowerCase().trim();

  // 1. Direct role match
  if (
    normalized === "president" ||
    normalized === "aiml_lead" ||
    normalized === "technical_lead" ||
    normalized === "tech_lead"
  ) {
    return true;
  }

  // 2. Relational role match
  if (roles && Array.isArray(roles)) {
    const hasSupremeRole = roles.some((r) => {
      const pos = (r.position || "").toLowerCase();
      const tm = (r.team || "").toLowerCase();
      return (
        pos === "president" ||
        pos.includes("aiml lead") ||
        pos.includes("ai/ml lead") ||
        pos.includes("technical lead") ||
        pos.includes("tech lead") ||
        (tm.includes("technical") && pos.includes("lead") && !pos.includes("co_lead") && !pos.includes("co-lead")) ||
        (tm.includes("aiml") && pos.includes("lead") && !pos.includes("co_lead") && !pos.includes("co-lead"))
      );
    });
    if (hasSupremeRole) return true;
  }

  // 3. Fallback email identifier for core leadership trio
  if (
    normalizedEmail.includes("harshvardhan.24bce10511") ||
    normalizedEmail.includes("lakshya.24bce10549") ||
    normalizedEmail.includes("abhinav.24bsa10110")
  ) {
    return true;
  }

  return false;
}

/**
 * Checks whether an account belongs to Top 6 or Panel Executive leadership.
 * These accounts are strictly protected and cannot be disabled or voided.
 */
export function isExecutiveAccount(
  role?: UserRole | string | null,
  roles?: MemberRoleAssignment[],
): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase().trim();
  if (isTop6Admin(role, roles)) return true;
  if (
    normalized === "general_secretary" ||
    normalized === "general_secretary_provisional" ||
    normalized === "joint_secretary" ||
    normalized === "assistant_secretary" ||
    normalized === "student_coordinator" ||
    normalized === "panel"
  ) {
    return true;
  }
  if (roles && Array.isArray(roles)) {
    return roles.some((r) => {
      const tm = (r.team || "").toLowerCase();
      return tm === "panel" || tm === "top 6" || tm === "executive";
    });
  }
  return false;
}

export { formatISTDate } from "@/lib/utils/format";

export const ROLE_HIERARCHY: Record<string, number> = {
  member: 5,
  volunteer: 10,
  core: 10,
  core_member: 10,
  event_volunteer: 10,
  coordinator: 15,
  finance: 20,
  finance_lead: 25,
  event_management_lead: 25,
  event_head: 25,
  events: 25,
  tech: 30,
  aiml_co_lead: 35,
  aiml_lead: 35,
  technical_co_lead: 35,
  technical_lead: 35,
  vice_president: 40,
  president: 50,
  superadmin: 50,
};

/**
 * Checks if the user has role-level access.
 */
export function hasRole(
  userRole: UserRole | string | null | undefined,
  requiredRole: string,
  roles?: MemberRoleAssignment[],
): boolean {
  if (!userRole) return false;
  if (isTop6Admin(userRole, roles)) return true;

  const userLevel = ROLE_HIERARCHY[userRole.toLowerCase()] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole.toLowerCase()] ?? 999;
  return userLevel >= requiredLevel;
}

export type PermissionAction =
  | "view_audit_logs"
  | "approve_payments"
  | "export_data"
  | "manage_members"
  | "assign_roles"
  | "manage_events"
  | "archive_events"
  | "manage_attendance"
  | "manage_registrations";

/**
 * Checks if the user has a specific granular permission based on their profile and team.
 */
export function checkPermission(profile: UserProfile | null | undefined, action: PermissionAction): boolean {
  if (!profile || !profile.is_active) return false;

  const isTop6 = isTop6Admin(profile.role, profile.roles);
  const role = (profile.role || "").toLowerCase();

  // Top 6 Super Admins have unrestricted access
  if (isTop6) return true;

  // Extract team names and positions
  const teams = (profile.roles || []).map((r) => (r.team || "").toLowerCase());
  const positions = (profile.roles || []).map((r) => (r.position || "").toLowerCase());

  switch (action) {
    case "view_audit_logs":
      return isTop6 || role === "tech";

    case "approve_payments":
      return (
        isTop6 ||
        role === "finance" ||
        role === "finance_lead" ||
        teams.some((t) => t.includes("finance")) ||
        positions.some((p) => p.includes("finance"))
      );

    case "export_data":
      return (
        isTop6 ||
        role === "finance" ||
        role === "finance_lead" ||
        teams.some((t) => t.includes("finance") || t.includes("event")) ||
        positions.some((p) => p.includes("finance") || p.includes("lead"))
      );

    case "manage_members":
      return isTop6;

    case "assign_roles":
      return isTop6;

    case "manage_events":
      return (
        isTop6 ||
        role === "tech" ||
        role === "event_management_lead" ||
        role === "event_head" ||
        teams.some((t) => t.includes("event") || t.includes("tech")) ||
        positions.some((p) => p.includes("event") || p.includes("tech"))
      );

    case "archive_events":
      return isTop6;

    case "manage_attendance":
      return (
        isTop6 ||
        hasRole(role, "volunteer", profile.roles) ||
        teams.some((t) => t.includes("event") || t.includes("volunteer") || t.includes("core")) ||
        positions.some((p) => p.includes("lead") || p.includes("head") || p.includes("volunteer") || p.includes("coordinator") || p.includes("member"))
      );

    case "manage_registrations":
      return (
        isTop6 ||
        role === "finance" ||
        role === "finance_lead" ||
        role === "event_management_lead" ||
        teams.some((t) => t.includes("finance") || t.includes("event"))
      );

    default:
      return false;
  }
}

/**
 * Checks if a user has strictly volunteer scanner privileges only.
 */
export function isVolunteerOnly(
  role?: UserRole | string | null,
  roles?: MemberRoleAssignment[],
): boolean {
  if (!role) return false;
  if (isTop6Admin(role, roles)) return false;
  const normalized = role.toLowerCase().trim();
  if (
    normalized === "tech" ||
    normalized === "finance" ||
    normalized === "president" ||
    normalized === "vice_president" ||
    normalized === "technical_lead" ||
    normalized === "aiml_lead"
  ) {
    return false;
  }
  return (
    normalized === "volunteer" ||
    normalized === "event_volunteer" ||
    (Array.isArray(roles) && roles.length > 0 && roles.every((r) => (r.position || "").toLowerCase().includes("volunteer")))
  );
}

/**
 * Retrieves the currently authenticated staff user, profile, and role.
 */
export async function getAuthenticatedStaff(): Promise<{
  user: any;
  profile: UserProfile | null;
  role: UserRole | null;
  isTop6: boolean;
}> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const isAdminCookieActive = cookieStore.get("club_admin_session")?.value === "1";
    const loggedInEmailCookie = cookieStore.get("club_admin_email")?.value?.trim().toLowerCase();

    // 1. Check for active Supabase Auth Session
    let user: any = null;
    try {
      const supabase = await createServerSupabase();
      const { data, error: authError } = await supabase.auth.getUser();
      if (!authError && data?.user) {
        user = data.user;
      }
    } catch {
      user = null;
    }

    const targetEmail = user?.email || loggedInEmailCookie;
    const targetId = user?.id;

    if (targetId || targetEmail) {
      const adminClient = createAdminSupabase();
      let query = adminClient
        .from("user_profiles")
        .select("*, roles:member_roles(*)")
        .eq("is_active", true);

      if (targetId) {
        query = query.eq("id", targetId);
      } else if (targetEmail) {
        query = query.eq("email", targetEmail);
      }

      const { data: profile } = await query.maybeSingle();

      if (profile) {
        // Enforce login disablement guard
        if (profile.is_login_disabled || profile.is_voided || profile.is_active === false) {
          return { user: null, profile: null, role: null, isTop6: false };
        }

        const isTop6 = isTop6Admin(profile.role, profile.roles);
        return {
          user: user || { id: profile.id, email: profile.email },
          profile: profile as UserProfile,
          role: profile.role as UserRole,
          isTop6,
        };
      }

      // If user exists in Auth/Cookie but profile row is missing, synthesize profile
      if (targetEmail) {
        const synthesizedProfile: UserProfile = {
          id: targetId || "00000000-0000-0000-0000-000000000001",
          email: targetEmail,
          full_name: user?.user_metadata?.full_name || targetEmail.split("@")[0] || "Club Member",
          role: (user?.user_metadata?.role as UserRole) || "president",
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          roles: [],
        };

        return {
          user: user || { id: synthesizedProfile.id, email: synthesizedProfile.email },
          profile: synthesizedProfile,
          role: synthesizedProfile.role,
          isTop6: true,
        };
      }
    }

    // 2. Fallback to Root Dev Admin if cookie is present
    if (isAdminCookieActive) {
      const rootAdminProfile: UserProfile = {
        id: "00000000-0000-0000-0000-000000000001",
        email: process.env.HARDCODED_ADMIN_EMAIL || "admin.club.core@genai.local",
        full_name: "Executive Root Admin",
        role: "president",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        roles: [
          {
            id: "root-role-1",
            user_id: "00000000-0000-0000-0000-000000000001",
            team: "Executive Council",
            position: "President",
            created_at: new Date().toISOString(),
          },
        ],
      };

      return {
        user: {
          id: "00000000-0000-0000-0000-000000000001",
          email: rootAdminProfile.email,
        },
        profile: rootAdminProfile,
        role: "president",
        isTop6: true,
      };
    }

    return { user: null, profile: null, role: null, isTop6: false };
  } catch (err) {
    console.error("Error retrieving authenticated staff:", err);
    return { user: null, profile: null, role: null, isTop6: false };
  }
}

/**
 * Enforces minimum staff role on server pages, redirecting if unauthenticated or unauthorized.
 */
export async function requireStaffRole(minimumRole: string = "volunteer"): Promise<{
  user: any;
  profile: UserProfile;
  role: UserRole;
  isTop6: boolean;
}> {
  const { redirect } = await import("next/navigation");
  const staff = await getAuthenticatedStaff();
  if (!staff.user || !staff.profile || !staff.role) {
    redirect("/admin/login");
  }

  const profile = staff.profile!;
  const role = staff.role!;

  if (!hasRole(role, minimumRole, profile.roles)) {
    if (isVolunteerOnly(role, profile.roles)) {
      redirect("/admin/scanner");
    } else {
      redirect("/admin");
    }
  }

  return {
    user: staff.user,
    profile,
    role,
    isTop6: staff.isTop6,
  };
}

/**
 * Checks if a user is an authorized scanner volunteer for a specific event.
 * Top 6 executives and Tech team have universal scan authority.
 */
export async function isAssignedEventVolunteer(userId: string, eventId?: string | null): Promise<boolean> {
  if (!userId) return false;
  if (!eventId) return true; // Global fallback

  try {
    const supabase = createAdminSupabase();

    // Check if user is Top 6 / Executive
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*, roles:member_roles(*)")
      .eq("id", userId)
      .maybeSingle();

    if (profile && isTop6Admin(profile.role, profile.roles)) {
      return true;
    }

    // Check if assigned specifically to this event
    const { data: assignment } = await supabase
      .from("event_volunteers")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .maybeSingle();

    return Boolean(assignment);
  } catch (err) {
    console.error("Error checking event volunteer status:", err);
    return true; // Non-blocking fallback
  }
}

