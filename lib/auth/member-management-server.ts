import { requireStaffActionRole, STAFF_PROFILE_FIELDS } from "@/lib/auth/permissions";
import { canAccessMemberDirectory, canManageMemberCredentials } from "@/lib/auth/member-management";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { UserProfile } from "@/lib/types";

export async function requireCommunityMemberActor() {
  const actor = await requireStaffActionRole("volunteer");
  if (!canAccessMemberDirectory(actor.profile)) throw new Error("Your account does not have member-management access.");
  return actor;
}
export async function assertCanManageCommunityStaff(userId: string) {
  const actor = await requireCommunityMemberActor();
  const { data, error } = await createAdminSupabase().from("user_profiles").select(STAFF_PROFILE_FIELDS).eq("id", userId).single();
  if (error || !data) throw new Error("Staff account not found.");
  const target = data as UserProfile;
  if (!canManageMemberCredentials(actor.profile, target)) throw new Error("You may manage passwords and accounts only within your team scope. Executive accounts require council authorization.");
  return { actor, target };
}
