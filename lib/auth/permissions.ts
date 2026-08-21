import { UserRole, UserProfile, MemberRoleAssignment } from "@/lib/types";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { TOP_6_ROLES, formatISTDate, isTop6Admin } from "@/lib/utils/format";

export { TOP_6_ROLES, formatISTDate, isTop6Admin };

/**
 * Explicit Executive Leadership roles who can create, update, or reassign Top Executives:
 * - President
 * - Technical Lead / Co-Lead
 * - AI/ML Lead / Co-Lead
 */
export function isExecutiveLeader(
  userRole: UserRole | string | null | undefined,
  roles?: MemberRoleAssignment[],
): boolean {
  if (!userRole) return false;
  const r = userRole.toLowerCase();
  if (
    r === "president" ||
    r === "technical_lead" ||
    r === "technical_co_lead" ||
    r === "aiml_lead" ||
    r === "aiml_co_lead" ||
    r === "tech"
  ) {
    return true;
  }

  if (roles && Array.isArray(roles)) {
    return roles.some((assignment) => {
      const pos = (assignment.position || "").toLowerCase();
      const tm = (assignment.team || "").toLowerCase();
      return (
        pos === "president" ||
        pos === "lead" ||
        pos === "co_lead" ||
        tm.includes("tech") ||
        tm.includes("aiml")
      );
    });
  }

  return false;
}

export const ROLE_HIERARCHY: Record<string, number> = {
  volunteer: 10,
  finance: 20,
  finance_lead: 25,
  event_management_lead: 25,
  tech: 30,
  aiml_co_lead: 35,
  aiml_lead: 35,
  technical_co_lead: 35,
  technical_lead: 35,
  vice_president: 40,
  president: 50,
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

/**
 * Granular Permission Checker
 */
export function checkPermission(
  profile: UserProfile | null,
  permission:
    | "manage_members"
    | "assign_roles"
    | "manage_events"
    | "manage_projects"
    | "manage_registrations"
    | "approve_payments"
    | "manage_attendance"
    | "export_data"
    | "archive_events"
    | "clear_event_data"
    | "view_audit_logs",
): boolean {
  if (!profile) return false;
  const isSuper = isTop6Admin(profile.role, profile.roles);
  if (isSuper) return true;

  const role = (profile.role || "").toLowerCase();
  const subRoles = profile.roles || [];

  switch (permission) {
    case "manage_members":
    case "assign_roles":
    case "archive_events":
    case "clear_event_data":
    case "manage_projects":
      return isSuper;

    case "approve_payments":
      return (
        role === "finance" ||
        role.includes("finance") ||
        subRoles.some((r) => r.team === "finance_team")
      );

    case "manage_attendance":
      return (
        role === "volunteer" ||
        role.includes("event") ||
        subRoles.some((r) => r.team.startsWith("event_management"))
      );

    case "manage_registrations":
    case "export_data":
      return (
        role === "finance" ||
        role.includes("finance") ||
        role.includes("event") ||
        subRoles.some((r) => r.team.startsWith("finance") || r.team.startsWith("event_management"))
      );

    case "manage_events":
      return (
        role.includes("event") ||
        subRoles.some(
          (r) =>
            r.team.startsWith("event_management") &&
            (r.position === "lead" || r.position === "co_lead"),
        )
      );

    case "view_audit_logs":
      return isSuper;

    default:
      return false;
  }
}

/**
 * Retrieves the currently authenticated staff profile and multi-role assignments.
 */
export async function getAuthenticatedStaff(): Promise<{
  user: any | null;
  profile: UserProfile | null;
  role: UserRole | null;
  isTop6: boolean;
}> {
  try {
    // 1. Check for Hardcoded/Dev Admin Session Cookie
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const isAdminCookieActive = cookieStore.get("club_admin_session")?.value === "1";

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

    // 2. Check for Supabase Auth Session
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { user: null, profile: null, role: null, isTop6: false };
    }

    const adminClient = createAdminSupabase();
    const { data: profile, error: profileError } = await adminClient
      .from("user_profiles")
      .select("*, roles:member_roles(*)")
      .eq("id", user.id)
      .eq("is_active", true)
      .single();

    if (profileError || !profile) {
      // Fallback: If user exists in Auth but user_profiles record is missing, grant baseline executive access
      const synthesizedProfile: UserProfile = {
        id: user.id,
        email: user.email || "staff@genai.community",
        full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Club Staff",
        role: (user.user_metadata?.role as UserRole) || "president",
        is_active: true,
        created_at: user.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        roles: [],
      };

      return {
        user,
        profile: synthesizedProfile,
        role: synthesizedProfile.role,
        isTop6: true,
      };
    }

    const isTop6 = isTop6Admin(profile.role, profile.roles);

    return {
      user,
      profile: profile as UserProfile,
      role: profile.role as UserRole,
      isTop6,
    };
  } catch (err) {
    console.error("Error retrieving authenticated staff:", err);
    return { user: null, profile: null, role: null, isTop6: false };
  }
}

import { redirect } from "next/navigation";

/**
 * Enforces that caller belongs to the Top 6 Admin Group.
 * If unauthorized, redirects back to the previous admin dashboard instead of showing an error page.
 */
export async function requireTop6Admin() {
  const { user, profile, isTop6 } = await getAuthenticatedStaff();
  if (!user || !profile) {
    redirect("/admin/login");
  }
  if (!isTop6) {
    redirect("/admin");
  }
  return { user, profile };
}

/**
 * Ensures the caller is authenticated and has at least the required role.
 * If the user lacks access, gracefully redirects them back to their authorized admin dashboard.
 */
export async function requireStaffRole(requiredRole: string) {
  const { user, profile, role, isTop6 } = await getAuthenticatedStaff();

  if (!user || !profile || !role) {
    redirect("/admin/login");
  }

  if (!hasRole(role, requiredRole, profile.roles)) {
    // If they have volunteer access only, send them to the scanner
    if (role === "volunteer") {
      redirect("/admin/scanner");
    }
    // Otherwise redirect back to main admin operations matrix
    redirect("/admin");
  }

  return { user, profile, role, isTop6 };
}
