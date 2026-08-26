import { Metadata } from "next";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { WinnersSection } from "@/components/site/winners-section";
import { getEventWinners } from "@/lib/data/winners";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { Trophy } from "lucide-react";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Event Champions & Hackathon Winners",
  description:
    "Discover the official hall of fame, cash prize winners, and champions from AI hackathons and coding sprints hosted by GENAI Community VIT Bhopal.",
  alternates: {
    canonical: "/winners",
  },
  openGraph: {
    title: "Event Champions & Winners | GENAI Community VIT Bhopal",
    description:
      "Celebrating the top builders and champions from our hackathons and challenges at VIT Bhopal University.",
    url: "https://www.genaiclubvitb.in/winners",
  },
};

export default async function WinnersPage() {
  const winners = await getEventWinners();

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#f5b642] selection:text-black overflow-hidden relative">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://www.genaiclubvitb.in" },
          { name: "Winners", url: "https://www.genaiclubvitb.in/winners" },
        ]}
      />
      <Navbar />

      {/* Ambient background lighting */}
      <div className="pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 h-[600px] w-full max-w-7xl bg-[radial-gradient(ellipse_at_center,_rgba(245,182,66,0.08),_transparent_70%)] blur-3xl" />

      <main className="py-8 relative space-y-8">
        {/* Unified Page Header */}
        <div className="container-wrap text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5b642]/30 bg-[#16120b] px-4 py-1 text-xs font-bold uppercase tracking-wider text-[#f5b642] shadow-[0_0_20px_rgba(245,182,66,0.15)]">
            <Trophy className="h-3.5 w-3.5" />
            Official Event Champions & Podium
          </div>
          <h1 className="text-4xl font-extrabold text-white sm:text-5xl lg:text-6xl tracking-tight">
            Event{" "}
            <span className="bg-gradient-to-r from-[#f5b642] via-[#ffd06a] to-[#f5b642] bg-clip-text text-transparent">
              Winners
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mx-auto truncate font-medium">
            Celebrating the top builders and champions from our hackathons and challenges.
          </p>
        </div>

        {/* Winners Section */}
        <WinnersSection winners={winners} />
      </main>
      <Footer />
    </div>
  );
}

