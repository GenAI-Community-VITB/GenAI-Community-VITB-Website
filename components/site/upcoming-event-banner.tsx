"use client";

import Link from "next/link";
import { Event } from "@/lib/types";
import { Sparkles, ArrowRight, Calendar } from "lucide-react";

interface UpcomingEventBannerProps {
  event: Event | null;
}

export function UpcomingEventBanner({ event }: UpcomingEventBannerProps) {
  if (!event) return null;

  const eventDate = new Date(event.event_date);
  const now = new Date();
  const diffDays = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const formattedDate = eventDate.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="w-full max-w-4xl mx-auto mb-6">
      <Link
        href={`/events/${event.slug || event.id}/register`}
        className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-hidden rounded-2xl border border-[#f5b642] bg-gradient-to-r from-[#1f190e] via-[#2a2213] to-[#1f190e] p-3 sm:px-5 sm:py-3.5 text-xs sm:text-sm shadow-[0_0_30px_rgba(245,182,66,0.35)] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_45px_rgba(245,182,66,0.6)]"
      >
        {/* Left: Thumbnail poster + Beacon + Event Details */}
        <div className="flex items-center gap-3 min-w-0">
          {event.image_url && (
            <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded-lg border border-[#f5b642]/40 bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={event.image_url}
                alt={`${event.title} banner`}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          )}

          <span className="relative flex h-3 w-3 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#f5b642] opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-[#f5b642] shadow-[0_0_12px_#f5b642]" />
          </span>

          <span className="rounded-full bg-[#f5b642] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shrink-0">
            {event.status === "live" ? "LIVE EVENT" : "UPCOMING"}
          </span>

          <span className="font-extrabold text-white text-xs sm:text-sm group-hover:text-[#ffd06a] transition-colors truncate">
            {event.title}
          </span>
        </div>

        {/* Right: Date, Timeline & Register CTA */}
        <div className="flex items-center gap-3 text-xs font-semibold ml-auto shrink-0">
          <span className="hidden md:inline-flex items-center gap-1 text-zinc-300">
            <Calendar className="h-3.5 w-3.5 text-[#f5b642]" />
            {formattedDate}
          </span>

          <span className="text-emerald-400 font-bold">
            {diffDays < 0 ? "Live Now" : diffDays === 0 ? "Today!" : diffDays === 1 ? "Tomorrow!" : `In ${diffDays} days`}
          </span>

          <span className="inline-flex items-center gap-1 rounded-xl bg-[#f5b642] px-3.5 py-1.5 font-bold text-black group-hover:bg-[#ffd06a] transition-colors shadow-sm">
            <span>Register</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </Link>
    </div>
  );
}
