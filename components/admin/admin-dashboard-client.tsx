"use client";

import { logoutAdmin } from "@/app/admin/actions";
import { createClientSupabase } from "@/lib/supabase/client";
import type { Event, Member, Project, Team, UserRole } from "@/lib/types";
import { motion } from "framer-motion";
import Image from "next/image";
import ClubIcon from "@/assets/ClubIcon.png";
import {
  LogOut,
  Users,
  ShieldCheck,
  Calendar,
  Sparkles,
  ChevronRight,
  CreditCard,
  QrCode,
  FileText,
  ArrowUpRight,
  FolderKanban,
  Network,
  Trophy,
  Activity,
  Medal,
  Clock,
  UserCheck,
  Share2,
} from "lucide-react";
import { ChangePasswordButton } from "@/components/admin/change-password-modal";
import { TeamsManager } from "@/components/admin/teams-manager";
import { EventsManager } from "@/components/admin/events-manager";
import { AdminInactivityChip } from "@/components/admin/inactivity-timer";
import { ProjectsManager } from "@/components/admin/projects-manager";
import { AchievementsManager } from "@/components/admin/achievements-manager";
import { WinnersManager } from "@/components/admin/winners-manager";
import { SocialMediaManager } from "@/components/admin/social-media-manager";
import { Exec6Notifications, Exec6PendingBanner } from "@/components/admin/exec6-notifications";
import type { Achievement } from "@/lib/types";
import type { EventWinner } from "@/lib/data/winners";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen } from "lucide-react";

type TabId = "teams" | "events" | "projects" | "blogs" | "achievements" | "winners";

const tabs: { id: TabId; label: string; icon: any }[] = [
  { id: "teams", label: "Teams", icon: Network },
  { id: "events", label: "Events", icon: Calendar },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "blogs", label: "Blogs & LinkedIn AI", icon: BookOpen },
  { id: "achievements", label: "Achievements", icon: Trophy },
  { id: "winners", label: "Event Winners", icon: Medal },
];

