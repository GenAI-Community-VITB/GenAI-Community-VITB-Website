"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { UserProfile, Event } from "@/lib/types";
import {
  getEventVolunteersAction,
  assignEventVolunteerAction,
  removeEventVolunteerAction,
  getAllStaffMembersAction,
} from "@/app/admin/events-actions";
import {
  Users,
  ShieldCheck,
  UserPlus,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  X,
  Sparkles,
} from "lucide-react";
import { useScrollLock } from "@/lib/utils/scroll-lock";

interface EventVolunteersModalProps {
  event: Event;
  allMembers?: UserProfile[];
  onClose: () => void;
}

export function EventVolunteersModal({
  event,
  allMembers = [],
  onClose,
}: EventVolunteersModalProps) {
  useScrollLock(true);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [memberList, setMemberList] = useState<UserProfile[]>(allMembers);
  const [loading, setLoading] = useState(true);
  const [searchMember, setSearchMember] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadVolunteersAndMembers = useCallback(async () => {
    setLoading(true);
    try {
      const [volRes, memRes] = await Promise.all([
        getEventVolunteersAction(event.id),
        getAllStaffMembersAction(),
      ]);

      if (volRes.success) {
        setVolunteers(volRes.volunteers || []);
      }
      if (memRes.success && memRes.members && memRes.members.length > 0) {
        setMemberList(memRes.members);
      }
    } catch (err: any) {
      console.error("Failed to load volunteers and members:", err);
    } finally {
      setLoading(false);
    }
  }, [event.id]);

  useEffect(() => {
    loadVolunteersAndMembers();
  }, [loadVolunteersAndMembers]);

  const assignedUserIds = new Set(volunteers.map((v) => v.user_id));

  const eligibleMembers = memberList.filter((m) => {
    if (assignedUserIds.has(m.id)) return false;
    const search = searchMember.trim().toLowerCase();
    if (!search) return true;
    const nameMatch = (m.assigned_to_name || m.full_name || "").toLowerCase().includes(search);
    const emailMatch = (m.email || "").toLowerCase().includes(search);
    const roleMatch = (m.role || "").toLowerCase().includes(search);
    return nameMatch || emailMatch || roleMatch;
  });

  function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserId) return;
    setFeedback(null);

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("event_id", event.id);
        fd.append("user_id", selectedUserId);

        const res = await assignEventVolunteerAction(fd);
        if (res.success) {
          setFeedback({ type: "success", message: "Volunteer assigned successfully to this event." });
          setSelectedUserId("");
          loadVolunteersAndMembers();
        }
      } catch (err: any) {
        setFeedback({ type: "error", message: err.message || "Failed to assign volunteer." });
      }
    });
  }

  function handleRemove(userId: string) {
    setFeedback(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("event_id", event.id);
        fd.append("user_id", userId);

        const res = await removeEventVolunteerAction(fd);
        if (res.success) {
          setFeedback({ type: "success", message: "Volunteer scanner role revoked for this event." });
          loadVolunteersAndMembers();
        }
      } catch (err: any) {
        setFeedback({ type: "error", message: err.message || "Failed to remove volunteer." });
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto bg-black/95 backdrop-blur-2xl">
        <div className="flex min-h-full items-center justify-center p-3 sm:p-6">
        <div className="relative m-auto w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-[#f5b642] bg-[#0d0a06] p-6 shadow-2xl space-y-4 shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#221c12] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f5b642]/10 border border-[#f5b642]/30 text-[#f5b642]">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Gate Scanner Volunteers</h3>
              <p className="text-[11px] text-zinc-400 font-mono">{event.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {feedback && (
          <div
            className={`flex items-center gap-2 rounded-xl border p-2.5 text-[11px] ${
              feedback.type === "success"
                ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
                : "border-red-500/30 bg-red-950/20 text-red-300"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <div className="rounded-xl border border-[#2a2215] bg-[#16120b] p-3 text-[11px] text-zinc-400 leading-relaxed">
          💡 <strong className="text-zinc-200">Role Scoping:</strong> Volunteers assigned here will gain mobile scanner access exclusively for <span className="text-[#f5b642] font-semibold">{event.title}</span>. When the event is deleted or archived, these access grants are automatically revoked.
        </div>

        {/* Assign New Volunteer Section */}
        <form onSubmit={handleAssign} className="space-y-3 rounded-xl border border-[#261f13] bg-[#18140e] p-3.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider block flex items-center gap-1.5">
              <UserPlus className="h-3.5 w-3.5 text-[#f5b642]" />
              Assign Gate Volunteer
            </label>
            <span className="text-[10px] text-zinc-400 font-mono">
              {eligibleMembers.length} available member{eligibleMembers.length === 1 ? "" : "s"}
            </span>
          </div>

          {/* Instant Search Bar */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchMember}
              onChange={(e) => setSearchMember(e.target.value)}
              placeholder="Filter members by name, roll, or @vitbhopal.ac.in email..."
              className="w-full rounded-xl border border-[#2a2215] bg-[#120f0a] pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-[#f5b642] transition font-mono"
            />
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                required
                className="w-full rounded-xl border border-[#332714] bg-[#120f0a] px-3 py-2 text-xs text-white outline-none focus:border-[#f5b642] transition cursor-pointer"
              >
                <option value="">
                  {loading ? "Loading club roster..." : eligibleMembers.length === 0 ? "No matching members found" : "-- Select a club member to assign --"}
                </option>
                {eligibleMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.assigned_to_name || m.full_name} — {m.email} ({m.role || "member"})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={isPending || !selectedUserId}
              className="rounded-xl bg-[#f5b642] px-4 py-2 text-xs font-bold text-black hover:bg-[#ffd06a] transition disabled:opacity-50 cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              {isPending ? <RotateCw className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
              <span>Assign</span>
            </button>
          </div>
        </form>

        {/* Currently Assigned Volunteers List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400">
            <span>Assigned Volunteers ({volunteers.length})</span>
            {loading && <span className="text-zinc-500">Loading...</span>}
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 divide-y divide-[#221c12]">
            {volunteers.length === 0 && !loading && (
              <div className="py-6 text-center text-xs text-zinc-500 font-mono">
                No event-specific volunteers assigned yet. (Top-6 Admins have universal scanning access)
              </div>
            )}

            {volunteers.map((vol) => {
              const u = vol.user || {};
              const displayName = u.assigned_to_name || u.full_name || "Volunteer";
              return (
                <div key={vol.id} className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{displayName}</p>
                    <p className="text-[10px] text-zinc-400 font-mono truncate">{u.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(vol.user_id)}
                    disabled={isPending}
                    className="flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-950/30 px-2.5 py-1 text-[10px] font-semibold text-red-300 hover:bg-red-900/40 transition cursor-pointer shrink-0"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Revoke</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-[#221c12]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition cursor-pointer"
          >
            Close
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}
