"use client";

import { useState, useMemo } from "react";
import { EventWinner } from "@/lib/data/winners";
import {
  Trophy,
  Medal,
  Award,
  Sparkles,
  ExternalLink,
  Code2,
  Users,
  Calendar,
  Gift,
  Search,
  Flame,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";

export function WinnersSection({ winners }: { winners: EventWinner[] }) {
  const [selectedEvent, setSelectedEvent] = useState<string>("all");
  const [search, setSearch] = useState("");

  const eventNames = useMemo(() => {
    const set = new Set(winners.map((w) => w.eventName));
    return Array.from(set);
  }, [winners]);

  const filteredWinners = useMemo(() => {
    return winners.filter((w) => {
      const matchEvent = selectedEvent === "all" || w.eventName === selectedEvent;
      const matchSearch =
        search === "" ||
        w.teamName.toLowerCase().includes(search.toLowerCase()) ||
        w.projectTitle.toLowerCase().includes(search.toLowerCase()) ||
        w.members.some((m) => m.toLowerCase().includes(search.toLowerCase()));
      return matchEvent && matchSearch;
    });
  }, [winners, selectedEvent, search]);

  // Determine latest / grand champion winner for the centered showcase
  const latestGrandWinner = useMemo(() => {
    if (filteredWinners.length === 0) return null;
    const grand = filteredWinners.find((w) => w.position === "1st");
    return grand || filteredWinners[0];
  }, [filteredWinners]);

  const remainingWinners = useMemo(() => {
    if (!latestGrandWinner) return [];
    return filteredWinners.filter((w) => w.id !== latestGrandWinner.id);
  }, [filteredWinners, latestGrandWinner]);

  const getPositionBadge = (pos: EventWinner["position"]) => {
    switch (pos) {
      case "1st":
        return {
          label: "1st Place · Grand Champion",
          badgeBg: "border-[#f5b642] bg-[#f5b642]/15 text-[#f5b642] shadow-[0_0_15px_rgba(245,182,66,0.25)]",
          icon: Trophy,
          iconColor: "text-[#f5b642]",
        };
      case "2nd":
        return {
          label: "2nd Place · Runner Up",
          badgeBg: "border-slate-400/60 bg-slate-400/15 text-slate-200 shadow-[0_0_12px_rgba(203,213,225,0.15)]",
          icon: Medal,
          iconColor: "text-slate-300",
        };
      case "3rd":
        return {
          label: "3rd Place · Second Runner Up",
          badgeBg: "border-amber-700/60 bg-amber-700/15 text-amber-500 shadow-[0_0_12px_rgba(180,83,9,0.15)]",
          icon: Medal,
          iconColor: "text-amber-600",
        };
      default:
        return {
          label: pos,
          badgeBg: "border-sky-500/60 bg-sky-500/15 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.15)]",
          icon: Award,
          iconColor: "text-sky-400",
        };
    }
  };

  return (
    <section className="relative bg-black overflow-hidden">
      <div className="container-wrap relative space-y-10">
        {/* Controls: Event Tabs & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#221d14] pb-6">
          {/* Event Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar w-full sm:w-auto">
            <button
              onClick={() => setSelectedEvent("all")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition shrink-0 cursor-pointer ${
                selectedEvent === "all"
                  ? "bg-[#f5b642] text-black shadow-[0_0_20px_rgba(245,182,66,0.35)]"
                  : "border border-[#2e2618] bg-[#14110b] text-zinc-400 hover:text-white"
              }`}
            >
              All Events ({winners.length})
            </button>
            {eventNames.map((name) => (
              <button
                key={name}
                onClick={() => setSelectedEvent(name)}
                className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition shrink-0 cursor-pointer ${
                  selectedEvent === name
                    ? "bg-[#f5b642] text-black font-bold shadow-[0_0_20px_rgba(245,182,66,0.35)]"
                    : "border border-[#2e2618] bg-[#14110b] text-zinc-400 hover:text-white"
                }`}
              >
                {name}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team, project, or student..."
              className="w-full rounded-xl border border-[#2e2618] bg-[#120f0a] pl-10 pr-4 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:ring-1 focus:ring-[#f5b642] focus:outline-none"
            />
          </div>
        </div>

        {/* Empty State */}
        {filteredWinners.length === 0 ? (
          <div className="rounded-3xl border border-[#221c13] bg-[#0c0a07] p-12 text-center text-zinc-500 text-xs">
            No event winners match the specified search or filter.
          </div>
        ) : (
          <div className="space-y-10">
            {/* Centered Glowing Spotlight: Latest Winner / Grand Champion */}
            {latestGrandWinner && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="relative max-w-4xl mx-auto"
              >
                {/* Outer Glow Halo */}
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-[#f5b642]/30 via-[#ffd06a]/20 to-[#f5b642]/30 blur-xl opacity-75 group-hover:opacity-100 transition duration-500" />

                <div className="relative rounded-3xl border-2 border-[#f5b642]/70 bg-gradient-to-b from-[#18130c] via-[#100d08] to-[#0a0805] p-6 sm:p-9 shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(245,182,66,0.18)] space-y-6">
                  {/* Top Bar with Event Badge & Champion Pill */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2a2215] pb-4">
                    <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                      <span className="flex items-center gap-1 text-[#f5b642] font-bold">
                        <Flame className="h-4 w-4" />
                        SPOTLIGHT
                      </span>
                      <span>·</span>
                      <Calendar className="h-3.5 w-3.5 text-[#f5b642]" />
                      <span>{latestGrandWinner.eventName} ({latestGrandWinner.eventDate})</span>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="rounded-full border border-[#f5b642] bg-[#f5b642]/15 px-3.5 py-1 text-xs font-black text-[#f5b642] flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,182,66,0.3)]">
                        <Trophy className="h-4 w-4 text-[#f5b642]" />
                        {latestGrandWinner.position === "1st" ? "Grand Champion · 1st Place" : latestGrandWinner.position}
                      </span>
                    </div>
                  </div>

                  {/* Team Title & Project Focus */}
                  <div className="space-y-4 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                      <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                        {latestGrandWinner.teamName}
                      </h2>
                      <div className="inline-flex items-center gap-1.5 self-center sm:self-auto text-xs font-bold text-[#f5b642] font-mono">
                        <Gift className="h-4 w-4 text-[#f5b642]" />
                        <span>{latestGrandWinner.prizeAward}</span>
                      </div>
                    </div>

                    {/* Winning Project Card inside Spotlight */}
                    <div className="rounded-2xl border border-[#332717] bg-[#120e09] p-4 sm:p-5 space-y-2 text-left shadow-inner">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-[#f5b642]" />
                        <span className="text-xs font-bold text-amber-400 font-mono uppercase tracking-wider">
                          Winning Project:
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-extrabold text-white">
                        {latestGrandWinner.projectTitle}
                      </h3>
                      <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
                        {latestGrandWinner.projectDescription}
                      </p>
                    </div>

                    {/* Team Members List */}
                    <div className="space-y-2 text-left">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 font-mono">
                        <Users className="h-3.5 w-3.5 text-[#f5b642]" />
                        Team Members:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {latestGrandWinner.members.map((member) => (
                          <span
                            key={member}
                            className="rounded-xl border border-[#2e2618] bg-[#14110b] px-3 py-1 text-xs font-semibold text-zinc-200 flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="h-3 w-3 text-[#f5b642]" />
                            {member}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Spotlight Footer Links */}
                  <div className="flex items-center justify-between pt-4 border-t border-[#2a2215]">
                    <span className="text-[11px] font-mono text-zinc-500">
                      Verified by GenAI Club Operations Matrix
                    </span>
                    <div className="flex items-center gap-2">
                      {latestGrandWinner.githubUrl && (
                        <a
                          href={latestGrandWinner.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#332717] bg-[#14110b] text-zinc-300 transition hover:border-[#f5b642] hover:text-[#f5b642] shadow-md"
                          title="View Repository"
                        >
                          <Code2 className="h-4 w-4" />
                        </a>
                      )}
                      {latestGrandWinner.demoUrl && (
                        <a
                          href={latestGrandWinner.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#332717] bg-[#14110b] text-zinc-300 transition hover:border-[#f5b642] hover:text-[#f5b642] shadow-md"
                          title="Live Demo"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Remaining Winners Grid */}
            {remainingWinners.length > 0 && (
              <div className="space-y-6 pt-6">
                <div className="flex items-center gap-2 border-b border-[#221c13] pb-3">
                  <Trophy className="h-4 w-4 text-[#f5b642]" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Podium Finishers & Special Recognitions ({remainingWinners.length})
                  </h3>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {remainingWinners.map((winner, idx) => {
                    const badgeInfo = getPositionBadge(winner.position);
                    const BadgeIcon = badgeInfo.icon;

                    return (
                      <motion.div
                        key={winner.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{ duration: 0.45, delay: idx * 0.08 }}
                        className="group relative flex flex-col justify-between rounded-3xl border border-[#2e2517] bg-gradient-to-b from-[#14100b] to-[#0a0805] p-6 shadow-xl transition-all duration-300 hover:border-[#f5b642]/60 hover:shadow-[0_15px_35px_rgba(245,182,66,0.14)]"
                      >
                        <div className="space-y-4">
                          {/* Top Row: Event Name & Position Badge */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400">
                                <Calendar className="h-3 w-3 text-[#f5b642]" />
                                <span>{winner.eventName}</span>
                              </div>
                              <h4 className="text-lg font-black text-white mt-1 group-hover:text-[#ffd06a] transition-colors">
                                {winner.teamName}
                              </h4>
                            </div>

                            <div className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold shrink-0 ${badgeInfo.badgeBg}`}>
                              <BadgeIcon className={`h-3 w-3 ${badgeInfo.iconColor}`} />
                              <span>{badgeInfo.label.split("·")[0]}</span>
                            </div>
                          </div>

                          {/* Project Card */}
                          <div className="rounded-2xl border border-[#261f14] bg-[#0e0b07] p-3.5 space-y-1.5">
                            <span className="text-[10px] font-bold text-amber-400 font-mono uppercase tracking-wider block">
                              Project:
                            </span>
                            <h5 className="text-xs font-extrabold text-white">
                              {winner.projectTitle}
                            </h5>
                            <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-3">
                              {winner.projectDescription}
                            </p>
                          </div>

                          {/* Team Members */}
                          <div className="space-y-1">
                            <p className="text-[9.5px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              Members:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {winner.members.map((member) => (
                                <span
                                  key={member}
                                  className="rounded-lg border border-[#241e13] bg-[#120f0a] px-2 py-0.5 text-[10px] font-medium text-zinc-300"
                                >
                                  {member}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Footer Prize & Links */}
                        <div className="mt-5 flex items-center justify-between border-t border-[#221c13] pt-3">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#f5b642]">
                            <Gift className="h-3.5 w-3.5 text-[#f5b642]" />
                            <span className="truncate max-w-[170px]">{winner.prizeAward}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {winner.githubUrl && (
                              <a
                                href={winner.githubUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:border-[#f5b642] hover:text-white"
                                title="Repository"
                              >
                                <Code2 className="h-3.5 w-3.5" />
                              </a>
                            )}
                            {winner.demoUrl && (
                              <a
                                href={winner.demoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:border-[#f5b642] hover:text-white"
                                title="Live Demo"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
