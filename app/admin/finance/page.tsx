import { requireStaffRole } from "@/lib/auth/permissions";
import { getFinanceRegistrations, getDeletedRegistrations } from "@/lib/data/registrations";
import { getActiveBranches } from "@/lib/data/events";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { FinanceQueue } from "@/components/admin/finance-queue";
import { ChangePasswordButton } from "@/components/admin/change-password-modal";
import { ArrowLeft, CreditCard } from "lucide-react";
import { Exec6Notifications } from "@/components/admin/exec6-notifications";
import { AdminInactivityChip } from "@/components/admin/inactivity-timer";
import Link from "next/link";
import { Event } from "@/lib/types";

export const revalidate = 0;

export default async function FinancePage({searchParams}: {searchParams: Promise<{eventId?:string}>}) {
  const { user, profile, role, isTop6 } = await requireStaffRole("finance");
  const supabase = createAdminSupabase();
  const selectedId=(await searchParams).eventId;
  const eventList=await supabase.from("events").select("*").order("event_date",{ascending:false});
  if(eventList.error) throw new Error(eventList.error.message);
  const options=eventList.data || [];
  const selected=selectedId ? options.find(e=>e.id===selectedId) : options.find(e=>e.status==="live") || options.find(e=>e.status==="upcoming") || options[0];
  if(selectedId && !selected) throw new Error("Selected event not found.");


  const [registrations, branches, { data: activeEvent }, deletedRegistrations] = await Promise.all([
    selected ? getFinanceRegistrations(selected.id) : Promise.resolve([]),
    getActiveBranches(),
    Promise.resolve({data:selected}),
    selected ? getDeletedRegistrations(selected.id) : Promise.resolve([]),
  ]);

  const branchNames = branches.map((b) => b.name);

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
              <CreditCard className="h-5 w-5 text-[#f5b642]" />
              Registration & Finance Operations
            </h1>
            <p className="text-xs text-zinc-400">
              Review transaction proofs, approve payments to issue QR passes, manage participants, or create on-spot registrations.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <AdminInactivityChip />
            <Exec6Notifications isTop6={isTop6} />
            <ChangePasswordButton />
            <div className="flex items-center gap-2 rounded-2xl border border-[#2e2618] bg-[#14110b] px-4 py-2 text-xs text-zinc-300">
              <span className="font-mono text-zinc-400">Verifier:</span>
              <strong className="text-white">{profile.full_name || user.email}</strong>
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 uppercase">
                {role}
              </span>
            </div>
          </div>
        </div>
      </div>

      <main className="container-wrap py-8">
        <form method="get" className="mb-6 flex gap-3 items-center">
          <label htmlFor="event-selector">Event</label>
          <select id="event-selector" name="eventId" defaultValue={selected?.id} className="rounded bg-zinc-900 p-2 border border-zinc-700">
            {options.map(e=><option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
          <button type="submit" className="rounded bg-amber-500 px-4 py-2 text-black">Open</button>
        </form>
        <FinanceQueue key={selected?.id}
          initialRegistrations={registrations}
          initialDeletedRegistrations={deletedRegistrations}
          currentUserRole={role}
          branches={branchNames}
          branchObjects={branches}
          activeEvent={(activeEvent as Event) || null}
          isTop6={isTop6}
        />
      </main>
    </div>
  );
}
