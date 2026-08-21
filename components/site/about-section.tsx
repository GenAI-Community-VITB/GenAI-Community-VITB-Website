import Image from "next/image";
import GroupPhoto from "@/assets/GroupPhoto.jpg";
import { Sparkles, Users, Award, ShieldCheck } from "lucide-react";

export function AboutSection() {
  return (
    <section
      id="about"
      className="scroll-mt-20 relative overflow-hidden"
    >
      <div className="container-wrap relative space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5b642]/30 bg-[#16120b] px-4 py-1 text-xs font-bold uppercase tracking-wider text-[#f5b642] shadow-[0_0_20px_rgba(245,182,66,0.15)]">
            <Sparkles className="h-3.5 w-3.5" />
            Institutional Background
          </div>
          <h2 className="text-4xl font-extrabold text-white sm:text-5xl lg:text-6xl tracking-tight">
            About the{" "}
            <span className="bg-gradient-to-r from-[#f5b642] via-[#ffd06a] to-[#f5b642] bg-clip-text text-transparent">
              Community
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mx-auto truncate font-medium">
            Who we are, what we build, and how we foster student AI innovation.
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-[#2e2618] shadow-[0_0_50px_rgba(245,182,66,0.15)] group">
            <Image
              src={GroupPhoto}
              alt="Generative AI Club members"
              fill
              className="object-cover transition duration-700 group-hover:scale-105"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/10 bg-black/60 p-3.5 backdrop-blur-md">
              <p className="text-xs font-bold text-white">Official Leadership & Member Roster</p>
              <p className="text-[10px] text-zinc-400 font-mono">Generative AI Community · VIT Bhopal University</p>
            </div>
          </div>

          <div className="space-y-6 text-zinc-300">
            <div className="space-y-3">
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Empowering Students from First Prompts to Production AI Systems
              </h3>
              <p className="text-xs sm:text-sm leading-relaxed text-zinc-400">
                The Generative AI Community is VIT Bhopal&apos;s premier technical organization dedicated to researching, building, and deploying cutting-edge AI architectures—ranging from neural transformers and RAG workflows to autonomous multi-modal agent systems.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-2xl border border-[#262015] bg-[#110e0a] p-4 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#f5b642]">
                  <Users className="h-4 w-4" />
                  <span>51+ Staff Members</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  10 specialized verticals spanning AI/ML, Tech, UI/UX, PR, and Events.
                </p>
              </div>

              <div className="rounded-2xl border border-[#262015] bg-[#110e0a] p-4 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400">
                  <Award className="h-4 w-4" />
                  <span>National Hackathons</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Podium finishes in major national competitions and research hackathons.
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm leading-relaxed text-zinc-400 pt-2 border-t border-[#1e1a12]">
              Whether you are an aspiring machine learning engineer, a full-stack builder, or an AI researcher, our ecosystem provides the mentorship, compute resources, and community to turn ideas into reality.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
