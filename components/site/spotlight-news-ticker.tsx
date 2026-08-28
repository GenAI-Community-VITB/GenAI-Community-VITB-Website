"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Event } from "@/lib/types";
import { Flame, Sparkles, ArrowRight, Calendar, MapPin } from "lucide-react";
import { formatISTDate } from "@/lib/utils/format";

interface SpotlightNewsTickerProps {
  events?: Event[] | null;
}

export function SpotlightNewsTicker({ events }: SpotlightNewsTickerProps) {
  // Filter active spotlight events: registrations open & spotlight enabled
  const activeSpotlights = useMemo(() => {
    if (!events || events.length === 0) return [];
    return events
      .filter((e) => e.is_registration_open && e.is_spotlight !== false)
      .sort((a, b) => (b.spotlight_priority ?? 1) - (a.spotlight_priority ?? 1));
  }, [events]);

  if (activeSpotlights.length === 0) {
    return null;
  }

  // Duplicate list to create a seamless infinite right-to-left marquee loop
  const tickerItems = [...activeSpotlights, ...activeSpotlights, ...activeSpotlights, ...activeSpotlights];

  return (
    <div
      id="homepage-spotlight-ticker"
      className="relative z-30 w-full overflow-hidden border-y border-[#f5b642]/25 bg-gradient-to-r from-[#181207] via-[#100c06] to-[#181207] shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
    >
      {/* Left Static News Badge */}
      <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center bg-gradient-to-r from-[#181207] via-[#181207]/95 to-transparent pl-4 pr-6">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/50 bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-300 shadow-[0_0_12px_rgba(245,182,66,0.3)]">
          <Flame className="h-3.5 w-3.5 text-[#f5b642] animate-pulse" />
          <span className="font-mono">Spotlight</span>
        </div>
      </div>

      {/* Right Gradient Fade */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-16 bg-gradient-to-l from-[#181207] to-transparent" />

      {/* Infinite Horizontal Marquee Track (Right to Left) */}
      <div className="flex w-max items-center py-2.5 hover:[animation-play-state:paused] animate-marquee">
        {tickerItems.map((item, idx) => {
          const defaultMsg = `🔥 Registrations Open: ${item.title}`;
          const message = item.spotlight_message || defaultMsg;
          const regUrl = item.slug ? `/events/${item.slug}/register` : `/events/${item.id}/register`;

          return (
            <div key={`${item.id}-${idx}`} className="flex items-center gap-6 px-4 shrink-0">
              <Link
                href={regUrl}
                className="group flex items-center gap-3 text-xs font-semibold text-zinc-200 hover:text-white transition"
              >
                <span className="font-extrabold text-[#f5b642] group-hover:text-[#ffd06a] transition-colors flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-amber-400" />
                  {message}
                </span>

                {item.venue && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-zinc-400 font-normal">
                    <MapPin className="h-3 w-3 text-zinc-500" />
                    {item.venue}
                  </span>
                )}

                {item.event_date && (
                  <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
                    <Calendar className="h-3 w-3 text-zinc-500" />
                    {formatISTDate(item.event_date, false)}
                  </span>
                )}

                <span className="inline-flex items-center gap-1 rounded-lg bg-[#f5b642]/15 border border-[#f5b642]/30 px-2 py-0.5 text-[10px] font-bold text-[#f5b642] group-hover:bg-[#f5b642] group-hover:text-black transition">
                  <span>Register</span>
                  <ArrowRight className="h-3 w-3" />
                </span>
              </Link>

              {/* Separator */}
              <span className="text-zinc-700 font-mono text-xs select-none">✦</span>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
}
