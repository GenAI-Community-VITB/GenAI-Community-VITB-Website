import { requireStaffActionRole } from "@/lib/auth/permissions";
import { isCommunityExecutive } from "@/lib/auth/member-management";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { decryptTemporaryPassword, encryptTemporaryPassword } from "@/lib/security/temporary-password";
import { assertCanManageCommunityStaff } from "@/lib/auth/member-management-server";

export async function requireCredentialExecutive() {
  const actor = await requireStaffActionRole("volunteer");
  if (!isCommunityExecutive(actor.profile)) throw new Error("Only Supreme Council and explicitly assigned Top Executives can manage credentials across teams.");
  return actor;
}

export async function saveTemporaryPassword(userId: string, password: string, actorId: string) {
  const ciphertext = encryptTemporaryPassword(userId, password);
  const { error } = await createAdminSupabase().rpc("save_staff_temporary_credential", {
    p_user: userId, p_password: password, p_ciphertext: ciphertext, p_actor: actorId,
  });
  if (error) throw new Error("The account password changed, but the temporary copy could not be saved. Use Reset to issue and save a new one.");
}

export async function getTemporaryCredential(userId: string) {
  const { actor, target } = await assertCanManageCommunityStaff(userId);
  const db = createAdminSupabase();
  // Read the current login address from Auth, not a stale client/profile value.
  const auth = await db.auth.admin.getUserById(userId);
  if (auth.error || !auth.data.user?.email) throw new Error("The linked login account could not be loaded.");
  const { data, error } = await db.from("staff_temporary_credentials").select("ciphertext,created_at").eq("user_id", userId).maybeSingle();
  if (error) throw new Error("Temporary password could not be loaded. Please retry.");
  const password = data ? decryptTemporaryPassword(userId, data.ciphertext) : null;
  return { actor, target, email: auth.data.user.email, password };
}
