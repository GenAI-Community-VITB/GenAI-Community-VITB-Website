"use client";

import { useState, useTransition } from "react";
import { updateEventConfigurationAction } from "@/app/admin/events-actions";
import { Event, EventStatistics } from "@/lib/types";
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  Save,
  Settings,
  Users,
  IndianRupee,
  QrCode,
  Archive,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { EventArchiveModal } from "@/components/admin/event-archive-modal";
import { formatISTDate } from "@/lib/utils/format";

interface EventSettingsFormProps {
  event: Event;
  statistics?: EventStatistics | null;
  isTop6?: boolean;
}

function toDatetimeLocal(isoString?: string | null): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventSettingsForm({ event, statistics, isTop6 = true }: EventSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  const [title, setTitle] = useState(event.title);
  const [maxCapacity, setMaxCapacity] = useState(event.max_capacity || 2000);
  const [registrationFee, setRegistrationFee] = useState(event.registration_fee || 200);
  const [deadline, setDeadline] = useState(toDatetimeLocal(event.registration_deadline));
  const [startTime, setStartTime] = useState(toDatetimeLocal(event.event_start_time));
  const [endTime, setEndTime] = useState(toDatetimeLocal(event.event_end_time));
  const [isOpen, setIsOpen] = useState(event.is_registration_open);
  const [upiId, setUpiId] = useState(event.upi_id || "genai.community@okaxis");
  const [guidelinesText, setGuidelinesText] = useState(
    Array.isArray(event.guidelines)
      ? event.guidelines.join("\n")
      : event.guidelines || [
          "Entry strictly permitted with verified participant QR code pass.",
          "Please bring valid college ID card and laptop for hands-on sessions.",
          "Passes verified by finance desk; non-transferable & non-refundable.",
          "Participation certificates issued to all active attendees.",
          "Arrive 15 minutes prior to start time; maintain code of conduct.",
        ].join("\n")
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setActionSuccess(null);
    setActionError(null);

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("event_id", event.id);
        fd.append("title", title);
        fd.append("max_capacity", String(maxCapacity));
        fd.append("registration_fee", String(registrationFee));
        if (deadline) fd.append("registration_deadline", new Date(deadline).toISOString());
        if (startTime) fd.append("event_start_time", new Date(startTime).toISOString());
        if (endTime) fd.append("event_end_time", new Date(endTime).toISOString());
        fd.append("is_registration_open", String(isOpen));
        fd.append("upi_id", upiId);
        fd.append("guidelines", guidelinesText);

        await updateEventConfigurationAction(fd);
        setActionSuccess("Event configuration updated successfully!");
      } catch (err: any) {
        setActionError(err.message || "Failed to update event settings.");
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Live Statistics Overview Bar */}
      <div className="rounded-3xl border border-[#2b2b2b] bg-[#121212] p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#222] pb-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-[#f5b642]" />
              Live Event Operational Statistics
            </h2>
            <p className="text-xs text-zinc-400">
              Real-time capacity counters synced across registrations, payments, and scanner.
            </p>
          </div>
          {event.event_date && (
            <div className="rounded-full border border-zinc-800 bg-black/60 px-3.5 py-1 text-xs text-zinc-300 flex items-center gap-1.5 shrink-0">
              <Clock className="h-3.5 w-3.5 text-[#f5b642]" />
              Event Date: {formatISTDate(event.event_date)}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="rounded-2xl border border-[#252525] bg-black/50 p-4">
            <p className="text-xs text-zinc-400 uppercase tracking-wider">Registered / Capacity</p>
            <p className="text-2xl font-black text-white mt-1">
              <span>{statistics?.registered_count ?? 0}</span>
              <span className="text-sm font-bold text-zinc-500 font-mono"> / </span>
              <span className="text-lg font-bold text-zinc-300">{event.max_capacity || 2000}</span>
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-950/60 bg-emerald-950/20 p-4">
            <p className="text-xs text-emerald-400 uppercase tracking-wider">Approved Passes</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">
              {statistics?.approved_count ?? 0}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-950/60 bg-amber-950/20 p-4">
            <p className="text-xs text-amber-400 uppercase tracking-wider">Pending Review</p>
            <p className="text-2xl font-black text-amber-400 mt-1">
              {statistics?.pending_count ?? 0}
            </p>
          </div>
          <div className="rounded-2xl border border-blue-950/60 bg-blue-950/20 p-4">
            <p className="text-xs text-blue-400 uppercase tracking-wider">Attended (IST)</p>
            <p className="text-2xl font-black text-blue-400 mt-1">
              {statistics?.attended_count ?? 0}
            </p>
          </div>
        </div>
      </div>

      {actionSuccess && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-950/20 p-4 text-xs text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Main Configuration Form */}
      <form onSubmit={handleSubmit} className="rounded-3xl border border-[#2b2b2b] bg-[#121212] p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-center gap-2 text-white border-b border-[#242424] pb-4">
          <Settings className="h-5 w-5 text-[#f5b642]" />
          <h2 className="text-lg font-bold">Event Capacity & Registration Rules</h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
              Event Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-[#333333] bg-[#181818] px-3.5 py-2.5 text-xs text-white focus:border-[#f5b642] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
              Receiving UPI ID *
            </label>
            <input
              type="text"
              required
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="genai.community@okaxis"
              className="w-full rounded-xl border border-[#333333] bg-[#181818] px-3.5 py-2.5 text-xs text-white focus:border-[#f5b642] focus:outline-none"
            />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
              Maximum Capacity (Hard Limit) *
            </label>
            <input
              type="number"
              required
              min={1}
              value={maxCapacity}
              onChange={(e) => setMaxCapacity(Number(e.target.value))}
              className="w-full rounded-xl border border-[#333333] bg-[#181818] px-3.5 py-2.5 text-xs text-white focus:border-[#f5b642] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
              Registration Fee (INR ₹) *
            </label>
            <input
              type="number"
              required
              min={0}
              value={registrationFee}
              onChange={(e) => setRegistrationFee(Number(e.target.value))}
              className="w-full rounded-xl border border-[#333333] bg-[#181818] px-3.5 py-2.5 text-xs text-white focus:border-[#f5b642] focus:outline-none"
            />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
              Registration Deadline (IST)
            </label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full rounded-xl border border-[#333333] bg-[#181818] px-3.5 py-2.5 text-xs text-white focus:border-[#f5b642] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
              Event Start Time (Scanner Gate Open)
            </label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-xl border border-[#333333] bg-[#181818] px-3.5 py-2.5 text-xs text-white focus:border-[#f5b642] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
              Event End Time (Scanner Gate Close)
            </label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-xl border border-[#333333] bg-[#181818] px-3.5 py-2.5 text-xs text-white focus:border-[#f5b642] focus:outline-none"
            />
          </div>
        </div>

        {/* Event Guidelines Editor */}
        <div className="rounded-2xl border border-[#2b2b2b] bg-black/40 p-4 space-y-2">
          <label className="text-xs font-semibold text-zinc-300 block">
            Event Guidelines & Policies (One guideline per line)
          </label>
          <textarea
            rows={5}
            value={guidelinesText}
            onChange={(e) => setGuidelinesText(e.target.value)}
            placeholder="Entry strictly permitted with verified participant QR code pass.&#10;Please bring valid college ID card and laptop for hands-on sessions."
            className="w-full rounded-xl border border-[#333333] bg-[#181818] p-3 text-xs text-white focus:border-[#f5b642] focus:outline-none font-mono leading-relaxed resize-y"
          />
          <p className="text-[11px] text-zinc-500">
            These guidelines appear dynamically on the public event details modal and the registration portal.
          </p>
        </div>

        {/* Toggle Open */}
        <div className="flex items-center gap-3 rounded-2xl border border-[#2b2b2b] bg-black/40 p-4">
          <input
            type="checkbox"
            id="is_open"
            checked={isOpen}
            onChange={(e) => setIsOpen(e.target.checked)}
            className="h-4 w-4 rounded accent-[#f5b642]"
          />
          <label htmlFor="is_open" className="text-xs text-zinc-300 font-semibold cursor-pointer">
            Registration is currently <span className={isOpen ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>{isOpen ? "OPEN (Accepting Submissions)" : "CLOSED (Submissions Blocked)"}</span>
          </label>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 rounded-xl bg-[#f5b642] px-6 py-2.5 text-xs font-bold text-black hover:bg-[#ffd06a] disabled:opacity-50 transition shadow-lg"
          >
            <Save className="h-4 w-4" />
            {isPending ? "Saving Settings..." : "Save Event Configuration"}
          </button>
        </div>
      </form>

      {/* TOP-6 EVENT ARCHIVAL & DATABASE RESET SECTION */}
      {isTop6 && (
        <div className="rounded-3xl border border-red-950/60 bg-[#160e0e] p-6 sm:p-8 shadow-2xl space-y-4">
          <div className="flex items-center gap-2 text-red-400">
            <ShieldAlert className="h-5 w-5" />
            <h3 className="font-bold text-white text-base">Top-6 Executive Event Reset & Archival</h3>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
            When an event concludes, Top-6 executive leadership can archive registrations into Excel and Google Sheets, and clear active Supabase event data to reset the database for the next event.
          </p>

          <button
            type="button"
            onClick={() => setShowArchiveModal(true)}
            className="flex items-center gap-2 rounded-xl bg-red-600/90 hover:bg-red-500 px-5 py-2.5 text-xs font-bold text-white transition shadow-lg"
          >
            <Archive className="h-4 w-4" />
            Complete Event & Archive Data
          </button>
        </div>
      )}

      {/* Archive Modal */}
      <EventArchiveModal
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        event={event}
        statistics={statistics ?? null}
        onSuccess={() => {
          window.location.reload();
        }}
      />
    </div>
  );
}
