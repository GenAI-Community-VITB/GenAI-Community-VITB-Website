import Link from "next/link";
import { ArrowUpRight, CalendarDays, CircleDot, MapPin } from "lucide-react";

interface EventItem {
  id: string;
  title: string;
  description: string;
  venue: string;
  event_date: string;
  status: "upcoming" | "live";
  image_url: string | null;
  register_url: string | null;
}

export function EventGrid({ events }: { events: EventItem[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <article
          key={event.id}
          className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#2f2f2f] bg-[#121212] shadow-[0_20px_50px_rgba(0,0,0,0.35)] transition hover:-translate-y-1 hover:border-[#f5b642]/45"
        >
          <div className="relative h-44 overflow-hidden border-b border-[#262626] bg-[#181818]">
            {event.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.image_url}
                alt={`${event.title} poster`}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(245,182,66,0.18),_transparent_55%),_#181818]" />
            )}
          </div>

          <div className="flex flex-1 flex-col p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="line-clamp-2 text-xl font-semibold text-white">{event.title}</h3>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                event.status === "live"
                  ? "bg-[#14351d] text-[#73f59a]"
                  : "bg-[#2a2a2a] text-[#d0d0d0]"
              }`}
            >
              <CircleDot className="h-3 w-3" aria-hidden />
              {event.status === "live" ? "Live" : "Upcoming"}
            </span>
            </div>

            <p className="line-clamp-4 text-sm leading-relaxed text-zinc-400">{event.description}</p>

            <div className="mt-4 space-y-2 text-sm text-zinc-400">
              <p className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#f5b642]/85" aria-hidden />
                <span className="line-clamp-1">{event.venue}</span>
              </p>
              <p className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#f5b642]/85" aria-hidden />
                <span>{new Date(event.event_date).toLocaleString()}</span>
              </p>
            </div>

            <div className="mt-5">
              {event.status === "live" && event.register_url ? (
                <Link
                  href={event.register_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#3a3528] bg-[#18150f] px-3 py-2 text-xs font-medium text-[#f6e7ca] transition hover:border-[#f5b642]/55"
                >
                  Register
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              ) : (
                <p className="text-xs text-zinc-500">
                  {event.status === "live"
                    ? "No registration link available."
                    : "Registration opens when event goes live."}
                </p>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
