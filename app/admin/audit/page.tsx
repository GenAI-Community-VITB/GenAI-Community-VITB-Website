import { requireStaffRole } from "@/lib/auth/permissions";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { AuditLogViewer } from "@/components/admin/audit-log-viewer";
import { SheetsSyncWidget } from "@/components/admin/sheets-sync-widget";
import { ChangePasswordButton } from "@/components/admin/change-password-modal";
import { AdminInactivityChip } from "@/components/admin/inactivity-timer";
import { AuditLog } from "@/lib/types";
import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";

export const revalidate = 0;

export default async function AuditLogsPage() {
  const { user, profile, role } = await requireStaffRole("tech");
  const supabase = createAdminSupabase();

  const { data: logs } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div style={{ zoom: "115%" }} className="min-h-screen bg-[#070707] text-white">
      {/* Top Command Center Header */}
      <div className="border-b border-[#221c12] bg-[#0c0a08]/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="container-wrap flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#f5b642] hover:text-[#ffd06a] transition mb-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Operations Matrix
            </Link>
            <h1 className="text-xl font-extrabold text-white sm:text-2xl tracking-tight flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-400" />
              Security & Audit Trail
            </h1>
            <p className="text-xs text-zinc-400">
              Immutable historical record of all administrative transactions, role updates, and system operations.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <AdminInactivityChip />
            <ChangePasswordButton />
            <div className="flex items-center gap-2 rounded-2xl border border-[#2e2618] bg-[#14110b] px-4 py-2 text-xs text-zinc-300">
              <span className="font-mono text-zinc-400">Admin:</span>
              <strong className="text-white">{profile.full_name || user.email}</strong>
              <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300 uppercase">
                {role}
              </span>
            </div>
          </div>
        </div>
      </div>

      <main className="container-wrap py-8 space-y-8">
        {/* 1-Click Google Sheets Auto-Init & Sync Engine */}
        <SheetsSyncWidget />

        {/* Audit Log Table */}
        <AuditLogViewer logs={(logs as AuditLog[]) || []} />
      </main>
    </div>
  );
}
