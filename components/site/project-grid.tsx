import Link from "next/link";
import { ArrowUpRight, BookOpen, FolderGit2, Globe } from "lucide-react";

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
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <article
          key={project.id}
          className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#2c2c2c] bg-[#121212] shadow-[0_20px_50px_rgba(0,0,0,0.35)] transition hover:-translate-y-1 hover:border-[#f5b642]/45"
        >
          <div className="relative h-44 overflow-hidden border-b border-[#262626] bg-[#181818]">
            {project.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={project.image_url}
                alt={`${project.title} preview`}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(245,182,66,0.18),_transparent_55%),_#181818]" />
            )}
          </div>

          <div className="flex flex-1 flex-col p-5">
            <h3 className="text-xl font-semibold text-white">{project.title}</h3>
            <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-zinc-400">
              {project.short_description}
            </p>

            <div className="mt-5 flex flex-wrap gap-2 text-sm">
            {project.github_url && (
              <Link
                href={project.github_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#3a3528] bg-[#18150f] px-3 py-1.5 text-xs font-medium text-[#f6e7ca] transition hover:border-[#f5b642]/55"
              >
                  <FolderGit2 className="h-3.5 w-3.5" aria-hidden />
                GitHub
                <ArrowUpRight className="h-3 w-3" aria-hidden />
              </Link>
            )}
            {project.live_url && (
              <Link
                href={project.live_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#2d3930] bg-[#111915] px-3 py-1.5 text-xs font-medium text-[#c8f6d5] transition hover:border-[#4ade80]/45"
              >
                <Globe className="h-3.5 w-3.5" aria-hidden />
                Live
                <ArrowUpRight className="h-3 w-3" aria-hidden />
              </Link>
            )}
            {project.blog_url && (
              <Link
                href={project.blog_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#323232] bg-[#171717] px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500"
              >
                <BookOpen className="h-3.5 w-3.5" aria-hidden />
                Blog
                <ArrowUpRight className="h-3 w-3" aria-hidden />
              </Link>
            )}
          </div>

            {!project.github_url && !project.live_url && !project.blog_url ? (
              <p className="mt-5 text-xs text-zinc-500">No external links added yet.</p>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
