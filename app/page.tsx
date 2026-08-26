import { Metadata } from "next";
import { Hero } from "@/components/site/hero";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { ClubPillarsSection } from "@/components/site/club-pillars-section";
import { ScrollTickerSection } from "@/components/site/scroll-ticker";
import { QuotesSection } from "@/components/site/quotes-section";
import { BlogSection } from "@/components/site/blog-section";
import { OrganizationJsonLd, WebSiteJsonLd } from "@/components/seo/json-ld";
import { getUpcomingRegisterableEvent } from "@/lib/data/events";
import { getAchievements } from "@/lib/data/achievements";
import { getHierarchyMembers } from "@/lib/data/public";
import { getBlogPosts } from "@/lib/data/blog";
import Link from "next/link";
import {
  Users,
  Trophy,
  Cpu,
  Calendar,
  ArrowRight,
  Sparkles,
  Layers,
  Medal,
} from "lucide-react";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "GENAI Community VIT Bhopal | Generative AI Club",
  description:
    "Official website of the Generative AI Community at VIT Bhopal University. Explore upcoming AI hackathons, technical workshops, open-source AI projects, and student passes.",
  alternates: {
    canonical: "/",
  },
};

export default async function Home() {
  const [upcomingEvent, achievements, hierarchyMembers, blogPosts] = await Promise.all([
    getUpcomingRegisterableEvent(30),
    getAchievements(),
    getHierarchyMembers(),
    getBlogPosts(),
  ]);

  const memberCount = hierarchyMembers?.length || 51;
  const achievementsCount = achievements?.length || 0;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#f5b642] selection:text-black">
      {/* Schema.org Structured Data */}
      <OrganizationJsonLd />
      <WebSiteJsonLd />

      <Navbar />
      <main className="space-y-0">
        {/* 1. Master Hero with Live Stats & Flashing 30-Day Event Banner */}
        <Hero upcomingEvent={upcomingEvent} memberCount={memberCount} />

        {/* 2. Kinetic Scroll Ticker (Positioned high up directly after Hero) */}
        <ScrollTickerSection />

        {/* 3. Club Core Pillars & Operational Deliverables */}
        <ClubPillarsSection />

        {/* 4. Apple-Style Visionary Quotes Showcase */}
        <QuotesSection />

        {/* 5. Apple-Style Exploration Hub (Connecting to Dedicated Pages) */}
        <section className="relative border-b border-[#221d14] bg-[#070707] py-20 sm:py-28 overflow-hidden">
          <div className="container-wrap space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#f5b642]/30 bg-[#16120b] px-4 py-1 text-xs font-bold uppercase tracking-wider text-[#f5b642]">
                <Layers className="h-3.5 w-3.5" />
                Community Portals
              </div>
              <h2 className="text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl tracking-tight">
                Discover the{" "}
                <span className="bg-gradient-to-r from-[#f5b642] via-[#ffd06a] to-[#f5b642] bg-clip-text text-transparent">
                  Ecosystem
                </span>
              </h2>
              <p className="text-sm text-zinc-400">
                Explore our community members, event champions, research projects, and club awards.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
              {/* Card 1: Meet Our Members */}
              <Link
                href="/team"
                className="group relative flex flex-col justify-between rounded-3xl border border-[#262015] bg-gradient-to-b from-[#14100b] to-[#0a0805] p-6 shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-[#f5b642] hover:shadow-[0_15px_40px_rgba(245,182,66,0.18)]"
              >
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/10 text-amber-300 mb-5 group-hover:scale-105 transition">
                    <Users className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 font-mono">
                    {memberCount} Officials
                  </span>
                  <h3 className="text-lg font-extrabold text-white mt-3 group-hover:text-[#ffd06a] transition-colors">
                    Meet Our Members
                  </h3>
                  <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                    Interactive directory starting from President & VP across 10 specialized verticals.
                  </p>
                </div>
                <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-[#f5b642] group-hover:underline">
                  <span>Explore Members</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>

              {/* Card 2: Event Champions */}
              <Link
                href="/winners"
                className="group relative flex flex-col justify-between rounded-3xl border border-[#262015] bg-gradient-to-b from-[#14100b] to-[#0a0805] p-6 shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-400 hover:shadow-[0_15px_40px_rgba(245,182,66,0.18)]"
              >
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/10 text-amber-300 mb-5 group-hover:scale-105 transition">
                    <Medal className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 font-mono">
                    Hall of Fame
                  </span>
                  <h3 className="text-lg font-extrabold text-white mt-3 group-hover:text-[#ffd06a] transition-colors">
                    Event Champions
                  </h3>
                  <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                    Podium finishers, grand champions, and cash awards from our hackathons and sprints.
                  </p>
                </div>
                <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-amber-400 group-hover:underline">
                  <span>View Champions</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>

              {/* Card 3: Research & Projects */}
              <Link
                href="/projects"
                className="group relative flex flex-col justify-between rounded-3xl border border-[#262015] bg-gradient-to-b from-[#14100b] to-[#0a0805] p-6 shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-purple-500 hover:shadow-[0_15px_40px_rgba(168,85,247,0.18)]"
              >
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-purple-500/40 bg-purple-500/10 text-purple-400 mb-5 group-hover:scale-105 transition">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-[10px] font-bold text-purple-300 font-mono">
                    Open Source
                  </span>
                  <h3 className="text-lg font-extrabold text-white mt-3 group-hover:text-purple-300 transition-colors">
                    Research & Projects
                  </h3>
                  <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                    Autonomous agentic toolkits, transformer experiments, and multi-modal models.
                  </p>
                </div>
                <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-purple-400 group-hover:underline">
                  <span>Explore Projects</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>

              {/* Card 4: Awards & Accolades */}
              <Link
                href="/achievements"
                className="group relative flex flex-col justify-between rounded-3xl border border-[#262015] bg-gradient-to-b from-[#14100b] to-[#0a0805] p-6 shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-sky-500 hover:shadow-[0_15px_40px_rgba(56,189,248,0.18)]"
              >
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-500/40 bg-sky-500/10 text-sky-400 mb-5 group-hover:scale-105 transition">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-sky-500/20 px-2.5 py-0.5 text-[10px] font-bold text-sky-300 font-mono">
                    {achievementsCount} Accolades
                  </span>
                  <h3 className="text-lg font-extrabold text-white mt-3 group-hover:text-sky-300 transition-colors">
                    Awards & Accolades
                  </h3>
                  <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                    National competition podiums, research papers, and technical community milestones.
                  </p>
                </div>
                <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-sky-400 group-hover:underline">
                  <span>View Awards</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* 6. AI-Powered LinkedIn Community Dispatches / Blog Section */}
        <BlogSection posts={blogPosts} />
      </main>
      <Footer />
    </div>
  );
}
