import { Metadata } from "next";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { AchievementsSection } from "@/components/site/achievements-section";
import { getAchievements } from "@/lib/data/achievements";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { Trophy } from "lucide-react";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Awards, Accolades & Milestones",
  description:
    "Explore major national hackathon victories, research publications, awards, and technical milestones achieved by the GENAI Community at VIT Bhopal University.",
  alternates: {
    canonical: "/achievements",
  },
  openGraph: {
    title: "Awards & Milestones | GENAI Community VIT Bhopal",
    description:
      "Explore major national hackathon podiums and achievements by GENAI Community at VIT Bhopal University.",
    url: "https://www.genaiclubvitb.in/achievements",
  },
};

export default async function AchievementsPage() {
  const achievements = await getAchievements();

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#f5b642] selection:text-black overflow-hidden relative">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://www.genaiclubvitb.in" },
          { name: "Achievements", url: "https://www.genaiclubvitb.in/achievements" },
        ]}
      />
      <Navbar />

      {/* Ambient background lighting */}
      <div className="pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 h-[600px] w-full max-w-7xl bg-[radial-gradient(ellipse_at_center,_rgba(245,182,66,0.08),_transparent_70%)] blur-3xl" />

      <main className="py-8 relative space-y-8">
        <div className="container-wrap text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5b642]/30 bg-[#16120b] px-4 py-1 text-xs font-bold uppercase tracking-wider text-[#f5b642] shadow-[0_0_20px_rgba(245,182,66,0.15)]">
            <Trophy className="h-3.5 w-3.5" />
            Accolades & Hall of Fame
          </div>
          <h1 className="text-4xl font-extrabold text-white sm:text-5xl lg:text-6xl tracking-tight">
            Community{" "}
            <span className="bg-gradient-to-r from-[#f5b642] via-[#ffd06a] to-[#f5b642] bg-clip-text text-transparent">
              Achievements
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mx-auto truncate font-medium">
            National hackathon podiums, research milestones, and club wins.
          </p>
        </div>

        <AchievementsSection achievements={achievements} />
      </main>
      <Footer />
    </div>
  );
}

