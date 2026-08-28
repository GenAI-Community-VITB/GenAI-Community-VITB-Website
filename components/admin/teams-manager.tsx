"use client";

import { useState, useTransition } from "react";
import type { Team } from "@/lib/types";
import { CLUB_TEAMS } from "@/lib/types";
import { upsertTeam, deleteTeam } from "@/app/admin/actions";
import {
  Network,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { useScrollLock } from "@/lib/utils/scroll-lock";

interface TeamsManagerProps {
  initialTeams: Team[];
  isAllowed?: boolean;
}

export function TeamsManager({ initialTeams, isAllowed = true }: TeamsManagerProps) {
  // If no teams in DB yet, preload official club verticals as starter state
  const defaultClubTeams: Team[] = CLUB_TEAMS.map((ct, idx) => ({
    id: `official-${ct.id}`,
    name: ct.name,
    slug: ct.id.replace(/_/g, "-"),
    description: ct.description,
    image_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const [teams, setTeams] = useState<Team[]>(
    initialTeams.length > 0 ? initialTeams : defaultClubTeams,
  );
  const [showModal, setShowModal] = useState(false);
  useScrollLock(showModal);
  const [editingItem, setEditingItem] = useState<Team | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isAllowed) return null;

  function resetForm() {
    setEditingItem(null);
    setName("");
    setSlug("");
    setDescription("");
    setImageUrl("");
    setImageFile(null);
    setImagePreview(null);
    setShowModal(false);
  }

  function handleOpenEdit(item: Team) {
    setEditingItem(item);
    setName(item.name);
    setSlug(item.slug);
    setDescription(item.description || "");
    setImageUrl(item.image_url || "");
    setImageFile(null);
    setImagePreview(item.image_url || null);
    setShowModal(true);
  }

  function handleNameChange(val: string) {
    setName(val);
    if (!editingItem && (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
      try {
        const fd = new FormData();
        if (editingItem) fd.append("id", editingItem.id);
        fd.append("name", name.trim());
        fd.append("slug", slug.trim().toLowerCase());
        fd.append("description", description.trim());
        if (imageUrl) fd.append("image_url", imageUrl.trim());
        if (imageFile) fd.append("image_file", imageFile);

        const res = await upsertTeam(fd);
        if (res && res.success === false) {
          setMessage({ type: "error", text: res.error || "Failed to save team." });
          return;
        }

        setMessage({
          type: "success",
          text: editingItem ? "Team vertical updated successfully." : "Team vertical created successfully.",
        });

        if (res?.team) {
          if (editingItem) {
            setTeams((prev) => prev.map((t) => (t.id === res.team.id ? res.team : t)));
          } else {
            setTeams((prev) => [res.team, ...prev.filter((t) => t.id !== res.team.id)]);
          }
        } else if (editingItem) {
          setTeams((prev) =>
            prev.map((t) =>
              t.id === editingItem.id
                ? {
                    ...t,
                    name: name.trim(),
                    slug: slug.trim().toLowerCase(),
                    description: description.trim() || null,
                    image_url: imagePreview || imageUrl || t.image_url,
                    updated_at: new Date().toISOString(),
                  }
                : t,
            ),
          );
        }

        resetForm();
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Failed to save team." });
      }
    });
  }

  function handleDelete(id: string, teamName: string) {
    if (!confirm(`Are you sure you want to delete the "${teamName}" team?`)) return;

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("id", id);
        const res = await deleteTeam(fd);
        if (res && res.success === false) {
          setMessage({ type: "error", text: res.error || "Failed to delete team." });
          return;
        }
        setTeams((prev) => prev.filter((t) => t.id !== id));
        setMessage({ type: "success", text: `Team "${teamName}" deleted successfully.` });
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Failed to delete team." });
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Network className="h-5 w-5 text-[#f5b642]" />
            Club Vertical Teams Management
          </h2>
          <p className="text-xs text-zinc-400">
            Create, configure, and manage technical pillars, research divisions, and operational verticals.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#f5b642] px-3.5 py-2 text-xs font-bold text-black hover:bg-[#ffd06a] transition cursor-pointer self-start sm:self-auto shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add Team
        </button>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 rounded-2xl border p-4 text-xs ${
            message.type === "success"
              ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
              : "border-red-500/30 bg-red-950/20 text-red-300"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Grid of Teams */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <div
            key={team.id}
            className="flex flex-col justify-between rounded-2xl border border-[#2b2416] bg-[#120f0a] p-5 shadow-lg space-y-4 hover:border-[#f5b642]/50 transition duration-200"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-[#f5b642] bg-[#221a0e] px-2.5 py-0.5 rounded-lg border border-[#3d3019]">
                  /{team.slug}
                </span>
                <span className="font-mono text-[10px] text-zinc-500">
                  {new Date(team.created_at || Date.now()).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                </span>
              </div>

              {team.image_url && (
                <div className="relative h-28 w-full overflow-hidden rounded-xl border border-[#2e2618]">
                  <img
                    src={team.image_url}
                    alt={team.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              <div>
                <h4 className="font-bold text-sm text-white leading-snug">{team.name}</h4>
                {team.description ? (
                  <p className="text-xs text-zinc-400 line-clamp-3 mt-1 leading-relaxed">
                    {team.description}
                  </p>
                ) : (
                  <p className="text-xs text-zinc-600 italic mt-1">No description provided</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#221c12]">
              <a
                href={`/team/${team.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-[#f5b642] hover:underline"
              >
                View Page →
              </a>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(team)}
                  className="p-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-[#f5b642] transition cursor-pointer"
                  title="Edit Team"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(team.id, team.name)}
                  className="p-1.5 rounded-lg border border-red-900/50 text-red-400 hover:bg-red-950/40 transition cursor-pointer"
                  title="Delete Team"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-black/95 backdrop-blur-2xl">
          <div className="w-full max-w-lg max-h-[88vh] flex flex-col rounded-3xl border-2 border-[#f5b642] bg-[#0d0a06] shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden">
            {/* Fixed Header */}
            <div className="flex items-center justify-between border-b border-[#221c12] px-6 py-4 bg-[#14100b] shrink-0">
              <div className="flex items-center gap-2">
                <Network className="h-5 w-5 text-[#f5b642]" />
                <h3 className="font-bold text-white text-base">
                  {editingItem ? "Edit Vertical Team" : "Add New Vertical Team"}
                </h3>
              </div>
              <button
                onClick={resetForm}
                className="text-zinc-400 hover:text-white text-xs cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="team-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Vertical Team Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. AI/ML & Research Division"
                  className="w-full rounded-xl border border-[#332714] bg-[#18140d] px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  URL Slug * (Unique Identifier)
                </label>
                <div className="flex items-center rounded-xl border border-[#332714] bg-[#18140d] px-3.5 py-2.5 text-xs text-white focus-within:border-[#f5b642]">
                  <span className="text-zinc-500 mr-1 select-none font-mono">/team/</span>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="aiml-research"
                    className="w-full bg-transparent font-mono text-white placeholder:text-zinc-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Mission & Focus Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the division's technical objectives, projects, and activities..."
                  className="w-full rounded-xl border border-[#332714] bg-[#18140d] px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none resize-y"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Team Banner / Icon Image (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setImageFile(f);
                      if (f) setImagePreview(URL.createObjectURL(f));
                    }}
                    className="text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-[#f5b642] file:px-2.5 file:py-1 file:text-xs file:font-bold file:text-black hover:file:bg-[#ffd06a] cursor-pointer"
                  />
                </div>
                {imagePreview && (
                  <div className="relative mt-2 h-24 w-full rounded-xl overflow-hidden border border-[#332714]">
                    <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                  </div>
                )}
                <div>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      if (e.target.value) setImagePreview(e.target.value);
                    }}
                    placeholder="Or paste image URL (https://...)"
                    className="w-full rounded-xl border border-[#332714] bg-[#18140d] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                  />
                </div>
              </div>

            </form>

            {/* Fixed Action Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-[#221c12] px-6 py-3.5 bg-[#120f0a] shrink-0 z-20">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="team-form"
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#f5b642] bg-[#f5b642] px-5 py-2 text-xs font-bold text-black hover:bg-[#ffd06a] disabled:opacity-50 transition cursor-pointer shadow-[0_0_15px_rgba(245,182,66,0.25)]"
              >
                {isPending ? "Saving..." : editingItem ? "Update Team" : "Create Team"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
