import Link from "next/link";
import { ArrowUpRight, BookOpen, Code2, Globe, Sparkles } from "lucide-react";

interface ProjectItem {
  id: string;
  title: string;
  short_description: string;
  image_url: string | null;
  github_url: string | null;
  live_url: string | null;
  blog_url: string | null;
}

export function ProjectGrid({ projects }: { projects: ProjectItem[] }) {
  if (projects.length === 0) {
    return (
      <div className="rounded-3xl border border-[#262015] bg-[#0c0a07] p-12 text-center text-zinc-500 text-xs">
        No active projects published yet. Check back soon or contribute via the admin dashboard!
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <article
          key={project.id}
          className="group flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-[#2e2517] bg-gradient-to-b from-[#14100b] to-[#0a0805] shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-[#f5b642]/70 hover:shadow-[0_15px_40px_rgba(245,182,66,0.18)]"
        >
          <div>
            {/* Project Preview Image */}
            <div className="relative h-48 overflow-hidden border-b border-[#221c13] bg-[#120f0a]">
              {project.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={project.image_url}
                  alt={`${project.title} preview`}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(245,182,66,0.12),_transparent_65%),_#100d08]">
                  <Sparkles className="h-10 w-10 text-[#f5b642]/40" />
                </div>
              )}
            </div>

            {/* Body */}
            <div className="p-6 space-y-3">
              <h3 className="text-xl font-extrabold text-white group-hover:text-[#ffd06a] transition-colors">
                {project.title}
              </h3>
              <p className="line-clamp-4 text-xs leading-relaxed text-zinc-400">
                {project.short_description}
              </p>
            </div>
          </div>

          {/* External Links */}
          <div className="p-6 pt-0 flex flex-wrap items-center gap-2 border-t border-[#1e1910] mt-4">
            {project.github_url && (
              <a
                href={project.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#2e2618] bg-[#16120b] px-3 py-1.5 text-xs font-bold text-zinc-300 transition hover:border-[#f5b642] hover:text-white"
              >
                <Code2 className="h-3.5 w-3.5" />
                <span>Code</span>
                <ArrowUpRight className="h-3 w-3 text-zinc-500" />
              </a>
            )}
            {project.live_url && (
              <a
                href={project.live_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-3 py-1.5 text-xs font-bold text-emerald-300 transition hover:border-emerald-400 hover:text-white"
              >
                <Globe className="h-3.5 w-3.5" />
                <span>Live Demo</span>
                <ArrowUpRight className="h-3 w-3 text-emerald-500" />
              </a>
            )}
            {project.blog_url && (
              <a
                href={project.blog_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-950/30 px-3 py-1.5 text-xs font-bold text-purple-300 transition hover:border-purple-400 hover:text-white"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Article</span>
                <ArrowUpRight className="h-3 w-3 text-purple-500" />
              </a>
            )}
            {!project.github_url && !project.live_url && !project.blog_url && (
              <span className="text-[11px] font-mono text-zinc-600">Internal Community Project</span>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
