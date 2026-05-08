import { AboutSection } from "@/components/site/about-section";
import { ClubPillarsSection } from "@/components/site/club-pillars-section";
import { Footer } from "@/components/site/footer";
import { Hero } from "@/components/site/hero";
import { Navbar } from "@/components/site/navbar";
import { ScrollTickerSection } from "@/components/site/scroll-ticker";
import { TeamSection } from "@/components/site/team-section";
import { getTeamsWithMembers } from "@/lib/data/public";

export const revalidate = 60;

export default async function Home() {
  const teams = await getTeamsWithMembers();
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <main>
        <Hero />
        <AboutSection />
        <ClubPillarsSection />
        {/* Scroll-driven ticker — between pillars and members */}
        <ScrollTickerSection />
        <div id="members">
          <TeamSection teams={teams} />
        </div>
      </main>
      <Footer />
    </div>
  );
}

