import { Metadata } from "next";
import { EventGrid } from "@/components/site/event-grid";
import { Footer } from "@/components/site/footer";
import { Navbar } from "@/components/site/navbar";
import { getEvents } from "@/lib/data/public";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { Calendar } from "lucide-react";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "AI Events, Hackathons & Workshops",
  description:
    "Explore upcoming AI events, hackathons, and technical workshops organized by the GENAI Community at VIT Bhopal University. Get registration passes and check-in information.",
  alternates: {
    canonical: "/events",
  },
  openGraph: {
    title: "AI Events, Hackathons & Workshops | GENAI Community VIT Bhopal",
    description:
      "Explore upcoming AI events, hackathons, and technical workshops organized by GENAI Community at VIT Bhopal University.",
    url: "https://www.genaiclubvitb.in/events",
    images: [{ url: "/ClubIcon.png", width: 512, height: 512, alt: "GenAI Community VIT Bhopal" }],
  },
};

export default async function EventsPage() {
  const events = await getEvents();

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#f5b642] selection:text-black overflow-x-clip relative">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://www.genaiclubvitb.in" },
          { name: "Events", url: "https://www.genaiclubvitb.in/events" },
        ]}
      />
      <Navbar />

      {/* Ambient background lighting */}
      <div className="pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 h-[600px] w-full max-w-7xl bg-[radial-gradient(ellipse_at_center,_rgba(245,182,66,0.08),_transparent_70%)] blur-3xl" />

      <main className="py-8 relative space-y-8">
        {/* Unified Page Header */}
        <div className="container-wrap text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5b642]/30 bg-[#16120b] px-4 py-1 text-xs font-bold uppercase tracking-wider text-[#f5b642] shadow-[0_0_20px_rgba(245,182,66,0.15)]">
            <Calendar className="h-3.5 w-3.5" />
            Official Campus Calendar
          </div>
          <h1 className="text-4xl font-extrabold text-white sm:text-5xl lg:text-6xl tracking-tight">
            Events &{" "}
            <span className="bg-gradient-to-r from-[#f5b642] via-[#ffd06a] to-[#f5b642] bg-clip-text text-transparent">
              Workshops
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mx-auto truncate font-medium">
            Join upcoming hackathons, tech workshops, and hands-on AI sessions.
          </p>
        </div>

        {/* Events Grid */}
        <div className="container-wrap">
          <EventGrid events={events} />
        </div>
      </main>
      <Footer />
    </div>
  );
}

