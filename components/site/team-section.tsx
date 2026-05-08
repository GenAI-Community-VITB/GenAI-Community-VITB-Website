"use client";

import Link from "next/link";
import {
  BrainCircuit,
  Cpu,
  DollarSign,
  FlaskConical,
  Megaphone,
  Palette,
  PenLine,
  Share2,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";

interface TeamWithMembers {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  members?: { id: string }[];
}

// Map each team slug to a lucide icon + accent colour pair
const TEAM_META: Record<
  string,
  { Icon: typeof Star; accent: string; glow: string }
> = {
  "core-executive-panel": {
    Icon: Star,
    accent: "#f5b642",
    glow: "rgba(245,182,66,0.22)",
  },
  "supervision-committee": {
    Icon: ShieldCheck,
    accent: "#a78bfa",
    glow: "rgba(167,139,250,0.20)",
  },
  "technical-team": {
    Icon: Cpu,
    accent: "#38bdf8",
    glow: "rgba(56,189,248,0.20)",
  },
  "event-management-team": {
    Icon: Users,
    accent: "#fb923c",
    glow: "rgba(251,146,60,0.20)",
  },
  "finance-team": {
    Icon: DollarSign,
    accent: "#4ade80",
    glow: "rgba(74,222,128,0.20)",
  },
  "content-team": {
    Icon: PenLine,
    accent: "#f472b6",
    glow: "rgba(244,114,182,0.20)",
  },
  "design-team": {
    Icon: Palette,
    accent: "#e879f9",
    glow: "rgba(232,121,249,0.20)",
  },
  "pr-outreach-team": {
    Icon: Megaphone,
    accent: "#facc15",
    glow: "rgba(250,204,21,0.20)",
  },
  "social-media-team": {
    Icon: Share2,
    accent: "#34d399",
    glow: "rgba(52,211,153,0.20)",
  },
  "ai-ml-innovation-team": {
    Icon: BrainCircuit,
    accent: "#f87171",
    glow: "rgba(248,113,113,0.20)",
  },
  "research-development-team": {
    Icon: FlaskConical,
    accent: "#60a5fa",
    glow: "rgba(96,165,250,0.20)",
  },
};

const FALLBACK_META = {
  Icon: Users,
  accent: "#f5b642",
  glow: "rgba(245,182,66,0.18)",
};

export function TeamSection({ teams }: { teams: TeamWithMembers[] }) {
  return (
    <section
      id="team"
      className="relative border-b border-[#1e1e1e] py-20 overflow-hidden"
    >
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(245,182,66,0.06),transparent)]" />
      <div className="pointer-events-none absolute left-0 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-[#f5b642]/[0.04] blur-3xl" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-72 w-72 rounded-full bg-[#a78bfa]/[0.04] blur-3xl" />

      <div className="container-wrap relative">
        {/* Heading */}
        <div className="mb-12 text-center">
          <p className="text-xs font-semibold tracking-[0.22em] text-[#f5b642]/80 uppercase">
            Our People
          </p>
          <h2 className="mt-3 text-4xl font-bold text-white sm:text-5xl">
            Meet the{" "}
            <span className="bg-gradient-to-r from-[#f5b642] to-[#ffd06a] bg-clip-text text-transparent">
              Teams
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-[#888]">
            The Gen AI Club is powered by passionate sub-teams — each driving a
            unique pillar of our community.
          </p>
          <div className="mx-auto mt-5 h-px w-24 bg-gradient-to-r from-transparent via-[#f5b642]/50 to-transparent" />
        </div>

        {/* Cards grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {teams.map((team) => {
            const meta = TEAM_META[team.slug] ?? FALLBACK_META;
            const { Icon, accent, glow } = meta;
            const memberCount = (team.members ?? []).length;

            return (
              <TeamCard
                key={team.id}
                href={`/team/${team.slug}`}
                name={team.name}
                description={team.description}
                memberCount={memberCount}
                Icon={Icon}
                accent={accent}
                glow={glow}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Individual card ──────────────────────────────────────────────────────────

function TeamCard({
  href,
  name,
  description,
  memberCount,
  Icon,
  accent,
  glow,
}: {
  href: string;
  name: string;
  description: string | null;
  memberCount: number;
  Icon: typeof Star;
  accent: string;
  glow: string;
}) {
  return (
    <Link
      href={href}
      className="team-card group relative flex flex-col rounded-2xl border border-[#222] bg-[#0d0d0d] p-5 shadow-lg transition-all duration-300 hover:-translate-y-1.5 hover:border-[var(--card-accent)] hover:shadow-[0_0_28px_var(--card-glow)]"
      style={
        {
          "--card-accent": accent,
          "--card-glow": glow,
        } as React.CSSProperties
      }
    >
      {/* Shimmer line on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-[var(--card-accent)] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />

      {/* Icon badge */}
      <div
        className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border transition-colors duration-300"
        style={{
          borderColor: `${accent}30`,
          backgroundColor: `${accent}12`,
        }}
      >
        <Icon
          className="h-5 w-5 transition-transform duration-300 group-hover:scale-110"
          style={{ color: accent }}
          aria-hidden
        />
      </div>

      {/* Team name */}
      <h3 className="text-base font-semibold leading-snug text-white transition-colors duration-200 group-hover:text-[var(--card-accent)]">
        {name}
      </h3>

      {/* Description */}
      <p className="mt-2 flex-1 text-sm leading-relaxed text-[#666] line-clamp-2">
        {description ?? "A dedicated team working towards club excellence."}
      </p>

      {/* Footer — member count + arrow */}
      <div className="mt-4 flex items-center justify-between">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
          style={{
            borderColor: `${accent}28`,
            backgroundColor: `${accent}10`,
            color: accent,
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: accent }}
          />
          {memberCount} {memberCount === 1 ? "member" : "members"}
        </span>

        <span
          className="text-xs font-medium opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100"
          style={{ color: accent }}
        >
          View →
        </span>
      </div>
    </Link>
  );
}
