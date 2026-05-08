"use client";

import {
  approveMember,
  deleteEvent,
  deleteMember,
  deleteProject,
  deleteTeam,
  logoutAdmin,
  upsertEvent,
  upsertMember,
  upsertProject,
  upsertTeam,
} from "@/app/admin/actions";
import type { Event, Member, Project, Team } from "@/lib/types";
import { motion } from "framer-motion";
import { Calendar, FolderKanban, LogOut, Pencil, Trash2, Users, Network, CheckCircle } from "lucide-react";
import { useMemo, useState } from "react";

const gold = "#f5b642";

type TabId = "teams" | "members" | "events" | "projects";

const tabs: { id: TabId; label: string; icon: typeof Users }[] = [
  { id: "teams", label: "Teams", icon: Network },
  { id: "members", label: "Members", icon: Users },
  { id: "events", label: "Events", icon: Calendar },
  { id: "projects", label: "Projects", icon: FolderKanban },
];

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fieldClass(extra = "") {
  return [
    "w-full rounded-xl border border-[#323232] bg-[#141414] px-4 py-3 text-sm text-white",
    "outline-none transition placeholder:text-zinc-500",
    "focus:border-[#f5b642]/70 focus:ring-2 focus:ring-[#f5b642]/25",
    extra,
  ].join(" ");
}

function labelClass() {
  return "text-xs font-semibold tracking-[0.12em] text-zinc-400 uppercase";
}

