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
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

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
