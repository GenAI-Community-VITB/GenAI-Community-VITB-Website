import { requireStaffRole } from "@/lib/auth/permissions";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { EventSettingsForm } from "@/components/admin/event-settings-form";
import { ChangePasswordButton } from "@/components/admin/change-password-modal";
import { Event } from "@/lib/types";
import { getLiveEventStatistics } from "@/lib/data/registrations";
import { ArrowLeft, Settings } from "lucide-react";
import { Exec6Notifications } from "@/components/admin/exec6-notifications";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 0;

export default async function AdminEventsSettingsPage() {
  const { user, profile, role, isTop6 } = await requireStaffRole("tech");
  const supabase = createAdminSupabase();

  // Find active or latest event
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .order("event_date", { ascending: true })
    .limit(1)
    .single();

  if (!event) {
    notFound();
  }

  const stats = await getLiveEventStatistics(event.id);

  return (
    <div className="min-h-screen bg-[#070707] text-white">
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
              <Settings className="h-5 w-5 text-[#f5b642]" />
              Event Operations & Lifecycle
            </h1>
            <p className="text-xs text-zinc-400">
              Manage registration status, capacities, timelines, and payment verification.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Exec6Notifications isTop6={isTop6} />
            <ChangePasswordButton />
            <div className="flex items-center gap-2 rounded-2xl border border-[#2e2618] bg-[#14110b] px-4 py-2 text-xs text-zinc-300">
              <span className="font-mono text-zinc-400">Admin:</span>
              <strong className="text-white">{profile.full_name || user.email}</strong>
              <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold text-sky-300 uppercase">
                {role}
              </span>
            </div>
          </div>
        </div>
      </div>

      <main className="container-wrap py-8">
        <EventSettingsForm
          event={event as Event}
          statistics={stats}
          isTop6={isTop6}
        />
      </main>
    </div>
  );
}
