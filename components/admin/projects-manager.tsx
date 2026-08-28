"use client";

import { useState, useTransition, useMemo } from "react";
import type { Project } from "@/lib/types";
import { upsertProject, deleteProject } from "@/app/admin/actions";
import {
  FolderKanban,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Code2,
  Globe,
  FileText,
  Search,
} from "lucide-react";
import { useScrollLock } from "@/lib/utils/scroll-lock";

interface ProjectsManagerProps {
  initialProjects: Project[];
  isAllowed?: boolean;
}

export function ProjectsManager({
  initialProjects,
  isAllowed = true,
}: ProjectsManagerProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [showModal, setShowModal] = useState(false);
  useScrollLock(showModal);
  const [editingItem, setEditingItem] = useState<Project | null>(null);
  const [isPending, startTransition] = useTransition();

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Form State
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [blogUrl, setBlogUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.short_description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [projects, searchQuery]);

  if (!isAllowed) return null;

  function resetForm() {
    setEditingItem(null);
    setTitle("");
    setShortDescription("");
    setGithubUrl("");
    setLiveUrl("");
    setBlogUrl("");
    setImageUrl("");
    setImageFile(null);
    setImagePreview(null);
    setShowModal(false);
  }

  function handleOpenEdit(item: Project) {
    setEditingItem(item);
    setTitle(item.title);
    setShortDescription(item.short_description);
    setGithubUrl(item.github_url || "");
    setLiveUrl(item.live_url || "");
    setBlogUrl(item.blog_url || "");
    setImageUrl(item.image_url || "");
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
        fd.append("title", title.trim());
        fd.append("short_description", shortDescription.trim());
        if (githubUrl) fd.append("github_url", githubUrl.trim());
        if (liveUrl) fd.append("live_url", liveUrl.trim());
        if (blogUrl) fd.append("blog_url", blogUrl.trim());
        if (imageUrl) fd.append("image_url", imageUrl.trim());
        if (imageFile) fd.append("image_file", imageFile);

        const res = await upsertProject(fd);
        if (res && res.success === false) {
          setMessage({ type: "error", text: res.error || "Failed to save project." });
          return;
        }

        setMessage({
          type: "success",
          text: editingItem ? "Project updated successfully." : "Project published successfully.",
        });

        if (res?.project) {
          if (editingItem) {
            setProjects((prev) => prev.map((p) => (p.id === res.project.id ? res.project : p)));
          } else {
            setProjects((prev) => [res.project, ...prev.filter((p) => p.id !== res.project.id)]);
          }
        } else if (editingItem) {
          setProjects((prev) =>
            prev.map((p) =>
              p.id === editingItem.id
                ? {
                    ...p,
                    title: title.trim(),
                    short_description: shortDescription.trim(),
                    github_url: githubUrl.trim() || null,
                    live_url: liveUrl.trim() || null,
                    blog_url: blogUrl.trim() || null,
                    image_url: imagePreview || imageUrl || p.image_url,
                    updated_at: new Date().toISOString(),
                  }
                : p,
            ),
          );
        }

        resetForm();
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Failed to save project." });
      }
    });
  }

  function handleDelete(id: string, projectTitle: string) {
    if (!confirm(`Are you sure you want to delete the project "${projectTitle}"?`)) return;

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("id", id);
        const res = await deleteProject(fd);
        if (res && res.success === false) {
          setMessage({ type: "error", text: res.error || "Failed to delete project." });
          return;
        }
        setProjects((prev) => prev.filter((p) => p.id !== id));
        setMessage({ type: "success", text: `Project "${projectTitle}" deleted successfully.` });
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Failed to delete project." });
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-[#f5b642]" />
            Research Projects & Open Source Repos
          </h2>
          <p className="text-xs text-zinc-400">
            Showcase AI models, research pipelines, autonomous agents, and open-source packages created by club members.
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
          Add Project
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

      {/* Filter and Search */}
      <div className="flex items-center justify-between rounded-2xl border border-[#2b2416] bg-[#120f0a] p-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search project title or description..."
            className="w-full rounded-xl border border-[#332714] bg-[#18140d] pl-9 pr-3.5 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
          />
        </div>

        <span className="text-xs text-zinc-500 font-mono hidden sm:inline">
          {filteredProjects.length} {filteredProjects.length === 1 ? "project" : "projects"} listed
        </span>
      </div>

      {/* Grid of Projects */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredProjects.map((project) => (
          <div
            key={project.id}
            className="flex flex-col justify-between rounded-2xl border border-[#2a2216] bg-[#14110b] p-5 shadow-lg space-y-4 hover:border-[#f5b642]/60 transition duration-200"
          >
            <div className="space-y-3">
              {project.image_url && (
                <div className="relative h-32 w-full overflow-hidden rounded-xl border border-[#2e2618]">
                  <img
                    src={project.image_url}
                    alt={project.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              <div>
                <h4 className="font-bold text-sm text-white leading-snug">{project.title}</h4>
                <p className="text-xs text-zinc-400 line-clamp-3 mt-1.5 leading-relaxed">
                  {project.short_description}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[#221c12]">
                {project.github_url && (
                  <a
                    href={project.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-300 hover:text-white bg-[#1a140b] px-2 py-1 rounded-lg border border-[#3d3019]"
                  >
                    <Code2 className="h-3 w-3" /> Code
                  </a>
                )}
                {project.live_url && (
                  <a
                    href={project.live_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#f5b642] hover:underline bg-[#221a0e] px-2 py-1 rounded-lg border border-[#3d3019]"
                  >
                    <Globe className="h-3 w-3" /> Demo
                  </a>
                )}
                {project.blog_url && (
                  <a
                    href={project.blog_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-400 hover:underline bg-sky-950/30 px-2 py-1 rounded-lg border border-sky-900/40"
                  >
                    <FileText className="h-3 w-3" /> Docs
                  </a>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#221c12]">
              <span className="text-[10px] text-zinc-500 font-mono">
                {new Date(project.created_at || Date.now()).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(project)}
                  className="p-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-[#f5b642] transition cursor-pointer"
                  title="Edit Project"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(project.id, project.title)}
                  className="p-1.5 rounded-lg border border-red-900/50 text-red-400 hover:bg-red-950/40 transition cursor-pointer"
                  title="Delete Project"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-[#332714] bg-[#120f0a] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#221c12] pb-3">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-[#f5b642]" />
                <h3 className="font-bold text-white text-base">
                  {editingItem ? "Edit Project Details" : "Publish New Research Project"}
                </h3>
              </div>
              <button
                onClick={resetForm}
                className="text-zinc-400 hover:text-white text-xs cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Vision Transformer Benchmark Suite"
                  className="w-full rounded-xl border border-[#332714] bg-[#18140d] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Short Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="Summary of architecture, benchmarks, LLM pipelines, and student contributions..."
                  className="w-full rounded-xl border border-[#332714] bg-[#18140d] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none resize-y"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    GitHub Repository URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/..."
                    className="w-full rounded-xl border border-[#332714] bg-[#18140d] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Live Demo / Web App URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={liveUrl}
                    onChange={(e) => setLiveUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-[#332714] bg-[#18140d] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Research Article / Blog / Docs URL (Optional)
                </label>
                <input
                  type="url"
                  value={blogUrl}
                  onChange={(e) => setBlogUrl(e.target.value)}
                  placeholder="https://medium.com/... or https://arxiv.org/..."
                  className="w-full rounded-xl border border-[#332714] bg-[#18140d] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Project Cover / Thumbnail Image (Optional)
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
                    placeholder="Or paste cover image URL (https://...)"
                    className="w-full rounded-xl border border-[#332714] bg-[#18140d] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-[#221c12]">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-xl bg-[#f5b642] py-2.5 text-xs font-bold text-black hover:bg-[#ffd06a] disabled:opacity-50 transition cursor-pointer shadow-sm"
                >
                  {isPending ? "Saving..." : editingItem ? "Update Project" : "Publish Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
