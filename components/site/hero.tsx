import { Event } from "@/lib/types";
import { UpcomingEventBanner } from "@/components/site/upcoming-event-banner";
import {
  Sparkles,
  ArrowRight,
  BrainCircuit,
  Users,
  Trophy,
  Cpu,
  Calendar,
  Layers,
} from "lucide-react";
import Link from "next/link";

export function Hero(props: {
  upcomingEvent?: Event | null;
  memberCount?: number;
}) {
  const { upcomingEvent, memberCount = 51 } = props;

  return (
    <section
      id="home"
      className={`scroll-mt-20 relative border-b border-[#221d14] bg-[#070707] pb-16 sm:pb-20 overflow-hidden transition-all duration-300 ${
        upcomingEvent ? "pt-14 sm:pt-18" : "pt-8 sm:pt-12"
      }`}
    >
      {/* Background ambient lighting and subtle tech grid */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[700px] w-full max-w-7xl bg-[radial-gradient(ellipse_at_center,_rgba(245,182,66,0.12),_transparent_65%)] blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-40 h-96 w-96 rounded-full bg-sky-500/[0.04] blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-10 h-72 w-72 rounded-full bg-purple-500/[0.03] blur-3xl" />

      {/* Subtle tech dot matrix overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#2a2215_1px,transparent_1px)] [background-size:24px_24px] opacity-30" />

      <div className="container-wrap relative space-y-10">
        <div className="mx-auto max-w-5xl text-center space-y-8">
          {/* Flashing Upcoming Event Banner (Within 30 Days) */}
          <UpcomingEventBanner event={upcomingEvent ?? null} />

          {/* Top Institutional Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5b642]/40 bg-[#16120b]/90 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#f5b642] shadow-[0_0_25px_rgba(245,182,66,0.15)] backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-[#f5b642]" />
            <span>Generative AI Community · VIT Bhopal</span>
          </div>

          {/* Master Headline */}
          <h1 className="text-4xl font-black tracking-tight leading-[1.1] text-white sm:text-6xl lg:text-7xl">
            Pioneering the Future of{" "}
            <span className="bg-gradient-to-r from-[#f5b642] via-[#ffd06a] to-[#f5b642] bg-clip-text text-transparent">
              Artificial Intelligence
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto max-w-3xl text-sm sm:text-lg text-zinc-300 leading-relaxed font-normal">
            A premier student-led technical ecosystem researching autonomous agentic frameworks, multi-modal foundation models, and production-grade generative systems.
          </p>

          {/* CTA Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <Link
              href="/events"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#f5b642] to-[#ffd06a] px-7 py-3.5 text-sm font-bold text-black shadow-[0_0_30px_rgba(245,182,66,0.25)] transition hover:brightness-110 cursor-pointer"
            >
              <span>Explore Live Events</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/team"
              className="inline-flex items-center gap-2 rounded-2xl border border-[#382f1d] bg-[#14100b] px-6 py-3.5 text-sm font-semibold text-zinc-200 transition hover:border-[#f5b642] hover:bg-[#1f190e] hover:text-white"
            >
              <Layers className="h-4 w-4 text-[#f5b642]" />
              <span>Team Members ({memberCount})</span>
            </Link>
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/60 px-6 py-3.5 text-sm font-semibold text-zinc-300 transition hover:border-zinc-700 hover:text-white"
            >
              <Cpu className="h-4 w-4 text-purple-400" />
              <span>Research Projects</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
