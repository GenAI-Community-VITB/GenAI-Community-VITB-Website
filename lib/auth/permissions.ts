import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { UserProfile } from "@/lib/types";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { hasRole, isTop6Admin, isTeamLoginAllowed, isSupremeExecutive, isExecutiveAccount } from "./roles";
export * from "./roles";
export { formatISTDate } from "@/lib/utils/format";

export const STAFF_PROFILE_FIELDS = "id,email,full_name,assigned_to_name,avatar_url,drive_file_id,role,is_active,is_login_disabled,is_voided,github_url,created_at,updated_at,roles:member_roles(*)";
const denied = { user: null, profile: null, role: null, isTop6: false };
export async function getAuthenticatedStaff() {
  try {
    const client = await createServerSupabase();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return denied;
    const db = createAdminSupabase();
    const { data, error } = await db.from("user_profiles").select(STAFF_PROFILE_FIELDS).eq("id", user.id).maybeSingle();
    const profile = data as UserProfile | null;
    if (error || !profile?.is_active || profile.is_voided || profile.is_login_disabled) return denied;
    if (!isTeamLoginAllowed(profile.role, profile.roles)) {
      const { data: assignments, error: assignmentError } = await db.from("event_volunteers").select("id").eq("user_id", user.id).limit(1);
      if (assignmentError || !assignments?.length) return denied;
    }
    return { user, profile, role: profile.role, isTop6: isTop6Admin(profile.role, profile.roles) };
  } catch { return denied; }
}
export async function requireStaffActionRole(minimumRole = "volunteer"): Promise<{user: User; profile: UserProfile; role: UserProfile["role"]; isTop6: boolean}> {
  const staff = await getAuthenticatedStaff();
  if (!staff.user || !staff.profile || !staff.role) throw new Error("Unauthorized: Please sign in with an enabled staff account.");
  if (minimumRole !== "volunteer" && !hasRole(staff.role, minimumRole, staff.profile.roles)) throw new Error("Forbidden: Your account does not have permission for this operation.");
  return { ...staff, user: staff.user, profile: staff.profile, role: staff.role };
}
export async function requireStaffRole(minimumRole = "volunteer"): Promise<{user: User; profile: UserProfile; role: UserProfile["role"]; isTop6: boolean}> {

  const staff = await getAuthenticatedStaff();
  if (!staff.user || !staff.profile || !staff.role) redirect("/admin/login");
  if (minimumRole !== "volunteer" && !hasRole(staff.role, minimumRole, staff.profile.roles)) redirect("/admin");
  return { ...staff, user: staff.user, profile: staff.profile, role: staff.role };
}
export async function assertCanManageStaff(targetId: string) {
  const actor = await requireStaffActionRole("tech");
  const { data: target, error } = await createAdminSupabase().from("user_profiles").select(STAFF_PROFILE_FIELDS).eq("id", targetId).single();
  if (error || !target) throw new Error("Staff account not found.");
  if (target.role === "superadmin" && actor.role !== "superadmin") throw new Error("Only a system administrator may modify this account.");
  if (isExecutiveAccount(target.role, target.roles) && !isSupremeExecutive(actor.role, actor.profile.roles)) throw new Error("Only supreme executives may modify this account.");
  return { actor, target: target as UserProfile };
}
export async function isAssignedEventVolunteer(userId: string, eventId?: string | null) {
  if (!userId || !eventId) return false;
  try {
    const db = createAdminSupabase();
    const { data: profile, error } = await db.from("user_profiles").select(STAFF_PROFILE_FIELDS).eq("id", userId).single();
    if (error || !profile?.is_active || profile.is_login_disabled || profile.is_voided) return false;
    if (hasRole(profile.role, "tech", profile.roles)) return true;
    const { data, error: assignmentError } = await db.from("event_volunteers").select("id").eq("event_id", eventId).eq("user_id", userId).maybeSingle();
    return !assignmentError && !!data;
  } catch { return false; }
}
