"use client";

import { useState, useTransition, useEffect } from "react";
import type { BlogPost } from "@/lib/types";
import {
  getAllAdminBlogPostsAction,
  generateAiSummaryAction,
  upsertBlogPostAction,
  deleteBlogPostAction,
  importFromLinkedInUrlAction,
} from "@/app/admin/blog-actions";
import {
  Share2,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Loader2,
  Calendar,
  Eye,
  EyeOff,
  Globe,
  Tag,
  FileText,
  Link as LinkIcon,
} from "lucide-react";
import { LinkedinIcon } from "@/components/ui/icons";
import { formatISTDate } from "@/lib/utils/format";
import { useScrollLock } from "@/lib/utils/scroll-lock";

interface SocialMediaManagerProps {
  isAllowed?: boolean;
}

export function SocialMediaManager({ isAllowed = true }: SocialMediaManagerProps) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [aiGenerating, setAiGenerating] = useState(false);

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [showQuickModal, setShowQuickModal] = useState(false);
  useScrollLock(showModal || showQuickModal);

  const [quickPostUrl, setQuickPostUrl] = useState("");
  const [quickRawContent, setQuickRawContent] = useState("");
  const [quickIngesting, setQuickIngesting] = useState(false);

  const [editingItem, setEditingItem] = useState<BlogPost | null>(null);
  const [postUrl, setPostUrl] = useState("");
  const [rawContent, setRawContent] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [authorName, setAuthorName] = useState("GENAI Social Media Team");
  const [tags, setTags] = useState("AI, Innovation, Community");
  const [isPublished, setIsPublished] = useState(true);
  const [imageUrl, setImageUrl] = useState("");

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function loadPosts() {
    setLoading(true);
    try {
      const res = await getAllAdminBlogPostsAction();
      if (res.success && res.posts) {
        setPosts(res.posts);
      }
    } catch (err: any) {
      console.error("Failed to load blog posts:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
  }, []);

  function resetForm() {
    setEditingItem(null);
    setPostUrl("");
    setRawContent("");
    setTitle("");
    setSummary("");
    setAuthorName("GENAI Social Media Team");
    setTags("AI, Innovation, Community");
    setIsPublished(true);
    setImageUrl("");
    setShowModal(false);
  }

  function handleOpenEdit(item: BlogPost) {
    setEditingItem(item);
    setPostUrl(item.post_url || "");
    setRawContent(item.original_content || "");
    setTitle(item.title || "");
    setSummary(item.summary || "");
    setAuthorName(item.author_name || "GENAI Social Media Team");
    setTags(Array.isArray(item.tags) ? item.tags.join(", ") : "");
    setIsPublished(item.is_published ?? true);
    setImageUrl(item.image_url || "");
    setShowModal(true);
  }

  async function handleGenerateAiSummary() {
    if (!rawContent.trim()) {
      setMessage({ type: "error", text: "Please paste the LinkedIn post content to summarize." });
      return;
    }

    setAiGenerating(true);
    setMessage(null);

    try {
      const res = await generateAiSummaryAction({
        rawContent: rawContent.trim(),
        postUrl: postUrl.trim(),
      });

      if (res.success) {
        if (res.headline) setTitle(res.headline);
        if (res.summary) setSummary(res.summary);
        if (res.tags && res.tags.length > 0) setTags(res.tags.join(", "));
        setMessage({ type: "success", text: "AI summary generated successfully! Review and customize below." });
      } else {
        setMessage({ type: "error", text: res.error || "Failed to generate AI summary." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "AI summarization failed." });
    } finally {
      setAiGenerating(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
      try {
        const fd = new FormData();
        if (editingItem) fd.append("id", editingItem.id);
        fd.append("title", title.trim());
        fd.append("summary", summary.trim());
        fd.append("original_content", rawContent.trim());
        fd.append("post_url", postUrl.trim());
        fd.append("author_name", authorName.trim());
        fd.append("tags", tags.trim());
        fd.append("is_published", isPublished ? "true" : "false");
        if (imageUrl) fd.append("image_url", imageUrl.trim());

        const res = await upsertBlogPostAction(fd);

        if (res.success && res.post) {
          setMessage({
            type: "success",
            text: editingItem ? "Post updated successfully." : "Post published to homepage successfully.",
          });
          if (editingItem) {
            setPosts((prev) => prev.map((p) => (p.id === res.post!.id ? res.post! : p)));
          } else {
            setPosts((prev) => [res.post!, ...prev.filter((p) => p.id !== res.post!.id)]);
          }
          resetForm();
        } else {
          setMessage({ type: "error", text: res.error || "Failed to save post." });
        }
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Failed to save post." });
      }
    });
  }

  function handleDelete(id: string, postTitle: string) {
    if (!confirm(`Are you sure you want to delete "${postTitle}"?`)) return;

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("id", id);
        const res = await deleteBlogPostAction(fd);
        if (res.success) {
          setPosts((prev) => prev.filter((p) => p.id !== id));
          setMessage({ type: "success", text: `Post deleted successfully.` });
        } else {
          setMessage({ type: "error", text: res.error || "Failed to delete post." });
        }
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Failed to delete post." });
      }
    });
  }

  async function handleInstantOneClickPublish(e: React.FormEvent) {
    e.preventDefault();
    const cleanUrl = quickPostUrl.trim();
    if (!cleanUrl) {
      setMessage({ type: "error", text: "Please paste a valid LinkedIn post URL." });
      return;
    }
    setQuickIngesting(true);
    setMessage(null);

    try {
      const res = await importFromLinkedInUrlAction({
        postUrl: cleanUrl,
        rawContentHint: quickRawContent.trim() || undefined,
        authorName: "GENAI Social Media Team",
      });

      if (res.success && res.post) {
        setPosts((prev) => [res.post!, ...prev.filter((p) => p.id !== res.post!.id)]);
        setMessage({
          type: "success",
          text: `⚡ AI Success! Post "${res.post.title}" synthesized by Gemini AI and published live to /blogs!`,
        });
        setQuickRawContent("");
        setQuickPostUrl("");
        setShowQuickModal(false);
      } else {
        throw new Error(res.error || "Failed to process LinkedIn URL with AI.");
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to execute 1-click LinkedIn URL import." });
    } finally {
      setQuickIngesting(false);
    }
  }

  if (!isAllowed) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <LinkedinIcon className="h-5 w-5 text-[#0a66c2]" />
            LinkedIn Dispatches & Homepage Blog
          </h2>
          <p className="text-xs text-zinc-400">
            Ingest LinkedIn posts, synthesize AI summaries with Gemini, and publish official news cards to the public homepage.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setShowQuickModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/60 bg-gradient-to-r from-amber-500/25 to-amber-600/15 px-4 py-2.5 text-xs font-extrabold text-amber-300 hover:from-amber-500/35 hover:to-amber-600/25 hover:border-amber-400 transition cursor-pointer shadow-[0_0_15px_rgba(245,182,66,0.2)]"
          >
            <Sparkles className="h-4 w-4 text-[#f5b642] animate-pulse" />
            <span>⚡ Paste LinkedIn URL (AI Blog)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#f5b642] px-3.5 py-2 text-xs font-bold text-black hover:bg-[#ffd06a] transition cursor-pointer shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Custom Post
          </button>
        </div>
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

      {/* Grid of Posts */}
      {loading ? (
        <div className="flex items-center justify-center p-12 text-zinc-500 text-xs">
          <Loader2 className="h-5 w-5 animate-spin mr-2 text-[#f5b642]" />
          Loading dispatches...
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-3xl border border-[#2a2216] bg-[#120f0a] p-10 text-center space-y-3">
          <Share2 className="h-8 w-8 text-zinc-600 mx-auto" />
          <h4 className="text-white font-bold text-sm">No LinkedIn Posts Yet</h4>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Click &quot;Add LinkedIn Post&quot; to ingest your first social media dispatch and generate an AI summary.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex flex-col justify-between rounded-2xl border border-[#2a2216] bg-[#14110b] p-5 shadow-lg space-y-4 hover:border-[#f5b642]/60 transition duration-200"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                      post.is_published
                        ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800/40"
                        : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                    }`}
                  >
                    {post.is_published ? "Published" : "Draft"}
                  </span>

                  <span className="text-[10px] text-zinc-500 font-mono">
                    {formatISTDate(post.published_at)}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-white leading-snug">{post.title}</h4>
                  <p className="text-xs text-zinc-400 line-clamp-3 mt-1.5 leading-relaxed">
                    {post.summary}
                  </p>
                </div>

                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {post.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-md bg-[#1d180f] border border-[#332714] px-1.5 py-0.5 text-[9.5px] text-zinc-400"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#221c12]">
                <a
                  href={post.post_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-[#70b5f9] hover:underline flex items-center gap-1"
                >
                  <LinkedinIcon className="h-3 w-3 fill-current" />
                  View Original <ExternalLink className="h-3 w-3" />
                </a>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(post)}
                    className="p-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-[#f5b642] transition cursor-pointer"
                    title="Edit Post"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(post.id, post.title)}
                    className="p-1.5 rounded-lg border border-red-900/50 text-red-400 hover:bg-red-950/40 transition cursor-pointer"
                    title="Delete Post"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ingestion & Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-black/95 backdrop-blur-2xl">
          <div className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-3xl border-2 border-[#f5b642] bg-[#0d0a06] shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden">
            {/* Fixed Header */}
            <div className="flex items-center justify-between border-b border-[#221c12] px-6 py-4 bg-[#14100b] shrink-0">
              <div className="flex items-center gap-2">
                <LinkedinIcon className="h-5 w-5 text-[#0a66c2]" />
                <h3 className="font-bold text-white text-base">
                  {editingItem ? "Edit LinkedIn Dispatch" : "Ingest New LinkedIn Post"}
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
            <form id="blog-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* LinkedIn Post URL */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  LinkedIn Post URL *
                </label>
                <input
                  type="url"
                  required
                  value={postUrl}
                  onChange={(e) => setPostUrl(e.target.value)}
                  placeholder="https://www.linkedin.com/posts/generative-ai-community-vit-bhopal_..."
                  className="w-full rounded-xl border border-[#332714] bg-[#18140d] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none font-mono"
                />
              </div>

              {/* Raw Post Text + AI Generator */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300">
                    LinkedIn Post Content / Caption *
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateAiSummary}
                    disabled={aiGenerating || !rawContent.trim()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/50 bg-gradient-to-r from-amber-500/20 via-[#f5b642]/20 to-amber-500/20 px-3 py-1 text-[11px] font-bold text-[#ffd06a] hover:from-amber-500/30 hover:to-[#f5b642]/30 transition disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {aiGenerating ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Synthesizing AI Summary...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 text-[#f5b642]" />
                        Generate AI Summary (Gemini)
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  rows={4}
                  required
                  value={rawContent}
                  onChange={(e) => setRawContent(e.target.value)}
                  placeholder="Paste the full LinkedIn post caption text here..."
                  className="w-full rounded-xl border border-[#332714] bg-[#18140d] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none resize-y"
                />
              </div>

              {/* Headline Title */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Card Headline Title (Max 12 words) *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Demystifying Multi-Modal Agentic Workflows & Tool Calling"
                  className="w-full rounded-xl border border-[#332714] bg-[#18140d] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                />
              </div>

              {/* AI Executive Summary */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  AI Summary / Takeaway (1-3 sentences) *
                </label>
                <textarea
                  rows={3}
                  required
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="e.g. Exploring autonomous agent reasoning paradigms, deterministic tool-calling loops, and production design patterns tested in our research lab."
                  className="w-full rounded-xl border border-[#332714] bg-[#18140d] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none resize-y"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Tags (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="AI Agents, Research, Hackathon"
                    className="w-full rounded-xl border border-[#332714] bg-[#18140d] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Author / Department
                  </label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="GENAI Social Media Team"
                    className="w-full rounded-xl border border-[#332714] bg-[#18140d] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="post-published-toggle"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-[#f5b642] focus:ring-[#f5b642] cursor-pointer"
                />
                <label htmlFor="post-published-toggle" className="text-xs font-semibold text-zinc-200 cursor-pointer">
                  Publish to Public Homepage immediately
                </label>
              </div>

              {/* Live Preview Card */}
              {title && summary && (
                <div className="rounded-2xl border border-[#f5b642]/30 bg-[#0d0a06] p-4 space-y-2">
                  <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block font-mono">
                    Live Homepage Card Preview
                  </span>
                  <div className="rounded-xl border border-[#262015] bg-[#14100b] p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-[#70b5f9] flex items-center gap-1">
                        <LinkedinIcon className="h-3 w-3 fill-current" /> LinkedIn Post
                      </span>
                      <span className="text-[10px] font-bold text-amber-300 font-mono flex items-center gap-1">
                        <Sparkles className="h-2.5 w-2.5" /> AI Summary
                      </span>
                    </div>
                    <h4 className="font-extrabold text-sm text-white">{title}</h4>
                    <p className="text-xs text-zinc-300 leading-relaxed">{summary}</p>
                    <div className="flex items-center justify-between pt-2 border-t border-[#221c12] text-[10px] text-zinc-400">
                      <span>{authorName}</span>
                      <span className="text-[#f5b642] font-bold flex items-center gap-1">
                        Read Post <ExternalLink className="h-2.5 w-2.5" />
                      </span>
                    </div>
                  </div>
                </div>
              )}

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
                form="blog-form"
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#f5b642] bg-[#f5b642] px-5 py-2 text-xs font-bold text-black hover:bg-[#ffd06a] transition cursor-pointer disabled:opacity-50 shadow-[0_0_15px_rgba(245,182,66,0.25)]"
              >
                {isPending ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                  </span>
                ) : editingItem ? (
                  "Update Post"
                ) : (
                  "Publish Post"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 1-CLICK INSTANT AI INGEST MODAL ── */}
      {showQuickModal && (
        <div className="fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-black/95 backdrop-blur-2xl">
          <div className="w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-3xl border-2 border-amber-500/50 bg-[#120e09] p-6 shadow-[0_20px_60px_rgba(245,182,66,0.15)] space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#2a2216]">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 text-[#f5b642] border border-amber-500/30">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Paste LinkedIn URL (AI Blog Creator)</h3>
                  <p className="text-[11px] text-zinc-400">Gemini AI synthesizes headline, summary, tags & publishes directly to /blogs</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickModal(false)}
                className="text-zinc-400 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInstantOneClickPublish} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-200 block mb-1">
                  LinkedIn Post or Activity URL <span className="text-amber-400 font-bold">*</span>
                </label>
                <input
                  type="url"
                  value={quickPostUrl}
                  onChange={(e) => setQuickPostUrl(e.target.value)}
                  placeholder="https://www.linkedin.com/posts/genai-community-vit-bhopal_ai-research-workshop-activity-..."
                  required
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900/90 px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:border-[#f5b642] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1">
                  Optional: Extra Notes or Raw Caption <span className="text-zinc-500 text-[10px]">(AI auto-extracts from URL if left empty)</span>
                </label>
                <textarea
                  rows={4}
                  value={quickRawContent}
                  onChange={(e) => setQuickRawContent(e.target.value)}
                  placeholder="Optional: Paste caption or notes if LinkedIn requires login for this specific post..."
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900/90 p-3 text-xs text-white placeholder:text-zinc-600 focus:border-[#f5b642] focus:outline-none resize-none"
                />
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-200/90 flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-[#f5b642] shrink-0 mt-0.5" />
                <span>
                  <strong>Instant AI Pipeline:</strong> Paste any LinkedIn post URL. Google Gemini AI will generate a crisp executive headline, synthesize key points, extract topic tags, and create a live blog entry on <code>/blogs</code> with 1 click.
                </span>
              </div>

              <div className="flex gap-2.5 pt-2 border-t border-[#221c12]">
                <button
                  type="button"
                  onClick={() => setShowQuickModal(false)}
                  className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickIngesting || !quickPostUrl.trim()}
                  className="flex-1 rounded-xl bg-gradient-to-r from-[#f5b642] to-amber-500 py-2.5 text-xs font-bold text-black hover:brightness-110 transition cursor-pointer disabled:opacity-50 shadow-md flex items-center justify-center gap-1.5"
                >
                  {quickIngesting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-black" />
                      <span>Generating with Gemini AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>⚡ Generate & Publish Live</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