export function AdminDashboardClient(props: {
  teams: Team[];
  members: Member[];
  events: Event[];
  projects: Project[];
  achievements?: Achievement[];
  winners?: EventWinner[];
  userRole?: string;
  userName?: string;
  isTop6?: boolean;
}) {
  const {
    teams,
    members,
    events,
    projects,
    achievements = [],
    winners = [],
    userRole = "tech",
    userName = "Administrator",
    isTop6 = true,
  } = props;
  const [tab, setTab] = useState<TabId | null>(null);
  const [currentEvents, setCurrentEvents] = useState<Event[]>(events);

  useEffect(() => {
    setCurrentEvents(events);
  }, [events]);

  const [activeOnlineCount, setActiveOnlineCount] = useState<number>(1);

  useEffect(() => {
    // Connect to Supabase Realtime presence channel for live logged-in admin count
    try {
      const supabase = createClientSupabase();
      const channel = supabase.channel("admin_online_presence", {
        config: {
          presence: {
            key: userName,
          },
        },
      });

      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState();
          const uniqueUsers = Object.keys(state).length;
          setActiveOnlineCount(Math.max(1, uniqueUsers));
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel.track({
              user: userName,
              role: userRole,
              online_at: new Date().toISOString(),
            });
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    } catch {
      setActiveOnlineCount(1);
    }
  }, [userName, userRole]);

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      {/* Top Command Center Header */}
      <div className="border-b border-[#221c12] bg-[#0c0a08]/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="container-wrap flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="overflow-hidden rounded-2xl border border-[#f5b642]/40 bg-[#16120b] p-1.5 shadow-[0_0_20px_rgba(245,182,66,0.15)] shrink-0">
              <Image
                src={ClubIcon}
                alt="Club Icon"
                width={40}
                height={40}
                className="h-9 w-9 object-cover rounded-xl"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#f5b642]">
                  Command Center
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Authenticated
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <h1 className="text-xl font-extrabold text-white sm:text-2xl tracking-tight">
                  {userRole}
                </h1>
                {isTop6 ? (
                  <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-300">
                    👑 Top Executive
                  </span>
                ) : (
                  <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-300">
                    Active
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap">
            {tab !== null && (
              <button
                type="button"
                onClick={() => setTab(null)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#2e2618] bg-[#14110b] px-3.5 py-2 text-xs font-semibold text-zinc-300 transition hover:border-[#f5b642] hover:text-[#f5b642] cursor-pointer"
              >
                <span>← Back to Hub</span>
              </button>
            )}
            <Exec6Notifications isTop6={isTop6} />
            <ChangePasswordButton />
            <form action={logoutAdmin}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-2 text-xs font-bold text-red-300 transition hover:border-red-500/60 hover:bg-red-900/30 hover:text-red-200 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Logout</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="container-wrap py-5 space-y-5">
        {/* Welcome Banner - Compact Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-[#382b14] bg-gradient-to-r from-[#17120a] via-[#100d07] to-[#0a0805] px-5 py-4 shadow-xl"
        >
          <div className="absolute top-0 right-0 h-32 w-32 bg-radial from-[#f5b642]/15 via-transparent to-transparent blur-xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#221a0e] text-[#f5b642] border border-[#3d3019] shadow-inner">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Welcome back, <span className="text-[#f5b642]">{userName}</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Select an administrative workspace below to curate content or manage live events.
                </p>
              </div>
            </div>

            {/* Live Logged-In Members Count & Inactivity Auto-Logout Timer Chips */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-2 rounded-xl border border-emerald-900/40 bg-emerald-950/20 px-3 py-1.5 text-emerald-300">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                <Users className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>
                  <strong className="text-white font-medium">
                    {activeOnlineCount} {activeOnlineCount === 1 ? "Member" : "Members"}
                  </strong>
                  <span className="text-[11px] text-zinc-400 ml-1">Logged In</span>
                </span>
              </div>

              <AdminInactivityChip />
            </div>
          </div>
        </motion.div>

        {/* Exec 6 Pending Requests Banner */}
        <Exec6PendingBanner isTop6={isTop6} />

        {/* Operations Hub (Compact 1-row Live Event Systems) */}
        <section className="rounded-2xl border border-[#262015] bg-gradient-to-b from-[#120f0a] to-[#090806] p-4 sm:p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-[#221c12] pb-2.5">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#f5b642] uppercase tracking-wider">
              <Activity className="h-3 w-3" />
              Live Event Systems & Core Controls
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Registration Management */}
            <Link
              href="/admin/finance"
              className="group flex items-center justify-between rounded-xl border border-[#2a2216] bg-[#13100a] p-3 transition duration-200 hover:border-[#f5b642] hover:bg-[#1a140b] hover:shadow-[0_4px_20px_rgba(245,182,66,0.12)]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#221a0e] text-[#f5b642] border border-[#3d3019]">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div className="truncate">
                  <h4 className="font-bold text-white text-xs group-hover:text-[#f5b642] transition truncate">
                    Registration Management
                  </h4>
                  <p className="text-[10px] text-zinc-400 truncate">
                    Verify proofs, passes & registrations
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-zinc-600 group-hover:text-[#f5b642] transition" />
            </Link>

            {/* QR Scanner */}
            <Link
              href="/admin/scanner"
              className="group flex items-center justify-between rounded-xl border border-[#2a2216] bg-[#13100a] p-3 transition duration-200 hover:border-[#f5b642] hover:bg-[#1a140b] hover:shadow-[0_4px_20px_rgba(245,182,66,0.12)]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#221a0e] text-[#f5b642] border border-[#3d3019]">
                  <QrCode className="h-4 w-4" />
                </div>
                <div className="truncate">
                  <h4 className="font-bold text-white text-xs group-hover:text-[#f5b642] transition truncate">
                    QR Scanner
                  </h4>
                  <p className="text-[10px] text-zinc-400 truncate">
                    Camera pass check-in
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-zinc-600 group-hover:text-[#f5b642] transition" />
            </Link>

            {/* Staff Directory & Audit Logs (for Top 6 or Tech) */}
            {(isTop6 || userRole === "tech") && (
              <>
                {/* Community Members Management */}
                <Link
                  href="/admin/users"
                  className="group flex items-center justify-between rounded-xl border border-[#2a2216] bg-[#13100a] p-3 transition duration-200 hover:border-emerald-500 hover:bg-[#131710] hover:shadow-[0_4px_20px_rgba(52,211,153,0.12)]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-950/30 text-emerald-400 border border-emerald-900/40">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div className="truncate">
                      <h4 className="font-bold text-white text-xs group-hover:text-emerald-400 transition truncate">
                        Community Members Management
                      </h4>
                      <p className="text-[10px] text-zinc-400 truncate">
                        51 members & passwords
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-zinc-600 group-hover:text-emerald-400 transition" />
                </Link>

                {/* Audit Logs */}
                <Link
                  href="/admin/audit"
                  className="group flex items-center justify-between rounded-xl border border-[#2a2216] bg-[#13100a] p-3 transition duration-200 hover:border-purple-500 hover:bg-[#17111a] hover:shadow-[0_4px_20px_rgba(168,85,247,0.12)]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-950/30 text-purple-400 border border-purple-900/40">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="truncate">
                      <h4 className="font-bold text-white text-xs group-hover:text-purple-400 transition truncate">
                        Audit Logs
                      </h4>
                      <p className="text-[10px] text-zinc-400 truncate">
                        System-wide action history
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-zinc-600 group-hover:text-purple-400 transition" />
                </Link>
              </>
            )}
          </div>
        </section>

        {/* Content Management Workspaces Selection */}
        <section className="space-y-6">
          <div className="flex flex-col gap-1 border-b border-[#221c12] pb-4">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#f5b642] uppercase tracking-wider">
              <FolderKanban className="h-3 w-3" />
              Website Content Management
            </div>
            <h3 className="text-xl font-extrabold text-white">Interactive Workspaces</h3>
          </div>

          {/* Horizontal Workspace Selector Bar with Golden Glow */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {tabs.map(({ id, label, icon: Icon }) => {
              const active = tab === id;
              let count = 0;
              if (id === "teams") count = teams.length;
              else if (id === "events") count = currentEvents.length;
              else if (id === "projects") count = projects.length;
              else if (id === "achievements") count = achievements.length;
              else if (id === "winners") count = winners.length;
              else if (id === "blogs") count = 6;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(active ? null : id)}
                  className={[
                    "group relative flex items-center justify-between gap-3 rounded-2xl border p-3.5 sm:p-4 transition-all duration-300 cursor-pointer",
                    active
                      ? "border-[#f5b642] bg-gradient-to-r from-[#2a1f0c] via-[#1f1708] to-[#140f05] shadow-[0_0_30px_rgba(245,182,66,0.3)] ring-1 ring-[#f5b642]"
                      : "border-[#262015] bg-[#120f0a] hover:border-[#f5b642]/60 hover:bg-[#18130c] hover:shadow-[0_0_20px_rgba(245,182,66,0.15)]",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={[
                        "flex h-9 w-9 items-center justify-center rounded-xl border shrink-0 transition",
                        active
                          ? "border-[#f5b642] bg-[#f5b642] text-black shadow-[0_0_15px_rgba(245,182,66,0.4)]"
                          : "border-[#382b14] bg-[#1a140b] text-[#f5b642] group-hover:border-[#f5b642]/50",
                      ].join(" ")}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="text-left truncate">
                      <span
                        className={[
                          "font-extrabold text-xs block truncate transition",
                          active ? "text-[#f5b642]" : "text-white group-hover:text-[#f5b642]",
                        ].join(" ")}
                      >
                        {label}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono block">
                        {id === "blogs" ? "AI Ingest" : `${count} ${count === 1 ? "item" : "items"}`}
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    className={[
                      "h-3.5 w-3.5 shrink-0 transition-transform",
                      active ? "rotate-90 text-[#f5b642]" : "text-zinc-600 group-hover:text-zinc-400",
                    ].join(" ")}
                  />
                </button>
              );
            })}
          </div>

          {/* Active Workspace View with Ambient Golden Glow */}
          {tab && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-3xl border border-[#3d3019] bg-gradient-to-b from-[#141009] via-[#0e0c08] to-[#070604] p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-6"
            >
              {/* Radial glow backdrop */}
              <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-[600px] bg-[radial-gradient(ellipse_at_center,_rgba(245,182,66,0.12),_transparent_70%)] blur-3xl" />

              <div className="relative z-10 flex items-center justify-between border-b border-[#221c12] pb-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#f5b642] animate-pulse shadow-[0_0_10px_#f5b642]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#f5b642]">
                    Live Workspace Active: {tabs.find((t) => t.id === tab)?.label}
                  </span>
                </div>
              </div>

              {/* ── 1. Teams Management ── */}
              <div className={tab === "teams" ? "block space-y-8" : "hidden"}>
                <TeamsManager
                  initialTeams={teams}
                  isAllowed={isTop6 || userRole === "tech"}
                />
              </div>

              {/* ── 2. Events Management ── */}
              <div className={tab === "events" ? "block space-y-8" : "hidden"}>
                <EventsManager
                  initialEvents={currentEvents}
                  onEventsChange={setCurrentEvents}
                  isAllowed={isTop6 || userRole === "tech" || userRole.toLowerCase().includes("event")}
                />
              </div>

              {/* ── 3. Projects Management ── */}
              <div className={tab === "projects" ? "block space-y-8" : "hidden"}>
                <ProjectsManager
                  initialProjects={projects}
                  isAllowed={isTop6 || userRole === "tech"}
                />
              </div>

              {/* ── 4. Blogs & LinkedIn AI Management ── */}
              <div className={tab === "blogs" ? "block space-y-8" : "hidden"}>
                <SocialMediaManager
                  isAllowed={isTop6 || userRole === "tech"}
                />
              </div>

              {/* ── 5. Achievements Management ── */}
              <div className={tab === "achievements" ? "block space-y-8" : "hidden"}>
                <AchievementsManager
                  initialAchievements={achievements}
                  isAllowed={isTop6 || userRole === "tech"}
                />
              </div>

              {/* ── 6. Event Winners & Podium Management ── */}
              <div className={tab === "winners" ? "block space-y-8" : "hidden"}>
                <WinnersManager
                  initialWinners={winners}
                  isAllowed={isTop6 || userRole === "tech" || userRole.toLowerCase().includes("event")}
                />
              </div>

              {/* Bottom Close Workspace Footer */}
              <div className="flex items-center justify-between border-t border-[#221c12] pt-6 mt-8">
                <span className="text-xs text-zinc-400">
                  Editing {tabs.find((t) => t.id === tab)?.label} · Changes apply in real time
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setTab(null);
                    window.scrollTo({ top: 400, behavior: "smooth" });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#3d3019] bg-[#16120b] px-4 py-2 text-xs font-bold text-[#f5b642] hover:bg-[#221a0e] hover:border-[#f5b642] transition cursor-pointer"
                >
                  <span>Close Active Workspace ✕</span>
                </button>
              </div>
            </motion.div>
          )}
        </section>
      </div>
    </div>
  );
}
