import { requireStaffRole, isSupremeExecutive } from "@/lib/auth/permissions";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { UserManagement } from "@/components/admin/user-management";
import { ChangePasswordButton } from "@/components/admin/change-password-modal";
import { UserProfile } from "@/lib/types";
import { ArrowLeft, Users, ShieldCheck } from "lucide-react";
import { Exec6Notifications } from "@/components/admin/exec6-notifications";
import { AdminInactivityChip } from "@/components/admin/inactivity-timer";
import Link from "next/link";

export const revalidate = 0;

export default async function UsersPage() {
  const { user, profile, role, isTop6 } = await requireStaffRole("tech");
  const supabase = createAdminSupabase();

  const { data: users, error } = await supabase
    .from("user_profiles")
    .select("*, roles:member_roles(*)")
    .order("created_at", { ascending: false });

  const isSupreme = isSupremeExecutive(role, profile.roles, profile.email || user.email);

  return (
    <div style={{ zoom: "115%" }} className="min-h-screen bg-[#070707] text-white">
      {/* Top Command Center Header */}
      <div className="border-b border-[#221c12] bg-[#0c0a08]/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#f5b642] hover:text-[#ffd06a] transition mb-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Operations Matrix
            </Link>
            <h1 className="text-xl font-extrabold text-white sm:text-2xl tracking-tight flex items-center gap-2">
              <Users className="h-5 w-5 text-[#f5b642]" />
              Community Members Management
            </h1>
            <p className="text-xs text-zinc-400">
              Manage member accounts, executive hierarchy, dynamic multi-team assignments, and secure password provisioning.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <AdminInactivityChip />
            <Exec6Notifications isTop6={isTop6} />
            <ChangePasswordButton />
            <div className="flex items-center gap-2 rounded-2xl border border-[#2e2618] bg-[#14110b] px-4 py-2 text-xs text-zinc-300">
              <span className="font-mono text-zinc-400">Admin:</span>
              <strong className="text-white">{profile.full_name || user.email}</strong>
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 uppercase">
                {role}
              </span>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <UserManagement
          users={(users as UserProfile[]) || []}
          currentUserId={user.id}
          currentUserRole={role}
          currentUserEmail={profile.email || user.email}
          isSupremeLeader={isSupreme}
        />
      </main>
    </div>
  );
}
