"use client";

import { useState, useTransition, useMemo } from "react";
import type { Member, Team } from "@/lib/types";
import { upsertMember, deleteMember } from "@/app/admin/actions";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Search,
  ExternalLink,
  Filter,
  UserCheck,
  Shield,
} from "lucide-react";
import { GithubIcon } from "@/components/ui/icons";
import { useScrollLock } from "@/lib/utils/scroll-lock";
import { HierarchyAvatar } from "@/components/site/hierarchy-tree";

interface MembersManagerProps {
  initialMembers: Member[];
  teams: Team[];
  isAllowed?: boolean;
}

export function MembersManager({
  initialMembers,
  teams,
  isAllowed = true,
}: MembersManagerProps) {
  const [membersList, setMembersList] = useState<Member[]>(initialMembers);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  useScrollLock(showModal);
  const [editingItem, setEditingItem] = useState<Member | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form State
  const [teamId, setTeamId] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [position, setPosition] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"active" | "pending">("active");

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isAllowed) return null;

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return membersList.filter((m) => {
      const matchTeam = selectedTeamFilter === "all" || m.team_id === selectedTeamFilter;
      const matchSearch =
        searchQuery.trim() === "" ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.position.toLowerCase().includes(searchQuery.toLowerCase());
      return matchTeam && matchSearch;
    });
  }, [membersList, selectedTeamFilter, searchQuery]);

  function resetForm() {
    setEditingItem(null);
    setTeamId(teams[0]?.id || "");
    setName("");
    setRole("");
    setPosition("");
    setGithubUrl("");
    setLinkedinUrl("");
    setImageUrl("");
    setImageFile(null);
    setImagePreview(null);
    setStatus("active");
    setShowModal(false);
  }

  function handleOpenCreate() {
    resetForm();
    if (teams.length > 0) {
      setTeamId(selectedTeamFilter !== "all" ? selectedTeamFilter : teams[0].id);
    }
    setShowModal(true);
  }

  function handleOpenEdit(item: Member) {
    setEditingItem(item);
    setTeamId(item.team_id);
    setName(item.name);
    setRole(item.role);
    setPosition(item.position);
    setGithubUrl(item.github_url || "");
    setLinkedinUrl(item.linkedin_url || "");
    setImageUrl(item.image_url || "");
    setImageFile(null);
    setImagePreview(item.image_url || null);
    setStatus(item.status || "active");
    setShowModal(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!teamId) {
      setMessage({ type: "error", text: "Please select a team vertical." });
      return;
    }

    startTransition(async () => {
      try {
        const fd = new FormData();
        if (editingItem) fd.append("id", editingItem.id);
        fd.append("team_id", teamId);
        fd.append("name", name.trim());
        fd.append("role", role.trim());
        fd.append("position", position.trim());
        if (githubUrl) fd.append("github_url", githubUrl.trim());
        if (linkedinUrl) fd.append("linkedin_url", linkedinUrl.trim());
        if (imageUrl) fd.append("image_url", imageUrl.trim());
        if (imageFile) fd.append("image_file", imageFile);
        fd.append("status", status);

        const res = await upsertMember(fd);
        if (res && res.success === false) {
          setMessage({ type: "error", text: res.error || "Failed to save member." });
          return;
        }

        setMessage({
          type: "success",
          text: editingItem ? "Member updated successfully." : "Member added successfully.",
        });

        if (res?.member) {
          if (editingItem) {
            setMembersList((prev) => prev.map((m) => (m.id === res.member.id ? res.member : m)));
          } else {
            setMembersList((prev) => [res.member, ...prev.filter((m) => m.id !== res.member.id)]);
          }
        }

        resetForm();
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Failed to save member." });
      }
    });
  }

  function handleDelete(id: string, memberName: string) {
    if (!confirm(`Are you sure you want to permanently remove "${memberName}"?`)) return;

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("id", id);
        const res = await deleteMember(fd);
        if (res && res.success === false) {
          setMessage({ type: "error", text: res.error || "Failed to delete member." });
          return;
        }
        setMembersList((prev) => prev.filter((m) => m.id !== id));
        setMessage({ type: "success", text: `Member "${memberName}" removed successfully.` });
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Failed to delete member." });
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#2b2416] pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-[#f5b642]" />
            Team Members Roster & Management
          </h2>
          <p className="text-xs text-zinc-400">
            Add, update, or remove student leaders and technical contributors across all vertical teams.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#f5b642] px-4 py-2 text-xs font-bold text-black hover:bg-[#ffd06a] transition cursor-pointer self-start sm:self-auto shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add Member
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

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, role, or position..."
            className="w-full rounded-xl border border-[#2b2416] bg-[#120f0a] pl-9 pr-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
          <select
            value={selectedTeamFilter}
            onChange={(e) => setSelectedTeamFilter(e.target.value)}
            className="rounded-xl border border-[#2b2416] bg-[#120f0a] px-3 py-2 text-xs text-white focus:border-[#f5b642] focus:outline-none cursor-pointer"
          >
            <option value="all">All Teams ({membersList.length})</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Members Grid / List */}
      {filteredMembers.length === 0 ? (
        <div className="rounded-2xl border border-[#2b2416] bg-[#0d0b07] p-8 text-center space-y-2">
          <Users className="h-8 w-8 text-zinc-600 mx-auto" />
          <p className="text-sm font-semibold text-zinc-400">No members found</p>
          <p className="text-xs text-zinc-600">
            {searchQuery ? "Try refining your search query." : "Add your first team member using the button above."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMembers.map((m) => {
            const team = teams.find((t) => t.id === m.team_id);
            return (
              <div
                key={m.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-[#262015] bg-[#100d08] p-4 hover:border-[#f5b642]/60 hover:bg-[#15110a] transition duration-150 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-xl overflow-hidden shrink-0 border border-[#332b1d] bg-[#1c160e]">
                    <HierarchyAvatar
                      name={m.name}
                      avatarUrl={m.image_url}
                      className="h-full w-full object-cover"
                      fallbackClassName="flex h-full w-full items-center justify-center font-bold text-xs text-[#f5b642]"
                    />
                  </div>

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-bold text-xs text-white truncate group-hover:text-[#ffd06a] transition-colors">
                        {m.name}
                      </h4>
                      <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-950/20 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                        {m.status || "active"}
                      </span>
                    </div>

                    <p className="text-[11px] font-semibold text-[#f5b642] truncate">
                      {m.role || "Member"}
                    </p>
                    <p className="text-[10px] text-zinc-400 truncate">
                      {m.position || team?.name || "General Team"}
                    </p>
                  </div>
                </div>

                {/* Social Links & Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-[#1f190e]">
                  <div className="flex items-center gap-1.5">
                    {m.github_url && (
                      <a
                        href={m.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="GitHub Profile"
                        className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                      >
                        <GithubIcon className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {m.linkedin_url && (
                      <a
                        href={m.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="LinkedIn Profile"
                        className="p-1 rounded-lg text-zinc-400 hover:text-[#0077b5] hover:bg-zinc-800 transition"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(m)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#332b1d] bg-[#1a140b] px-2.5 py-1 text-[11px] font-semibold text-zinc-300 hover:text-white hover:border-[#f5b642] transition cursor-pointer"
                    >
                      <Pencil className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(m.id, m.name)}
                      className="p-1 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-950/30 transition cursor-pointer"
                      title="Delete Member"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Member Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-black/95 backdrop-blur-2xl">
          <div className="relative w-full max-w-lg max-h-[88vh] flex flex-col rounded-3xl border-2 border-[#f5b642] bg-[#0d0a06] shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden">
            {/* Fixed Header */}
            <div className="flex items-center justify-between border-b border-[#262015] px-6 py-4 bg-[#14100b] shrink-0">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-[#f5b642]" />
                {editingItem ? "Edit Team Member" : "Add Team Member"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-zinc-500 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="member-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Member Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Lakshya Kant"
                    className="w-full rounded-xl border border-[#332b1d] bg-[#1a140b] px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Team Vertical *
                  </label>
                  <select
                    required
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    className="w-full rounded-xl border border-[#332b1d] bg-[#1a140b] px-3 py-2 text-xs text-white focus:border-[#f5b642] focus:outline-none cursor-pointer"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Role Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. AI/ML Lead or Tech Co-Lead"
                    className="w-full rounded-xl border border-[#332b1d] bg-[#1a140b] px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Position Level *
                  </label>
                  <input
                    type="text"
                    required
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="e.g. Lead, Co-Lead, Core Member"
                    className="w-full rounded-xl border border-[#332b1d] bg-[#1a140b] px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    GitHub Profile URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/username"
                    className="w-full rounded-xl border border-[#332b1d] bg-[#1a140b] px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    LinkedIn Profile URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full rounded-xl border border-[#332b1d] bg-[#1a140b] px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                  />
                </div>
              </div>

              {/* Photo Upload & Preview */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Member Avatar / Photo
                </label>
                <div className="flex items-center gap-3">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Avatar Preview"
                      className="h-11 w-11 rounded-xl object-cover border border-[#f5b642]/50 shrink-0"
                    />
                  ) : (
                    <div className="h-11 w-11 rounded-xl border border-dashed border-zinc-700 bg-black/40 flex items-center justify-center text-zinc-500 text-xs shrink-0">
                      Photo
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setImageFile(file);
                      if (file) {
                        setImagePreview(URL.createObjectURL(file));
                      }
                    }}
                    className="text-xs text-zinc-400 file:mr-2 file:rounded-lg file:border-0 file:bg-[#f5b642] file:px-2.5 file:py-1 file:text-xs file:font-bold file:text-black hover:file:bg-[#ffd06a] cursor-pointer"
                  />
                </div>
              </div>

            </form>

            {/* Fixed Action Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-[#262015] px-6 py-3.5 bg-[#120e08] shrink-0 z-20">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="member-form"
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#f5b642] bg-[#f5b642] px-5 py-2 text-xs font-bold text-black hover:bg-[#ffd06a] transition disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(245,182,66,0.25)]"
              >
                {isPending ? "Saving..." : editingItem ? "Update Member" : "Add Member"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
