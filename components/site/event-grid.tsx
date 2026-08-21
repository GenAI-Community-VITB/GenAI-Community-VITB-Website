"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CircleDot,
  MapPin,
  Sparkles,
  Ticket,
  CheckCircle2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface EventItem {
  id: string;
  title: string;
  slug?: string | null;
  description: string;
  venue: string;
  event_date: string;
  registration_fee?: number;
  status: "upcoming" | "live" | "past";
  image_url: string | null;
  register_url: string | null;
  guidelines?: string[] | string | null;
}

export function EventGrid({ events }: { events: EventItem[] }) {
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  if (events.length === 0) {
    return (
      <div className="rounded-3xl border border-[#262015] bg-[#0c0a07] p-12 text-center text-zinc-500 text-xs">
        No active events scheduled right now. Check back soon for upcoming hackathons and workshops!
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => {
          const registrationLink = event.register_url || `/events/${event.slug || event.id}/register`;
          const isExternal = event.register_url?.startsWith("http");

          return (
            <article
              key={event.id}
              className="group flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-[#262015] bg-gradient-to-b from-[#14100b] to-[#0a0805] shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-[#f5b642] hover:shadow-[0_15px_40px_rgba(245,182,66,0.18)]"
            >
              <div>
                {/* Event Poster / Banner */}
                <div className="relative h-48 overflow-hidden border-b border-[#221c13] bg-[#120f0a]">
                  {event.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={event.image_url}
                      alt={`${event.title} poster`}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(245,182,66,0.15),_transparent_65%),_#100d08]">
                      <Sparkles className="h-10 w-10 text-[#f5b642]/30" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase font-mono shadow-md backdrop-blur-md ${
                        event.status === "live"
                          ? "border border-emerald-500/50 bg-emerald-950/80 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                          : "border border-[#3a301b] bg-[#16120b]/90 text-amber-300"
                      }`}
                    >
                      <CircleDot className="h-3 w-3 animate-pulse" />
                      {event.status === "live" ? "Live Registration" : "Upcoming"}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                  <h3 className="line-clamp-2 text-xl font-extrabold text-white group-hover:text-[#ffd06a] transition-colors">
                    {event.title}
                  </h3>
                  <p className="line-clamp-3 text-xs leading-relaxed text-zinc-400">
                    {event.description}
                  </p>

                  <div className="space-y-2 border-t border-[#1e1910] pt-3 text-xs text-zinc-400 font-mono">
                    <p className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-[#f5b642] shrink-0" />
                      <span className="truncate">{event.venue}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <CalendarDays className="h-3.5 w-3.5 text-[#f5b642] shrink-0" />
                      <span className="truncate">
                        {new Date(event.event_date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-6 pt-0 flex items-center justify-between gap-3">
                {/* In-Place View Details Button (Stays on same page) */}
                <button
                  type="button"
                  onClick={() => setSelectedEvent(event)}
                  className="rounded-xl border border-[#2e2618] bg-[#14110b] px-3.5 py-2 text-xs font-bold text-zinc-300 transition hover:border-[#f5b642] hover:text-[#f5b642] cursor-pointer"
                >
                  View Details
                </button>

                {/* Glowy High-Contrast Register Button */}
                {event.status === "live" ? (
                  <Link
                    href={registrationLink}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noreferrer" : undefined}
                    className="inline-flex items-center gap-2 rounded-2xl border border-[#f5b642] bg-gradient-to-r from-[#f5b642] via-[#ffd06a] to-[#f5b642] px-4 py-2 text-xs font-black text-black shadow-[0_0_25px_rgba(245,182,66,0.45)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_35px_rgba(245,182,66,0.7)]"
                  >
                    <span>Register Pass</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <span className="rounded-xl border border-[#2e2618] bg-[#14110b] px-3 py-1.5 text-[11px] font-bold text-zinc-500 font-mono">
                    Opening Soon
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* ── IN-PLACE EVENT DETAILS POPUP MODAL ── */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEvent(null)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            {/* Modal Dialog Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-[#f5b642] bg-[#0d0a07] p-6 sm:p-8 shadow-[0_30px_100px_rgba(245,182,66,0.25)] space-y-6"
            >
              {/* Event Poster / Image */}
              {selectedEvent.image_url ? (
                <div className="relative h-56 w-full overflow-hidden rounded-2xl border border-[#2a2215]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedEvent.image_url}
                    alt={selectedEvent.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-black/80 px-3 py-1 text-xs font-bold text-emerald-300 font-mono">
                      <CircleDot className="h-3 w-3" />
                      {selectedEvent.status === "live" ? "Live Registration" : "Upcoming"}
                    </span>
                  </div>
                </div>
              ) : null}

              {/* Title & Tag */}
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-0.5 text-xs font-bold text-amber-300 font-mono uppercase">
                  <Ticket className="h-3.5 w-3.5" />
                  {selectedEvent.registration_fee ? `Fee: ₹${selectedEvent.registration_fee}` : "Free Admission"}
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {selectedEvent.title}
                </h3>
              </div>

              {/* Comprehensive Description */}
              <div className="rounded-2xl border border-[#2e2618] bg-[#14100b] p-4 text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-line">
                {selectedEvent.description}
              </div>

              {/* Venue & Time Specifications */}
              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl border border-[#2e2618] bg-[#14100b] p-3 space-y-1">
                  <span className="text-zinc-400 block text-[10px] font-mono uppercase font-bold">Venue / Platform:</span>
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-[#f5b642] shrink-0" />
                    <span>{selectedEvent.venue}</span>
                  </p>
                </div>
                <div className="rounded-2xl border border-[#2e2618] bg-[#14100b] p-3 space-y-1">
                  <span className="text-zinc-400 block text-[10px] font-mono uppercase font-bold">Event Schedule:</span>
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 text-[#f5b642] shrink-0" />
                    <span>{new Date(selectedEvent.event_date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
                  </p>
                </div>
              </div>

              {/* Event Guidelines in Modal */}
              <div className="rounded-2xl border border-[#2e2618] bg-[#14100b] p-4 text-xs space-y-2">
                <span className="text-amber-400 block text-[11px] font-mono uppercase font-bold">
                  Event Guidelines & Attendance Rules:
                </span>
                <ul className="space-y-1 text-zinc-300">
                  {(Array.isArray(selectedEvent.guidelines) && selectedEvent.guidelines.length > 0
                    ? selectedEvent.guidelines
                    : typeof selectedEvent.guidelines === "string" && selectedEvent.guidelines.trim()
                      ? selectedEvent.guidelines.split("\n").filter(Boolean)
                      : [
                          "Entry strictly permitted with verified participant QR code pass.",
                          "Please bring valid college ID card and laptop for hands-on sessions.",
                          "Passes verified by finance desk; non-transferable & non-refundable.",
                          "Participation certificates issued to all active attendees.",
                          "Arrive 15 minutes prior to start time; maintain code of conduct.",
                        ]
                  ).map((rule, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-[#f5b642] font-bold">•</span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-[#221c13] gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="rounded-xl border border-[#2e2618] bg-[#14110b] px-5 py-2.5 text-xs font-bold text-zinc-300 transition hover:border-zinc-700 hover:text-white cursor-pointer"
                >
                  Close Window
                </button>

                {selectedEvent.status === "live" ? (
                  <Link
                    href={selectedEvent.register_url || `/events/${selectedEvent.slug || selectedEvent.id}/register`}
                    className="inline-flex items-center gap-2 rounded-2xl border border-[#f5b642] bg-gradient-to-r from-[#f5b642] via-[#ffd06a] to-[#f5b642] px-6 py-2.5 text-xs font-black text-black shadow-[0_0_25px_rgba(245,182,66,0.5)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_35px_rgba(245,182,66,0.7)]"
                  >
                    <span>Register Pass</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <span className="text-xs text-zinc-500 font-mono font-bold">
                    Registration opens soon
                  </span>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