export function AdminDashboardClient(props: {
  teams: Team[];
  members: Member[];
  events: Event[];
  projects: Project[];
}) {
  const { teams, members, events, projects } = props;
  const [tab, setTab] = useState<TabId>("teams");
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const teamById = useMemo(() => {
    const m = new Map<string, Team>();
    teams.forEach((t) => m.set(t.id, t));
    return m;
  }, [teams]);

  const activeMembers = useMemo(() => members.filter((m) => m.status === "active"), [members]);
  const pendingMembers = useMemo(() => members.filter((m) => m.status === "pending"), [members]);

  const tabIndex = tabs.findIndex((t) => t.id === tab);

  const sliderLeft = useMemo(() => {
    const idx = tabIndex < 0 ? 0 : tabIndex;
    return [
      "6px",
      "calc(6px + (100% - 12px) / 4)",
      "calc(6px + 2 * (100% - 12px) / 4)",
      "calc(6px + 3 * (100% - 12px) / 4)",
    ][idx];
  }, [tabIndex]);

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="border-b border-[#242424] bg-[#0c0c0c]">
        <div className="container-wrap flex flex-col gap-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-[#f5b642]/90 uppercase">
              Gen AI Club
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Admin Dashboard</h1>
            <p className="mt-2 max-w-xl text-sm text-zinc-400">
              Manage members, events, and projects. Changes apply to the live site.
            </p>
          </div>
          <form action={logoutAdmin}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl border border-[#3a3528] bg-[#14120e] px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-[#f5b642]/40 hover:text-white"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Logout
            </button>
          </form>
        </div>
      </div>

      <div className="container-wrap py-8">
        <div className="relative mb-10 rounded-2xl border border-[#2a2a2a] bg-[#121212] p-1.5">
          <motion.div
            className="pointer-events-none absolute top-1.5 bottom-1.5 rounded-xl border border-[#a97820]/45 bg-[#f5b642]/20 shadow-[0_0_24px_rgba(245,182,66,0.12)]"
            initial={false}
            animate={{
              left: sliderLeft,
              width: "calc((100% - 12px) / 4)",
            }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          />
          <div className="relative z-10 grid grid-cols-4 gap-0">
            {tabs.map(({ id, label, icon: Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setTab(id);
                  }}
                  className={[
                    "flex items-center justify-center gap-2 rounded-xl px-3 py-3.5 text-sm font-semibold transition-colors",
                    active ? "text-[#f5e6c8]" : "text-zinc-500 hover:text-zinc-300",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4 shrink-0" style={{ color: active ? gold : undefined }} aria-hidden />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Teams */}
        <div className={tab === "teams" ? "block space-y-8" : "hidden"}>
          <section className="rounded-3xl border border-[#272727] bg-[#0f0f0f] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.35)] sm:p-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white sm:text-2xl">
                  {editingTeam ? "Edit team" : "Add team"}
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  {editingTeam ? "Update details below, then save." : "Create a new team."}
                </p>
              </div>
              {editingTeam && (
                <button
                  type="button"
                  onClick={() => setEditingTeam(null)}
                  className="text-sm font-medium text-[#f5b642] hover:underline"
                >
                  Cancel edit
                </button>
              )}
            </div>

            <form
              key={editingTeam?.id ?? "new-team"}
              action={upsertTeam}
              className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {editingTeam && <input type="hidden" name="id" value={editingTeam.id} />}
              <div className="space-y-2">
                <label className={labelClass()} htmlFor="t-name">
                  Name
                </label>
                <input
                  id="t-name"
                  name="name"
                  required
                  defaultValue={editingTeam?.name ?? ""}
                  placeholder="e.g. Core Executive Panel"
                  className={fieldClass()}
                />
              </div>
              <div className="space-y-2">
                <label className={labelClass()} htmlFor="t-slug">
                  Slug
                </label>
                <input
                  id="t-slug"
                  name="slug"
                  required
                  defaultValue={editingTeam?.slug ?? ""}
                  placeholder="e.g. core-executive-panel"
                  className={fieldClass()}
                />
              </div>
              <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                <label className={labelClass()} htmlFor="t-desc">
                  Description
                </label>
                <textarea
                  id="t-desc"
                  name="description"
                  defaultValue={editingTeam?.description ?? ""}
                  placeholder="Brief description of the team"
                  className={fieldClass("min-h-[90px] resize-y")}
                />
              </div>
              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                <label className={labelClass()} htmlFor="t-file">
                  Image file
                </label>
                <input
                  id="t-file"
                  name="image_file"
                  type="file"
                  accept="image/*"
                  className={fieldClass("file:mr-3 file:rounded-lg file:border-0 file:bg-[#1f1f1f] file:px-3 file:py-1.5 file:text-xs file:text-zinc-300")}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className={labelClass()} htmlFor="t-img">
                  Image URL
                </label>
                <input
                  id="t-img"
                  name="image_url"
                  defaultValue={editingTeam?.image_url ?? ""}
                  placeholder="https://…"
                  className={fieldClass()}
                />
              </div>
              <div className="flex sm:col-span-2 lg:col-span-3">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-[#f5b642] px-5 py-3 text-sm font-semibold text-[#17120a] transition hover:bg-[#f8c35b] focus:outline-none focus:ring-2 focus:ring-[#f5b642]/40 focus:ring-offset-2 focus:ring-offset-[#0f0f0f] sm:w-auto sm:min-w-[200px]"
                >
                  {editingTeam ? "Update team" : "Save team"}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-3xl border border-[#272727] bg-[#0f0f0f] p-6 sm:p-8">
            <h3 className="text-lg font-semibold text-white">Existing teams</h3>
            <p className="mt-1 text-sm text-zinc-400">{teams.length} total</p>
            <ul className="mt-6 space-y-4">
              {teams.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-col gap-4 rounded-2xl border border-[#2f2f2f] bg-[#141414] p-4 sm:flex-row sm:items-stretch sm:justify-between"
                >
                  <div className="flex min-w-0 flex-1 gap-4">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[#3d3520] bg-[#1a1814]">
                      {t.image_url ? (
                        <img
                          src={t.image_url}
                          alt={`${t.name} photo`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-zinc-600">
                          No img
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-white">{t.name}</p>
                      <p className="mt-1 text-xs text-zinc-500">Slug: {t.slug}</p>
                      {t.description ? (
                        <p className="mt-2 text-sm leading-relaxed text-zinc-400 line-clamp-2">{t.description}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-row gap-2 sm:flex-col sm:justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTeam(t);
                        setTab("teams");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#3d3520] bg-[#1a1810] px-3 py-2 text-sm font-medium text-[#f5e6c8] transition hover:border-[#f5b642]/50 sm:flex-none"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      Edit
                    </button>
                    <form action={deleteTeam} className="flex-1 sm:flex-none">
                      <input type="hidden" name="id" value={t.id} />
                      <button
                        type="submit"
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-900/40 bg-red-950/40 px-3 py-2 text-sm font-medium text-red-200 transition hover:bg-red-950/60"
                        onClick={(e) => {
                          if (!confirm("Are you sure? Deleting this team will also delete all its members!")) {
                            e.preventDefault();
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        Delete
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
            {teams.length === 0 ? (
              <p className="mt-6 text-sm text-zinc-500">No teams yet. Add one above.</p>
            ) : null}
          </section>
        </div>

        {/* Members */}
        <div className={tab === "members" ? "block space-y-8" : "hidden"}>
          <section className="rounded-3xl border border-[#272727] bg-[#0f0f0f] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.35)] sm:p-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white sm:text-2xl">
                  {editingMember ? "Edit member" : "Add member"}
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  {editingMember
                    ? "Update details below, then save."
                    : "Create a new member and assign them to a team."}
                </p>
              </div>
              {editingMember && (
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="text-sm font-medium text-[#f5b642] hover:underline"
                >
                  Cancel edit
                </button>
              )}
            </div>

            <form
              key={editingMember?.id ?? "new-member"}
              action={upsertMember}
              className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {editingMember && <input type="hidden" name="id" value={editingMember.id} />}
              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                <label className={labelClass()} htmlFor="m-team">
                  Team
                </label>
                <select
                  id="m-team"
                  name="team_id"
                  required
                  defaultValue={editingMember?.team_id ?? ""}
                  className={fieldClass()}
                >
                  <option value="">Select team</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className={labelClass()} htmlFor="m-name">
                  Name
                </label>
                <input
                  id="m-name"
                  name="name"
                  required
                  defaultValue={editingMember?.name ?? ""}
                  placeholder="Full name"
                  className={fieldClass()}
                />
              </div>
              <div className="space-y-2">
                <label className={labelClass()} htmlFor="m-role">
                  Role
                </label>
                <input
                  id="m-role"
                  name="role"
                  required
                  defaultValue={editingMember?.role ?? ""}
                  placeholder="e.g. Lead"
                  className={fieldClass()}
                />
              </div>
              <div className="space-y-2">
                <label className={labelClass()} htmlFor="m-position">
                  Position
                </label>
                <input
                  id="m-position"
                  name="position"
                  required
                  defaultValue={editingMember?.position ?? ""}
                  className={fieldClass()}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className={labelClass()} htmlFor="m-linkedin">
                  LinkedIn URL
                </label>
                <input
                  id="m-linkedin"
                  name="linkedin_url"
                  defaultValue={editingMember?.linkedin_url ?? ""}
                  placeholder="https://linkedin.com/in/username"
                  className={fieldClass()}
                />
              </div>
              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                <label className={labelClass()} htmlFor="m-file">
                  Image file
                </label>
                <input
                  id="m-file"
                  name="image_file"
                  type="file"
                  accept="image/*"
                  className={fieldClass("file:mr-3 file:rounded-lg file:border-0 file:bg-[#1f1f1f] file:px-3 file:py-1.5 file:text-xs file:text-zinc-300")}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className={labelClass()} htmlFor="m-url">
                  Image URL
                </label>
                <input
                  id="m-url"
                  name="image_url"
                  defaultValue={editingMember?.image_url ?? ""}
                  placeholder="https://…"
                  className={fieldClass()}
                />
              </div>
              <div className="space-y-2">
                <label className={labelClass()} htmlFor="m-status">
                  Status
                </label>
                <select
                  id="m-status"
                  name="status"
                  defaultValue={editingMember?.status ?? "active"}
                  className={fieldClass()}
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div className="flex sm:col-span-2 lg:col-span-3">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-[#f5b642] px-5 py-3 text-sm font-semibold text-[#17120a] transition hover:bg-[#f8c35b] focus:outline-none focus:ring-2 focus:ring-[#f5b642]/40 focus:ring-offset-2 focus:ring-offset-[#0f0f0f] sm:w-auto sm:min-w-[200px]"
                >
                  {editingMember ? "Update member" : "Save member"}
                </button>
              </div>
            </form>
          </section>

          {pendingMembers.length > 0 && (
            <section className="rounded-3xl border border-yellow-900/30 bg-[#1a1400] p-6 sm:p-8">
              <h3 className="text-lg font-semibold text-[#f5b642]">Pending Approvals</h3>
              <p className="mt-1 text-sm text-[#f5b642]/70">{pendingMembers.length} member(s) awaiting approval.</p>
              <ul className="mt-6 space-y-4">
                {pendingMembers.map((member) => {
                  const teamName = teamById.get(member.team_id)?.name ?? "—";
                  return (
                    <li
                      key={member.id}
                      className="flex flex-col gap-4 rounded-2xl border border-yellow-900/50 bg-[#120e00] p-4 sm:flex-row sm:items-stretch sm:justify-between"
                    >
                      <div className="flex min-w-0 flex-1 gap-4">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-yellow-900/50 bg-[#1a1814]">
                          {member.image_url ? (
                            <img
                              src={member.image_url}
                              alt={`${member.name} photo`}
                              className="h-full w-full object-cover opacity-75 grayscale hover:grayscale-0 transition-all"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-zinc-600">
                              No img
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[#f5e6c8]">{member.name}</p>
                          <p className="mt-1 text-sm text-[#f5b642]/90">
                            {member.role}
                            <span className="text-zinc-500"> · </span>
                            <span className="text-zinc-400">{member.position}</span>
                          </p>
                          <p className="mt-1 text-xs text-yellow-600/70">Team: {teamName}</p>
                          {member.linkedin_url ? (
                            <p className="mt-2 text-sm leading-relaxed text-blue-400/80 hover:underline">
                              <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer">LinkedIn Profile</a>
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-row gap-2 sm:flex-col sm:justify-center">
                        <form action={approveMember} className="flex-1 sm:flex-none">
                          <input type="hidden" name="id" value={member.id} />
                          <button
                            type="submit"
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-green-900/40 bg-green-950/40 px-3 py-2 text-sm font-medium text-green-200 transition hover:bg-green-950/60"
                          >
                            <CheckCircle className="h-3.5 w-3.5" aria-hidden />
                            Approve
                          </button>
                        </form>
                        <form action={deleteMember} className="flex-1 sm:flex-none">
                          <input type="hidden" name="id" value={member.id} />
                          <button
                            type="submit"
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-900/40 bg-red-950/40 px-3 py-2 text-sm font-medium text-red-200 transition hover:bg-red-950/60"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            Reject
                          </button>
                        </form>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="rounded-3xl border border-[#272727] bg-[#0f0f0f] p-6 sm:p-8">
            <h3 className="text-lg font-semibold text-white">Active members</h3>
            <p className="mt-1 text-sm text-zinc-400">{activeMembers.length} total</p>
            <ul className="mt-6 space-y-4">
              {activeMembers.map((member) => {
                const teamName = teamById.get(member.team_id)?.name ?? "—";
                return (
                  <li
                    key={member.id}
                    className="flex flex-col gap-4 rounded-2xl border border-[#2f2f2f] bg-[#141414] p-4 sm:flex-row sm:items-stretch sm:justify-between"
                  >
                    <div className="flex min-w-0 flex-1 gap-4">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[#3d3520] bg-[#1a1814]">
                        {member.image_url ? (
                          <img
                            src={member.image_url}
                            alt={`${member.name} photo`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-600">
                            No img
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white">{member.name}</p>
                        <p className="mt-1 text-sm text-[#f5b642]/90">
                          {member.role}
                          <span className="text-zinc-500"> · </span>
                          <span className="text-zinc-400">{member.position}</span>
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">Team: {teamName}</p>
                        {member.linkedin_url ? (
                          <p className="mt-2 text-sm leading-relaxed text-blue-400 hover:underline">
                            <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer">LinkedIn Profile</a>
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-row gap-2 sm:flex-col sm:justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMember(member);
                          setTab("members");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#3d3520] bg-[#1a1810] px-3 py-2 text-sm font-medium text-[#f5e6c8] transition hover:border-[#f5b642]/50 sm:flex-none"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                        Edit
                      </button>
                      <form action={deleteMember} className="flex-1 sm:flex-none">
                        <input type="hidden" name="id" value={member.id} />
                        <button
                          type="submit"
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-900/40 bg-red-950/40 px-3 py-2 text-sm font-medium text-red-200 transition hover:bg-red-950/60"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          Delete
                        </button>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
            {activeMembers.length === 0 ? (
              <p className="mt-6 text-sm text-zinc-500">No active members yet. Add or approve one above.</p>
            ) : null}
          </section>
        </div>

        {/* Events */}
        <div className={tab === "events" ? "block space-y-8" : "hidden"}>
          <section className="rounded-3xl border border-[#272727] bg-[#0f0f0f] p-6 sm:p-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white sm:text-2xl">
                  {editingEvent ? "Edit event" : "Add event"}
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  {editingEvent ? "Update the event, then save." : "Create a new club event."}
                </p>
              </div>
              {editingEvent && (
                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  className="text-sm font-medium text-[#f5b642] hover:underline"
                >
                  Cancel edit
                </button>
              )}
            </div>
            <form
              key={editingEvent?.id ?? "new-event"}
              action={upsertEvent}
              className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {editingEvent && <input type="hidden" name="id" value={editingEvent.id} />}
              <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                <label className={labelClass()} htmlFor="e-title">
                  Title
                </label>
                <input
                  id="e-title"
                  name="title"
                  required
                  defaultValue={editingEvent?.title ?? ""}
                  className={fieldClass()}
                />
              </div>
              <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                <label className={labelClass()} htmlFor="e-desc">
                  Description
                </label>
                <textarea
                  id="e-desc"
                  name="description"
                  required
                  rows={3}
                  defaultValue={editingEvent?.description ?? ""}
                  className={fieldClass("min-h-[100px] resize-y")}
                />
              </div>
              <div className="space-y-2">
                <label className={labelClass()} htmlFor="e-venue">
                  Venue
                </label>
                <input
                  id="e-venue"
                  name="venue"
                  required
                  defaultValue={editingEvent?.venue ?? ""}
                  className={fieldClass()}
                />
              </div>
              <div className="space-y-2">
                <label className={labelClass()} htmlFor="e-date">
                  Date & time
                </label>
                <input
                  id="e-date"
                  name="event_date"
                  type="datetime-local"
                  required
                  defaultValue={editingEvent ? toDatetimeLocalValue(editingEvent.event_date) : ""}
                  className={fieldClass()}
                />
              </div>
              <div className="space-y-2">
                <label className={labelClass()} htmlFor="e-status">
                  Status
                </label>
                <select
                  id="e-status"
                  name="status"
                  defaultValue={editingEvent?.status ?? "upcoming"}
                  className={fieldClass()}
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="live">Live</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className={labelClass()} htmlFor="e-img-url">
                  Image URL
                </label>
                <input
                  id="e-img-url"
                  name="image_url"
                  defaultValue={editingEvent?.image_url ?? ""}
                  className={fieldClass()}
                />
              </div>
              <div className="space-y-2">
                <label className={labelClass()} htmlFor="e-file">
                  Image file
                </label>
                <input
                  id="e-file"
                  name="image_file"
                  type="file"
                  accept="image/*"
                  className={fieldClass("file:mr-3 file:rounded-lg file:border-0 file:bg-[#1f1f1f] file:px-3 file:py-1.5 file:text-xs file:text-zinc-300")}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className={labelClass()} htmlFor="e-reg">
                  Register URL
                </label>
                <input
                  id="e-reg"
                  name="register_url"
                  defaultValue={editingEvent?.register_url ?? ""}
                  className={fieldClass()}
                />
              </div>
              <div className="flex sm:col-span-2 lg:col-span-3">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-[#f5b642] px-5 py-3 text-sm font-semibold text-[#17120a] transition hover:bg-[#f8c35b] focus:outline-none focus:ring-2 focus:ring-[#f5b642]/40 focus:ring-offset-2 focus:ring-offset-[#0f0f0f] sm:w-auto sm:min-w-[200px]"
                >
                  {editingEvent ? "Update event" : "Save event"}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-3xl border border-[#272727] bg-[#0f0f0f] p-6 sm:p-8">
            <h3 className="text-lg font-semibold text-white">Existing events</h3>
            <p className="mt-1 text-sm text-zinc-400">{events.length} total</p>
            <ul className="mt-6 space-y-4">
              {events.map((event) => (
                <li
                  key={event.id}
                  className="flex flex-col gap-4 rounded-2xl border border-[#2f2f2f] bg-[#141414] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white">{event.title}</p>
                    <p className="mt-1 text-sm text-zinc-400">{event.venue}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {new Date(event.event_date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} ·{" "}
                      <span className="text-[#f5b642]/80">{event.status}</span>
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm text-zinc-500">{event.description}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEvent(event);
                        setTab("events");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#3d3520] bg-[#1a1810] px-3 py-2 text-sm font-medium text-[#f5e6c8]"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      Edit
                    </button>
                    <form action={deleteEvent}>
                      <input type="hidden" name="id" value={event.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-900/40 bg-red-950/40 px-3 py-2 text-sm font-medium text-red-200"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        Delete
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
            {events.length === 0 ? (
              <p className="mt-6 text-sm text-zinc-500">No events yet.</p>
            ) : null}
          </section>
        </div>

        {/* Projects */}
        <div className={tab === "projects" ? "block space-y-8" : "hidden"}>
          <section className="rounded-3xl border border-[#272727] bg-[#0f0f0f] p-6 sm:p-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white sm:text-2xl">
                  {editingProject ? "Edit project" : "Add project"}
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  {editingProject ? "Update project details below." : "Add a new showcased project."}
                </p>
              </div>
              {editingProject && (
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="text-sm font-medium text-[#f5b642] hover:underline"
                >
                  Cancel edit
                </button>
              )}
            </div>
            <form
              key={editingProject?.id ?? "new-project"}
              action={upsertProject}
              className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {editingProject && <input type="hidden" name="id" value={editingProject.id} />}
              <div className="space-y-2 sm:col-span-2">
                <label className={labelClass()} htmlFor="p-title">
                  Title
                </label>
                <input
                  id="p-title"
                  name="title"
                  required
                  defaultValue={editingProject?.title ?? ""}
                  className={fieldClass()}
                />
              </div>
              <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                <label className={labelClass()} htmlFor="p-short">
                  Short description
                </label>
                <p className="text-xs text-zinc-500">10–240 characters (required).</p>
                <textarea
                  id="p-short"
                  name="short_description"
                  required
                  rows={3}
                  defaultValue={editingProject?.short_description ?? ""}
                  placeholder="At least 10 characters describing the project."
                  className={fieldClass("min-h-[90px] resize-y")}
                />
              </div>
              <div className="space-y-2">
                <label className={labelClass()} htmlFor="p-img">
                  Image URL
                </label>
                <input
                  id="p-img"
                  name="image_url"
                  defaultValue={editingProject?.image_url ?? ""}
                  className={fieldClass()}
                />
              </div>
              <div className="space-y-2">
                <label className={labelClass()} htmlFor="p-file">
                  Image file
                </label>
                <input
                  id="p-file"
                  name="image_file"
                  type="file"
                  accept="image/*"
                  className={fieldClass("file:mr-3 file:rounded-lg file:border-0 file:bg-[#1f1f1f] file:px-3 file:py-1.5 file:text-xs file:text-zinc-300")}
                />
              </div>
              <div className="space-y-2">
                <label className={labelClass()} htmlFor="p-gh">
                  GitHub URL
                </label>
                <input
                  id="p-gh"
                  name="github_url"
                  defaultValue={editingProject?.github_url ?? ""}
                  className={fieldClass()}
                />
              </div>
              <div className="space-y-2">
                <label className={labelClass()} htmlFor="p-live">
                  Live URL
                </label>
                <input
                  id="p-live"
                  name="live_url"
                  defaultValue={editingProject?.live_url ?? ""}
                  className={fieldClass()}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className={labelClass()} htmlFor="p-blog">
                  Blog URL
                </label>
                <input
                  id="p-blog"
                  name="blog_url"
                  defaultValue={editingProject?.blog_url ?? ""}
                  className={fieldClass()}
                />
              </div>
              <div className="flex sm:col-span-2 lg:col-span-3">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-[#f5b642] px-5 py-3 text-sm font-semibold text-[#17120a] transition hover:bg-[#f8c35b] focus:outline-none focus:ring-2 focus:ring-[#f5b642]/40 focus:ring-offset-2 focus:ring-offset-[#0f0f0f] sm:w-auto sm:min-w-[200px]"
                >
                  {editingProject ? "Update project" : "Save project"}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-3xl border border-[#272727] bg-[#0f0f0f] p-6 sm:p-8">
            <h3 className="text-lg font-semibold text-white">Existing projects</h3>
            <p className="mt-1 text-sm text-zinc-400">{projects.length} total</p>
            <ul className="mt-6 space-y-4">
              {projects.map((project) => (
                <li
                  key={project.id}
                  className="flex flex-col gap-4 rounded-2xl border border-[#2f2f2f] bg-[#141414] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white">{project.title}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{project.short_description}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProject(project);
                        setTab("projects");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#3d3520] bg-[#1a1810] px-3 py-2 text-sm font-medium text-[#f5e6c8]"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      Edit
                    </button>
                    <form action={deleteProject}>
                      <input type="hidden" name="id" value={project.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-900/40 bg-red-950/40 px-3 py-2 text-sm font-medium text-red-200"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        Delete
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
            {projects.length === 0 ? (
              <p className="mt-6 text-sm text-zinc-500">No projects yet.</p>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
