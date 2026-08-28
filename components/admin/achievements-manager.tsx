"use client";

import { useState, useTransition } from "react";
import { Achievement, AchievementCategory } from "@/lib/types";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import {
  upsertAchievementAction,
  deleteAchievementAction,
} from "@/lib/data/achievements";
import { useScrollLock } from "@/lib/utils/scroll-lock";
import {
  Trophy,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Calendar,
  ImageIcon,
} from "lucide-react";

interface AchievementsManagerProps {
  initialAchievements: Achievement[];
  isAllowed: boolean;
}

export function AchievementsManager({
  initialAchievements,
  isAllowed,
}: AchievementsManagerProps) {
  const [achievements, setAchievements] = useState(initialAchievements);
  const [showModal, setShowModal] = useState(false);
  useScrollLock(showModal);
  const [editingItem, setEditingItem] = useState<Achievement | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState<AchievementCategory>("Hackathon");
  const [achievementDate, setAchievementDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [linkUrl, setLinkUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isAllowed) {
    return null;
  }

  function resetForm() {
    setEditingItem(null);
    setTitle("");
    setCaption("");
    setCategory("Hackathon");
    setAchievementDate(new Date().toISOString().split("T")[0]);
    setLinkUrl("");
    setImageFile(null);
    setImagePreview(null);
    setShowModal(false);
  }

  function handleOpenEdit(item: Achievement) {
    setEditingItem(item);
    setTitle(item.title);
    setCaption(item.caption);
    setCategory(item.category);
    setAchievementDate(item.achievement_date);
    setLinkUrl(item.link_url || "");
    setImageFile(null);
    setImagePreview(item.image_url || null);
    setShowModal(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
      try {
        const fd = new FormData();
        if (editingItem) fd.append("id", editingItem.id);
        fd.append("title", title);
        fd.append("caption", caption);
        fd.append("category", category);
        fd.append("achievement_date", achievementDate);
        if (linkUrl) fd.append("link_url", linkUrl);
        if (imageFile) fd.append("image_file", imageFile);

        const res = await upsertAchievementAction(fd);

        setMessage({
          type: "success",
          text: editingItem ? "Achievement updated successfully." : "Achievement published successfully.",
        });

        if (res?.achievement) {
          if (editingItem) {
            setAchievements((prev) => prev.map((a) => (a.id === res.achievement.id ? res.achievement : a)));
          } else {
            setAchievements((prev) => [res.achievement, ...prev.filter((a) => a.id !== res.achievement.id)]);
          }
        } else if (editingItem) {
          setAchievements((prev) =>
            prev.map((a) =>
              a.id === editingItem.id
                ? {
                    ...a,
                    title,
                    caption,
                    category,
                    achievement_date: achievementDate,
                    link_url: linkUrl || null,
                    image_url: imagePreview || a.image_url,
                  }
                : a,
            ),
          );
        }

        resetForm();
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Failed to save achievement." });
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this achievement?")) return;

    startTransition(async () => {
      try {
        await deleteAchievementAction(id);
        setAchievements((prev) => prev.filter((a) => a.id !== id));
        setMessage({ type: "success", text: "Achievement deleted." });
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Failed to delete achievement." });
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="h-5 w-5 text-[#f5b642]" />
            Achievements Management
          </h2>
          <p className="text-xs text-zinc-400">
            Publish milestones, research acceptances, and national awards displayed on the homepage.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#f5b642] px-3.5 py-2 text-xs font-bold text-black hover:bg-[#ffd06a] transition"
        >
          <Plus className="h-4 w-4" />
          Add Achievement
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
          {message.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {achievements.map((item) => (
          <div
            key={item.id}
            className="flex flex-col justify-between rounded-2xl border border-[#2b2b2b] bg-[#121212] p-5 shadow-lg space-y-4"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                  {item.category}
                </span>
                <span className="font-mono text-[10px] text-zinc-500">{item.achievement_date}</span>
              </div>

              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="h-32 w-full object-cover rounded-xl border border-zinc-800"
                />
              )}

              <h4 className="font-bold text-sm text-white leading-snug">{item.title}</h4>
              <p className="text-xs text-zinc-400 line-clamp-3">{item.caption}</p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
              {item.link_url ? (
                <a
                  href={item.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-[#f5b642] hover:underline flex items-center gap-1"
                >
                  Link <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(item)}
                  className="p-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 rounded-lg border border-red-900/50 text-red-400 hover:bg-red-950/40"
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
        <div className="fixed inset-0 z-[99999] overflow-y-auto bg-black/95 backdrop-blur-2xl">
          <div className="flex min-h-full items-center justify-center p-3 sm:p-6">
            <div className="relative w-full max-w-lg max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col rounded-3xl border-2 border-[#f5b642] bg-[#0d0a06] shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden my-auto">
            {/* Fixed Header */}
            <div className="flex items-center justify-between border-b border-[#221c12] px-6 py-4 bg-[#14100b] shrink-0">
              <h3 className="font-bold text-white text-base">
                {editingItem ? "Edit Achievement" : "Add New Achievement"}
              </h3>
              <button onClick={resetForm} className="text-zinc-400 hover:text-white text-xs cursor-pointer p-1">
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="achievement-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Headline / Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 1st Place at National GenAI Hackathon 2026"
                  className="w-full rounded-xl border border-[#333] bg-[#181818] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Caption / Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Summarize the achievement, project, or award details..."
                  className="w-full rounded-xl border border-[#333] bg-[#181818] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Category
                  </label>
                  <CustomDropdown
                    value={category}
                    onChange={(val) => setCategory(val as AchievementCategory)}
                    options={[
                      { value: "Hackathon", label: "🏆 Hackathon" },
                      { value: "Research", label: "📚 Research" },
                      { value: "Award", label: "🎖️ Award" },
                      { value: "Milestone", label: "⚡ Milestone" },
                      { value: "Workshop", label: "✨ Workshop" },
                      { value: "Recognition", label: "🌟 Recognition" },
                    ]}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={achievementDate}
                    onChange={(e) => setAchievementDate(e.target.value)}
                    className="w-full rounded-xl border border-[#333] bg-[#181818] px-3.5 py-2 text-xs text-white focus:border-[#f5b642] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Link / Project URL (Optional)
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-[#333] bg-[#181818] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Image / Certificate Banner (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setImageFile(f);
                    if (f) setImagePreview(URL.createObjectURL(f));
                  }}
                  className="text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-[#f5b642] file:px-2.5 file:py-1 file:text-xs file:font-bold file:text-black hover:file:bg-[#ffd06a]"
                />
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
                form="achievement-form"
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#f5b642] bg-[#f5b642] px-5 py-2 text-xs font-bold text-black hover:bg-[#ffd06a] disabled:opacity-50 transition cursor-pointer shadow-[0_0_15px_rgba(245,182,66,0.25)]"
              >
                {isPending ? "Saving..." : editingItem ? "Update Achievement" : "Publish Achievement"}
              </button>
            </div>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
