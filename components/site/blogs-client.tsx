"use client";

import { useState, useMemo } from "react";
import { BlogPost } from "@/lib/types";
import { formatISTDate } from "@/lib/utils/format";
import { Search, ExternalLink, Calendar, Tag, User, BookOpen, Sparkles, Filter } from "lucide-react";
import { LinkedinIcon } from "@/components/ui/icons";

interface BlogsClientProps {
  posts: BlogPost[];
}

export function BlogsClient({ posts }: BlogsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("All");

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    posts.forEach((p) => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach((t) => tagSet.add(t));
      }
    });
    return ["All", ...Array.from(tagSet)];
  }, [posts]);

  // Filter posts
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        post.title.toLowerCase().includes(q) ||
        post.summary.toLowerCase().includes(q) ||
        (post.author_name && post.author_name.toLowerCase().includes(q)) ||
        (post.tags && post.tags.some((t) => t.toLowerCase().includes(q)));

      const matchesTag =
        selectedTag === "All" ||
        (post.tags && post.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase()));

      return matchesSearch && matchesTag;
    });
  }, [posts, searchQuery, selectedTag]);

  return (
    <div className="space-y-10">
      {/* Controls Bar: Search & Tag Filter Pills */}
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Search Input Box */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles, research breakthroughs, workshops, hackathons..."
            className="w-full rounded-2xl border border-[#2d2416] bg-[#110e09]/90 py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-zinc-500 backdrop-blur-md shadow-inner transition focus:border-[#f5b642] focus:outline-none focus:ring-1 focus:ring-[#f5b642]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1">
          <span className="text-[11px] font-mono text-zinc-500 uppercase flex items-center gap-1 shrink-0 mr-1">
            <Filter className="h-3 w-3 text-[#f5b642]" /> Filter:
          </span>
          {allTags.map((tag) => {
            const isSelected = selectedTag === tag;
            return (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "bg-[#241a0b] text-[#f5b642] border border-[#f5b642]/60 shadow-[0_0_12px_rgba(245,182,66,0.2)] font-bold"
                    : "text-zinc-400 border border-[#221d14] bg-[#0e0b07] hover:text-white hover:border-zinc-700"
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Header Count */}
      <div className="flex items-center justify-between max-w-6xl mx-auto border-b border-[#221d14] pb-3 text-xs text-zinc-400">
        <span>
          Showing <strong className="text-white">{filteredPosts.length}</strong> {filteredPosts.length === 1 ? "article" : "articles"}
        </span>
        <span className="font-mono text-[11px] text-zinc-500">
          Source: Official LinkedIn Social Dispatches
        </span>
      </div>

      {/* Posts Grid */}
      {filteredPosts.length === 0 ? (
        <div className="rounded-3xl border border-[#2a2216] bg-[#100d08] p-12 text-center space-y-3 max-w-md mx-auto">
          <BookOpen className="h-10 w-10 text-zinc-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Articles Found</h3>
          <p className="text-xs text-zinc-400">
            No matching dispatches found for &quot;{searchQuery}&quot;. Try adjusting your search query or filter.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedTag("All");
            }}
            className="mt-2 inline-flex rounded-xl border border-[#f5b642]/40 bg-[#1f170b] px-4 py-2 text-xs font-bold text-[#f5b642] hover:bg-[#2c200e] transition"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {filteredPosts.map((post) => (
            <article
              key={post.id}
              className="group relative flex flex-col justify-between rounded-3xl border border-[#262015] bg-gradient-to-b from-[#14100b] to-[#0a0805] p-6 shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-[#f5b642] hover:shadow-[0_15px_40px_rgba(245,182,66,0.15)]"
            >
              <div>
                {/* Top Ribbon */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-1.5 rounded-full bg-[#0a66c2]/15 border border-[#0a66c2]/35 px-2.5 py-0.5 text-[10px] font-bold text-[#70b5f9]">
                    <LinkedinIcon className="h-3 w-3 fill-current" />
                    <span>LinkedIn Dispatch</span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-mono">
                    <Calendar className="h-3 w-3 text-zinc-500" />
                    <span>{formatISTDate(post.published_at)}</span>
                  </div>
                </div>

                {/* Headline */}
                <h2 className="text-lg font-extrabold text-white group-hover:text-[#ffd06a] transition-colors leading-snug">
                  {post.title}
                </h2>

                {/* Executive Summary */}
                <p className="mt-3 text-xs text-zinc-300 leading-relaxed">
                  {post.summary}
                </p>

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {post.tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setSelectedTag(tag)}
                        className="rounded-lg bg-[#1a140b] border border-[#382d1a] px-2 py-0.5 text-[10px] font-semibold text-zinc-400 hover:text-[#f5b642] hover:border-[#f5b642]/50 transition cursor-pointer"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer with Author and Direct LinkedIn Link */}
              <div className="mt-6 border-t border-[#221c12] pt-4 flex items-center justify-between text-[11px] text-zinc-400">
                <span className="font-medium text-zinc-500 truncate max-w-[150px]">
                  {post.author_name || "GENAI Community"}
                </span>

                <a
                  href={post.post_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-[#f5b642] hover:text-[#ffd06a] transition-colors group-hover:underline"
                >
                  <span>Read on LinkedIn</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
