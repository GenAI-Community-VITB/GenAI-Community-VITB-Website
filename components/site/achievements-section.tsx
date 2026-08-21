"use client";

import { Achievement } from "@/lib/types";
import {
  Trophy,
  Award,
  BookOpen,
  Sparkles,
  ExternalLink,
  Calendar,
  Zap,
} from "lucide-react";

interface AchievementsSectionProps {
  achievements: Achievement[];
}

const CATEGORY_BADGES: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  Hackathon: {
    bg: "bg-amber-500/10",
    text: "text-amber-300",
    border: "border-amber-500/30",
    icon: Trophy,
  },
  Research: {
    bg: "bg-purple-500/10",
    text: "text-purple-300",
    border: "border-purple-500/30",
    icon: BookOpen,
  },
  Award: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-300",
    border: "border-emerald-500/30",
    icon: Award,
  },
  Milestone: {
    bg: "bg-blue-500/10",
    text: "text-blue-300",
    border: "border-blue-500/30",
    icon: Zap,
  },
  Workshop: {
    bg: "bg-rose-500/10",
    text: "text-rose-300",
    border: "border-rose-500/30",
    icon: Sparkles,
  },
  Recognition: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-300",
    border: "border-cyan-500/30",
    icon: Award,
  },
};

export function AchievementsSection({ achievements }: AchievementsSectionProps) {
  if (!achievements || achievements.length === 0) {
    return (
      <section className="relative py-12 bg-black">
        <div className="container-wrap text-center rounded-3xl border border-[#262015] bg-[#0c0a07] p-12 text-zinc-500 text-xs">
          No community achievements published yet. New milestones added by the Executive Panel will appear here automatically.
        </div>
      </section>
    );
  }

  return (
    <section id="achievements" className="relative border-b border-[#1e1e1e] py-20 overflow-hidden bg-black">
      {/* Glow gradient background */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-3/4 rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(245,182,66,0.12),_transparent_70%)] blur-3xl" />

      <div className="container-wrap relative space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5b642]/30 bg-[#1e180d] px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#f5b642]">
            <Trophy className="h-3.5 w-3.5 text-[#f5b642]" />
            Club Milestones & Accolades
          </div>
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
            Our Proud{" "}
            <span className="bg-gradient-to-r from-[#f5b642] via-[#ffd06a] to-[#f5b642] bg-clip-text text-transparent">
              Achievements
            </span>
          </h2>
          <p className="text-sm sm:text-base text-zinc-400">
            Celebrating national hackathon victories, breakthrough research publications, and community impact.
          </p>
        </div>

        {/* Achievements Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((item) => {
            const badge = CATEGORY_BADGES[item.category] || CATEGORY_BADGES.Hackathon;
            const Icon = badge.icon;

            return (
              <div
                key={item.id}
                className="group relative flex flex-col justify-between rounded-3xl border border-[#26221a] bg-gradient-to-b from-[#14120e] to-[#0a0a09] p-6 shadow-xl transition-all duration-300 hover:-translate-y-2 hover:border-[#f5b642]/60 hover:shadow-[0_12px_40px_rgba(245,182,66,0.15)]"
              >
                {/* Accent top border */}
                <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#f5b642]/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="space-y-4">
                  {/* Category & Date */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-xl border ${badge.border} ${badge.bg} px-3 py-1 text-xs font-bold ${badge.text}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {item.category}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 font-mono">
                      <Calendar className="h-3 w-3" />
                      {item.achievement_date}
                    </span>
                  </div>

                  {/* Optional Image Banner */}
                  {item.image_url && (
                    <div className="relative h-44 w-full overflow-hidden rounded-2xl border border-[#2b2518]">
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  )}

                  {/* Headline & Caption */}
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-[#ffd06a] transition-colors leading-snug">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                      {item.caption}
                    </p>
                  </div>
                </div>

                {/* Footer Link */}
                {item.link_url && (
                  <div className="mt-6 pt-4 border-t border-[#221e16] flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-500 group-hover:text-zinc-300 transition">
                      Learn More
                    </span>
                    <a
                      href={item.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-[#1e190f] border border-[#3d3119] px-2.5 py-1 text-xs font-bold text-[#f5b642] hover:bg-[#f5b642] hover:text-black transition"
                    >
                      <span>Explore</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
