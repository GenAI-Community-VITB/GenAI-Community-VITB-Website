"use client";

import { useState, useTransition } from "react";
import { EventWinner } from "@/lib/data/winners";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import { upsertWinnerAction, deleteWinnerAction } from "@/app/admin/winners-actions";
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
  Gift,
  Medal,
  Users,
  Code2,
} from "lucide-react";

interface WinnersManagerProps {
  initialWinners: EventWinner[];
  isAllowed: boolean;
}

export function WinnersManager({
  initialWinners,
  isAllowed,
}: WinnersManagerProps) {
  const [winners, setWinners] = useState(initialWinners);
  const [showModal, setShowModal] = useState(false);
  useScrollLock(showModal);
  const [editingItem, setEditingItem] = useState<EventWinner | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [eventName, setEventName] = useState("");
  const [position, setPosition] = useState<EventWinner["position"]>("1st");
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [prizeAward, setPrizeAward] = useState("");
  const [eventDate, setEventDate] = useState(new Date().toISOString().split("T")[0]);
  const [githubUrl, setGithubUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isAllowed) {
    return null;
  }

  function resetForm() {
    setEditingItem(null);
    setEventName("");
    setPosition("1st");
    setTeamName("");
    setMembers("");
    setProjectTitle("");
    setProjectDescription("");
    setPrizeAward("");
    setEventDate(new Date().toISOString().split("T")[0]);
    setGithubUrl("");
    setDemoUrl("");
    setImageFile(null);
    setImagePreview(null);
    setShowModal(false);
  }

  function handleOpenEdit(item: EventWinner) {
    setEditingItem(item);
    setEventName(item.eventName);
    setPosition(item.position);
    setTeamName(item.teamName);
    setMembers(item.members.join(", "));
    setProjectTitle(item.projectTitle);
    setProjectDescription(item.projectDescription);
    setPrizeAward(item.prizeAward);
    setEventDate(item.eventDate);
    setGithubUrl(item.githubUrl || "");
    setDemoUrl(item.demoUrl || "");
    setImageFile(null);
    setImagePreview(item.imageUrl || null);
    setShowModal(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
      try {
        const fd = new FormData();
        if (editingItem) fd.append("id", editingItem.id);
        fd.append("event_name", eventName);
        fd.append("position", position);
        fd.append("team_name", teamName);
        fd.append("members", members);
        fd.append("project_title", projectTitle);
        fd.append("project_description", projectDescription);
        fd.append("prize_award", prizeAward);
        fd.append("event_date", eventDate);
        if (githubUrl) fd.append("github_url", githubUrl);
        if (demoUrl) fd.append("demo_url", demoUrl);
        if (imageFile) fd.append("image_file", imageFile);

        const res = await upsertWinnerAction(fd);

        setMessage({
          type: "success",
          text: editingItem ? "Winner record updated successfully." : "Winner published successfully.",
        });

        const membersArray = members.split(",").map((s) => s.trim()).filter(Boolean);

        if (res?.winner) {
          const mappedWinner: EventWinner = {
            id: res.winner.id,
            eventName: res.winner.event_name,
            position: res.winner.position,
            teamName: res.winner.team_name,
            members: Array.isArray(res.winner.members) ? res.winner.members : membersArray,
            projectTitle: res.winner.project_title,
            projectDescription: res.winner.project_description,
            prizeAward: res.winner.prize_award,
            eventDate: res.winner.event_date,
            imageUrl: res.winner.image_url || undefined,
            githubUrl: res.winner.github_url || undefined,
            demoUrl: res.winner.demo_url || undefined,
          };
          if (editingItem) {
            setWinners((prev) => prev.map((w) => (w.id === mappedWinner.id ? mappedWinner : w)));
          } else {
            setWinners((prev) => [mappedWinner, ...prev.filter((w) => w.id !== mappedWinner.id)]);
          }
        } else if (editingItem) {
          setWinners((prev) =>
            prev.map((w) =>
              w.id === editingItem.id
                ? {
                    ...w,
                    eventName,
                    position,
                    teamName,
                    members: membersArray,
                    projectTitle,
                    projectDescription,
                    prizeAward,
                    eventDate,
                    githubUrl: githubUrl || undefined,
                    demoUrl: demoUrl || undefined,
                    imageUrl: imagePreview || w.imageUrl,
                  }
                : w,
            ),
          );
        }

        resetForm();
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Failed to save winner record." });
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this winner record?")) return;

    startTransition(async () => {
      try {
        await deleteWinnerAction(id);
        setWinners((prev) => prev.filter((w) => w.id !== id));
        setMessage({ type: "success", text: "Winner record deleted." });
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Failed to delete winner record." });
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Medal className="h-5 w-5 text-[#f5b642]" />
            Event Winners & Podium Management
          </h2>
          <p className="text-xs text-zinc-400">
            Publish official event champions, podium finishers, winning project details, and cash/credit awards.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#f5b642] px-3.5 py-2 text-xs font-bold text-black hover:bg-[#ffd06a] transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Winner Record
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
        {winners.map((item) => (
          <div
            key={item.id}
            className="flex flex-col justify-between rounded-2xl border border-[#2b2b2b] bg-[#121212] p-5 shadow-lg space-y-4"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                  {item.position} Place
                </span>
                <span className="font-mono text-[10px] text-zinc-500">{item.eventDate}</span>
              </div>

              <h4 className="font-bold text-sm text-white leading-snug">{item.teamName}</h4>
              <p className="text-xs text-amber-400 font-semibold">{item.projectTitle}</p>
              <p className="text-xs text-zinc-400 line-clamp-2">{item.projectDescription}</p>

              <div className="pt-2 text-[11px] text-zinc-400 space-y-1">
                <p className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-zinc-500" />
                  <span className="truncate">{item.members.join(", ")}</span>
                </p>
                <p className="flex items-center gap-1.5 text-[#f5b642] font-semibold">
                  <Gift className="h-3.5 w-3.5 text-[#f5b642]" />
                  <span className="truncate">{item.prizeAward}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
              <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[140px]">
                {item.eventName}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(item)}
                  className="p-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 rounded-lg border border-red-900/50 text-red-400 hover:bg-red-950/40 cursor-pointer"
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
        <div className="fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/95 backdrop-blur-2xl">
          <div className="relative m-auto w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl border-2 border-[#f5b642] bg-[#0d0a06] shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden shrink-0">
            {/* Fixed Header */}
            <div className="flex items-center justify-between border-b border-[#221c12] px-6 py-4 bg-[#14100b] shrink-0">
              <h3 className="font-bold text-white text-base">
                {editingItem ? "Edit Winner Record" : "Add Winner Record"}
              </h3>
              <button onClick={resetForm} className="text-zinc-400 hover:text-white text-xs cursor-pointer p-1">
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="winner-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Event Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="e.g. Prompt-to-Product Hackathon 2026"
                    className="w-full rounded-xl border border-[#333] bg-[#181818] px-3.5 py-2 text-xs text-white focus:border-[#f5b642] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Podium Position
                  </label>
                  <CustomDropdown
                    value={position}
                    onChange={(val) => setPosition(val as EventWinner["position"])}
                    options={[
                      { value: "1st", label: "🥇 1st Place (Grand Champions)" },
                      { value: "2nd", label: "🥈 2nd Place (Runners Up)" },
                      { value: "3rd", label: "🥉 3rd Place" },
                      { value: "Innovation Award", label: "💡 Innovation Award" },
                      { value: "Special Mention", label: "⭐ Special Mention" },
                    ]}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Winning Team / Student Name *
                </label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. NeuralSynth AI"
                  className="w-full rounded-xl border border-[#333] bg-[#181818] px-3.5 py-2 text-xs text-white focus:border-[#f5b642] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Team Members (Comma-separated)
                </label>
                <input
                  type="text"
                  value={members}
                  onChange={(e) => setMembers(e.target.value)}
                  placeholder="e.g. Arnav Sharma, Rhea Sengupta, Kunal Patel"
                  className="w-full rounded-xl border border-[#333] bg-[#181818] px-3.5 py-2 text-xs text-white focus:border-[#f5b642] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Winning Project Title *
                </label>
                <input
                  type="text"
                  required
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="e.g. OmniAgent: Real-Time Multimodal Assistant"
                  className="w-full rounded-xl border border-[#333] bg-[#181818] px-3.5 py-2 text-xs text-white focus:border-[#f5b642] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Project Description
                </label>
                <textarea
                  rows={2}
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Brief overview of the technical solution built..."
                  className="w-full rounded-xl border border-[#333] bg-[#181818] px-3.5 py-2 text-xs text-white focus:border-[#f5b642] focus:outline-none"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Prize / Award Details
                  </label>
                  <input
                    type="text"
                    value={prizeAward}
                    onChange={(e) => setPrizeAward(e.target.value)}
                    placeholder="e.g. ₹25,000 + Cloud Credits & Trophy"
                    className="w-full rounded-xl border border-[#333] bg-[#181818] px-3.5 py-2 text-xs text-white focus:border-[#f5b642] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full rounded-xl border border-[#333] bg-[#181818] px-3.5 py-2 text-xs text-white focus:border-[#f5b642] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    GitHub Repo URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/..."
                    className="w-full rounded-xl border border-[#333] bg-[#181818] px-3.5 py-2 text-xs text-white focus:border-[#f5b642] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Live Demo URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={demoUrl}
                    onChange={(e) => setDemoUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-[#333] bg-[#181818] px-3.5 py-2 text-xs text-white focus:border-[#f5b642] focus:outline-none"
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
                form="winner-form"
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#f5b642] bg-[#f5b642] px-5 py-2 text-xs font-bold text-black hover:bg-[#ffd06a] disabled:opacity-50 transition cursor-pointer shadow-[0_0_15px_rgba(245,182,66,0.25)]"
              >
                {isPending ? "Saving..." : editingItem ? "Update Winner" : "Publish Winner"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
