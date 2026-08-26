import { BlogPost } from "@/lib/types";
import { formatISTDate } from "@/lib/utils/format";
import { Sparkles, ExternalLink, Share2, Calendar, User } from "lucide-react";
import { LinkedinIcon } from "@/components/ui/icons";

interface BlogSectionProps {
  posts?: BlogPost[];
}

export function BlogSection({ posts = [] }: BlogSectionProps) {
  if (posts.length === 0) return null;

  return (
    <section
      id="blog"
      className="relative border-b border-[#221d14] bg-[#070707] py-20 sm:py-28 overflow-hidden"
    >
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute top-1/4 -left-32 h-96 w-96 rounded-full bg-[#f5b642]/[0.03] blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-10 h-72 w-72 rounded-full bg-blue-500/[0.03] blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#2a2215_1px,transparent_1px)] [background-size:24px_24px] opacity-20" />

      <div className="container-wrap relative space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#0a66c2]/40 bg-[#0a66c2]/10 px-4 py-1 text-xs font-bold uppercase tracking-wider text-[#70b5f9] backdrop-blur-md">
            <Share2 className="h-3.5 w-3.5" />
            <span>Community Dispatches · LinkedIn Blog</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl tracking-tight">
            Latest Insights &{" "}
            <span className="bg-gradient-to-r from-[#f5b642] via-[#ffd06a] to-[#f5b642] bg-clip-text text-transparent">
              Updates
            </span>
          </h2>
          <p className="text-sm text-zinc-400">
            Real-time breakthroughs, hackathon victories, and technical deep-dives synthesized by our AI agent from official social dispatches.
          </p>
        </div>

        {/* Blog Post Cards Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {posts.map((post) => (
            <article
              key={post.id}
              className="group relative flex flex-col justify-between rounded-3xl border border-[#262015] bg-gradient-to-b from-[#14100b] to-[#0a0805] p-6 shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-[#f5b642] hover:shadow-[0_15px_40px_rgba(245,182,66,0.15)]"
            >
              <div>
                {/* Card Top Ribbon */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-1.5 rounded-full bg-[#0a66c2]/20 border border-[#0a66c2]/40 px-2.5 py-0.5 text-[10px] font-bold text-[#70b5f9]">
                    <LinkedinIcon className="h-3 w-3 fill-current" />
                    <span>LinkedIn Post</span>
                  </div>

                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300 font-mono">
                    <Sparkles className="h-2.5 w-2.5" />
                    AI Summary
                  </span>
                </div>

                {/* Headline */}
                <h3 className="text-base font-extrabold text-white group-hover:text-[#ffd06a] transition-colors leading-snug">
                  {post.title}
                </h3>

                {/* AI Executive Summary */}
                <p className="mt-3 text-xs text-zinc-300 leading-relaxed">
                  {post.summary}
                </p>

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-lg bg-[#1a140b] border border-[#382d1a] px-2 py-0.5 text-[10px] font-semibold text-zinc-400"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer with Meta & Direct Accessible Link */}
              <div className="mt-6 border-t border-[#221c12] pt-4 flex items-center justify-between text-[11px] text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 text-zinc-500" />
                  <span>{formatISTDate(post.published_at)}</span>
                </div>

                <a
                  href={post.post_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-[#f5b642] hover:text-[#ffd06a] transition-colors group-hover:underline"
                >
                  <span>Read Post</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
