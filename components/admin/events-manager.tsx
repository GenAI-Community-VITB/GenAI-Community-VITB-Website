"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import type { Event } from "@/lib/types";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import { upsertEvent, deleteEvent } from "@/app/admin/actions";
import { EventVolunteersModal } from "@/components/admin/event-volunteers-modal";
import { ParticipantImporterModal } from "@/components/admin/participant-importer-modal";
import { exportAttendanceDataAction, getAllStaffMembersAction } from "@/app/admin/events-actions";
import type { UserProfile } from "@/lib/types";
import {
  Calendar,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MapPin,
  Clock,
  Users,
  Ticket,
  Search,
  UserCheck,
  FileSpreadsheet,
  Download,
} from "lucide-react";

interface EventsManagerProps {
  initialEvents: Event[];
  isAllowed?: boolean;
}

function toDatetimeLocalValue(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatEventDate(iso?: string | null): string {
  if (!iso) return "Date TBD";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Date TBD";
  try {
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return d.toDateString();
  }
}

export function EventsManager({
  initialEvents,
  isAllowed = true,
}: EventsManagerProps) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Event | null>(null);
  const [selectedVolunteerEvent, setSelectedVolunteerEvent] = useState<Event | null>(null);
  const [selectedImportEvent, setSelectedImportEvent] = useState<Event | null>(null);
  const [clubMembers, setClubMembers] = useState<UserProfile[]>([]);
  const [isPending, startTransition] = useTransition();

  // Load active members for volunteer delegation
  useEffect(() => {
    async function loadMembers() {
      try {
        const res = await getAllStaffMembersAction();
        if (res.success && res.members) {
          setClubMembers(res.members);
        }
      } catch (err) {
        console.error("Failed to load staff members:", err);
      }
    }
    loadMembers();
  }, []);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "upcoming" | "live" | "past">("all");

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [status, setStatus] = useState<Event["status"]>("upcoming");
  const [registrationFee, setRegistrationFee] = useState<number>(200);
  const [maxCapacity, setMaxCapacity] = useState<number>(2000);
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [eventStartTime, setEventStartTime] = useState("");
  const [eventEndTime, setEventEndTime] = useState("");
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);
  const [upiId, setUpiId] = useState("genai.community@okaxis");
  const [registerUrl, setRegisterUrl] = useState("");
  const [guidelines, setGuidelines] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (statusFilter !== "all" && ev.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          ev.title.toLowerCase().includes(q) ||
          ev.venue.toLowerCase().includes(q) ||
          ev.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [events, statusFilter, searchQuery]);

  if (!isAllowed) return null;

  function resetForm() {
    setEditingItem(null);
    setTitle("");
    setSlug("");
    setDescription("");
    setVenue("");
    setEventDate("");
    setStatus("upcoming");
    setRegistrationFee(200);
    setMaxCapacity(2000);
    setRegistrationDeadline("");
    setEventStartTime("");
    setEventEndTime("");
    setIsRegistrationOpen(true);
    setUpiId("genai.community@okaxis");
    setRegisterUrl("");
    setGuidelines("");
    setImageUrl("");
    setImageFile(null);
    setImagePreview(null);
    setShowModal(false);
  }

  function handleOpenEdit(item: Event) {
    setEditingItem(item);
    setTitle(item.title);
    setSlug(item.slug || "");
    setDescription(item.description);
    setVenue(item.venue);
    setEventDate(toDatetimeLocalValue(item.event_date));
    setStatus(item.status);
    setRegistrationFee(item.registration_fee ?? 200);
    setMaxCapacity(item.max_capacity ?? 2000);
    setRegistrationDeadline(toDatetimeLocalValue(item.registration_deadline));
    setEventStartTime(item.event_start_time || "");
    setEventEndTime(item.event_end_time || "");
    setIsRegistrationOpen(item.is_registration_open ?? true);
    setUpiId(item.upi_id || "genai.community@okaxis");
    setRegisterUrl(item.register_url || "");
    setGuidelines(
      Array.isArray(item.guidelines)
        ? item.guidelines.join("\n")
        : typeof item.guidelines === "string"
        ? item.guidelines
        : "",
    );
    setImageUrl(item.image_url || "");
    setImageFile(null);
    setImagePreview(item.image_url || null);
    setShowModal(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
      try {
        const fd = new FormData();
        if (editingItem) fd.append("id", editingItem.id);
        fd.append("title", title.trim());
        if (slug) fd.append("slug", slug.trim().toLowerCase());
        fd.append("description", description.trim());
        fd.append("venue", venue.trim());
        fd.append("event_date", eventDate);
        fd.append("status", status);
        fd.append("registration_fee", String(registrationFee));
        fd.append("max_capacity", String(maxCapacity));
        if (registrationDeadline) fd.append("registration_deadline", registrationDeadline);
        if (eventStartTime) fd.append("event_start_time", eventStartTime.trim());
        if (eventEndTime) fd.append("event_end_time", eventEndTime.trim());
        fd.append("is_registration_open", isRegistrationOpen ? "true" : "false");
        if (upiId) fd.append("upi_id", upiId.trim());
        if (registerUrl) fd.append("register_url", registerUrl.trim());
        if (guidelines) fd.append("guidelines", guidelines.trim());
        if (imageUrl) fd.append("image_url", imageUrl.trim());
        if (imageFile) fd.append("image_file", imageFile);

        await upsertEvent(fd);

        setMessage({
          type: "success",
          text: editingItem ? "Event details updated successfully." : "Event published successfully.",
        });

        if (editingItem) {
          setEvents((prev) =>
            prev.map((ev) =>
              ev.id === editingItem.id
                ? {
                    ...ev,
                    title: title.trim(),
                    slug: slug.trim().toLowerCase() || null,
                    description: description.trim(),
                    venue: venue.trim(),
                    event_date: eventDate,
                    status,
                    registration_fee: registrationFee,
                    max_capacity: maxCapacity,
                    registration_deadline: registrationDeadline || null,
                    event_start_time: eventStartTime || null,
                    event_end_time: eventEndTime || null,
                    is_registration_open: isRegistrationOpen,
                    upi_id: upiId || null,
                    register_url: registerUrl || null,
                    guidelines: guidelines ? guidelines.split("\n").filter(Boolean) : null,
                    image_url: imagePreview || imageUrl || ev.image_url,
                    updated_at: new Date().toISOString(),
                  }
                : ev,
            ),
          );
        } else {
          setEvents((prev) => [
            {
              id: `ev-${Date.now()}`,
              title: title.trim(),
              slug: slug.trim().toLowerCase() || null,
              description: description.trim(),
              venue: venue.trim(),
              event_date: eventDate,
              status,
              registration_fee: registrationFee,
              max_capacity: maxCapacity,
              registration_deadline: registrationDeadline || null,
              event_start_time: eventStartTime || null,
              event_end_time: eventEndTime || null,
              is_registration_open: isRegistrationOpen,
              upi_id: upiId || null,
              register_url: registerUrl || null,
              guidelines: guidelines ? guidelines.split("\n").filter(Boolean) : null,
              image_url: imagePreview || imageUrl || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            ...prev,
          ]);
        }

        resetForm();
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Failed to save event." });
      }
    });
  }

  function handleDelete(id: string, eventTitle: string) {
    if (!confirm(`Are you sure you want to delete the event "${eventTitle}"?`)) return;

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("id", id);
        await deleteEvent(fd);
        setEvents((prev) => prev.filter((ev) => ev.id !== id));
        setMessage({ type: "success", text: `Event "${eventTitle}" deleted successfully.` });
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Failed to delete event." });
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#f5b642]" />
            Events & Hackathons Management
          </h2>
          <p className="text-xs text-zinc-400">
            Publish hackathons, workshops, and flagship conferences with capacities, ticketing, and scheduling.
          </p>
        </div>

        {isAllowed ? (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#f5b642] px-3.5 py-2 text-xs font-bold text-black hover:bg-[#ffd06a] transition cursor-pointer self-start sm:self-auto shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Event
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-[11px] font-medium text-zinc-400">
            Read-Only Workspace
          </span>
        )}
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 rounded-2xl border p-4 text-xs ${
            message.type === "success"
              ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
              : "border-red-500/30 bg-red-950/20 text-red-300"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between rounded-2xl border border-[#2b2416] bg-[#120f0a] p-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search event title, venue, tracks..."
            className="w-full rounded-xl border border-[#332714] bg-[#18140d] pl-9 pr-3.5 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
          />
        </div>

        <div className="flex rounded-xl border border-[#332714] bg-[#18140d] p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
              statusFilter === "all" ? "bg-[#f5b642] font-bold text-black" : "text-zinc-400 hover:text-white"
            }`}
          >
            All ({events.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("upcoming")}
            className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
              statusFilter === "upcoming" ? "bg-sky-500 font-bold text-black" : "text-zinc-400 hover:text-white"
            }`}
          >
            Upcoming ({events.filter((e) => e.status === "upcoming").length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("live")}
            className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
              statusFilter === "live" ? "bg-emerald-500 font-bold text-black" : "text-zinc-400 hover:text-white"
            }`}
          >
            Live ({events.filter((e) => e.status === "live").length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("past")}
            className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
              statusFilter === "past" ? "bg-zinc-700 font-bold text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            Past ({events.filter((e) => e.status === "past").length})
          </button>
        </div>
      </div>

      {/* Grid of Events */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredEvents.map((event) => (
          <div
            key={event.id}
            className="flex flex-col justify-between rounded-2xl border border-[#2a2216] bg-[#14110b] p-5 shadow-lg space-y-4 hover:border-[#f5b642]/60 transition duration-200"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                    event.status === "upcoming"
                      ? "border border-sky-500/30 bg-sky-500/10 text-sky-400"
                      : event.status === "live"
                      ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 animate-pulse"
                      : "border border-zinc-700 bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {event.status}
                </span>

                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                    event.is_registration_open
                      ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800/40"
                      : "bg-red-950/40 text-red-400 border border-red-800/40"
                  }`}
                >
                  {event.is_registration_open ? "Registration Open" : "Registration Closed"}
                </span>
              </div>

              {event.image_url && (
                <div className="relative h-32 w-full overflow-hidden rounded-xl border border-[#2e2618]">
                  <img
                    src={event.image_url}
                    alt={event.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              <div>
                <h4 className="font-bold text-sm text-white leading-snug">{event.title}</h4>
                <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                  {event.description}
                </p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-[#221c12] text-xs text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-[#f5b642] shrink-0" />
                  <span className="truncate">{event.venue}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-[#f5b642] shrink-0" />
                  <span>{formatEventDate(event.event_date)}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="inline-flex items-center gap-1 text-[11px] text-zinc-300">
                    <Ticket className="h-3.5 w-3.5 text-sky-400" />
                    <strong>₹{event.registration_fee ?? 200}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-zinc-300">
                    <Users className="h-3.5 w-3.5 text-purple-400" />
                    <span>
                      <strong className="text-white">{event.registered_count ?? 0}</strong>
                      <span className="text-zinc-500 font-mono"> / </span>
                      <strong className="text-zinc-300">{event.max_capacity ?? 2000}</strong>
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {isAllowed && (
              <div className="pt-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedVolunteerEvent(event)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-500/50 bg-gradient-to-r from-amber-500/20 via-[#f5b642]/15 to-amber-500/20 py-2 px-3 text-xs font-bold text-[#ffd06a] hover:from-amber-500/30 hover:to-[#f5b642]/30 shadow-[0_0_15px_rgba(245,182,66,0.15)] transition cursor-pointer"
                >
                  <UserCheck className="h-3.5 w-3.5 text-[#f5b642]" />
                  <span>Assign Scanner Volunteers</span>
                </button>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-[#221c12]">
              <a
                href={event.slug ? `/events/${event.slug}` : `/events`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-[#f5b642] hover:underline flex items-center gap-1"
              >
                Event Page <ExternalLink className="h-3 w-3" />
              </a>

              {isAllowed ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedImportEvent(event)}
                    className="p-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition cursor-pointer"
                    title="Bulk Import Participants (Excel/CSV)"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await exportAttendanceDataAction(event.id);
                        if (res.success && res.csvContent) {
                          const blob = new Blob([res.csvContent], { type: "text/csv;charset=utf-8;" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = res.filename || `Attendance_${event.title}.csv`;
                          a.click();
                          URL.revokeObjectURL(url);
                          setMessage({ type: "success", text: "Attendance data exported successfully." });
                        } else {
                          setMessage({ type: "error", text: res.error || "No attendance data to export." });
                        }
                      } catch (err: any) {
                        setMessage({ type: "error", text: err.message || "Failed to export attendance." });
                      }
                    }}
                    className="p-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition cursor-pointer"
                    title="Export Attendance Sheet (CSV)"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(event)}
                    className="p-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-[#f5b642] transition cursor-pointer"
                    title="Edit Event"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(event.id, event.title)}
                    className="p-1.5 rounded-lg border border-red-900/50 text-red-400 hover:bg-red-950/40 transition cursor-pointer"
                    title="Delete Event"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {/* Event Volunteers Management Modal */}
      {selectedVolunteerEvent && (
        <EventVolunteersModal
          event={selectedVolunteerEvent}
          allMembers={clubMembers}
          onClose={() => setSelectedVolunteerEvent(null)}
        />
      )}

      {/* Participant CSV Bulk Importer Modal */}
      {selectedImportEvent && (
        <ParticipantImporterModal
          event={selectedImportEvent}
          onClose={() => setSelectedImportEvent(null)}
          onSuccess={() => {
            setMessage({ type: "success", text: "Participants imported with QR codes generated!" });
          }}
        />
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-3xl border border-[#332714] bg-[#120f0a] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#221c12] pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#f5b642]" />
                <h3 className="font-bold text-white text-base">
                  {editingItem ? "Edit Event Configuration" : "Publish New Event"}
                </h3>
              </div>
              <button
                onClick={resetForm}
                className="text-zinc-400 hover:text-white text-xs cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Prompt-to-Product HackSprint 2026"
                  className="w-full rounded-xl border border-[#332714] bg-[#18140d] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Event Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full rounded-xl border border-[#332714] bg-[#18140d] px-3.5 py-2 text-xs text-white focus:border-[#f5b642] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Venue *
                  </label>
                  <input
                    type="text"
                    required
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="e.g. Auditorium / Lab Complex 2"
                    className="w-full rounded-xl border border-[#332714] bg-[#18140d] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Event Status
                  </label>
                  <CustomDropdown
                    value={status}
                    onChange={(val) => setStatus(val as Event["status"])}
                    options={[
                      { value: "upcoming", label: "Upcoming" },
                      { value: "live", label: "Live Now" },
                      { value: "past", label: "Past / Completed" },
                    ]}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Registration Fee (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={registrationFee}
                    onChange={(e) => setRegistrationFee(Number(e.target.value))}
                    className="w-full rounded-xl border border-[#332714] bg-[#18140d] px-3 py-2 text-xs text-white focus:border-[#f5b642] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Max Capacity (Seats)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={maxCapacity}
                    onChange={(e) => setMaxCapacity(Number(e.target.value))}
                    className="w-full rounded-xl border border-[#332714] bg-[#18140d] px-3 py-2 text-xs text-white focus:border-[#f5b642] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Registration Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={registrationDeadline}
                    onChange={(e) => setRegistrationDeadline(e.target.value)}
                    className="w-full rounded-xl border border-[#332714] bg-[#18140d] px-3 py-2 text-xs text-white focus:border-[#f5b642] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    UPI Payment ID
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="genai.community@okaxis"
                    className="w-full rounded-xl border border-[#332714] bg-[#18140d] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Daily Start Time (Optional)
                  </label>
                  <input
                    type="text"
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                    placeholder="e.g. 09:30 AM"
                    className="w-full rounded-xl border border-[#332714] bg-[#18140d] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Daily End Time (Optional)
                  </label>
                  <input
                    type="text"
                    value={eventEndTime}
                    onChange={(e) => setEventEndTime(e.target.value)}
                    placeholder="e.g. 05:30 PM"
                    className="w-full rounded-xl border border-[#332714] bg-[#18140d] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="reg-open-toggle"
                  checked={isRegistrationOpen}
                  onChange={(e) => setIsRegistrationOpen(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-[#f5b642] focus:ring-[#f5b642] cursor-pointer"
                />
                <label htmlFor="reg-open-toggle" className="text-xs font-semibold text-zinc-200 cursor-pointer">
                  Accept Registrations (Show active booking form to students)
                </label>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Description & Schedule *
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Overview of event tracks, prizes, judging criteria, and schedule..."
                  className="w-full rounded-xl border border-[#332714] bg-[#18140d] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none resize-y"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Event Guidelines & Rules (One rule per line)
                </label>
                <textarea
                  rows={2}
                  value={guidelines}
                  onChange={(e) => setGuidelines(e.target.value)}
                  placeholder="Bring your own laptop&#10;Teams of 2-4 members&#10;Valid VIT Bhopal ID card mandatory"
                  className="w-full rounded-xl border border-[#332714] bg-[#18140d] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none resize-y"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Event Poster / Banner (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setImageFile(f);
                      if (f) setImagePreview(URL.createObjectURL(f));
                    }}
                    className="text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-[#f5b642] file:px-2.5 file:py-1 file:text-xs file:font-bold file:text-black hover:file:bg-[#ffd06a] cursor-pointer"
                  />
                </div>
                {imagePreview && (
                  <div className="relative mt-2 h-24 w-full rounded-xl overflow-hidden border border-[#332714]">
                    <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                  </div>
                )}
                <div>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      if (e.target.value) setImagePreview(e.target.value);
                    }}
                    placeholder="Or paste banner image URL (https://...)"
                    className="w-full rounded-xl border border-[#332714] bg-[#18140d] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-[#221c12]">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-xl bg-[#f5b642] py-2.5 text-xs font-bold text-black hover:bg-[#ffd06a] disabled:opacity-50 transition cursor-pointer shadow-sm"
                >
                  {isPending ? "Saving..." : editingItem ? "Update Event" : "Publish Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
