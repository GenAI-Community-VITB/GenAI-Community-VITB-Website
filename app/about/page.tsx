import { Metadata } from "next";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { AboutSection } from "@/components/site/about-section";
import { ClubPillarsSection } from "@/components/site/club-pillars-section";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "About Us · Mission, Vision & Core Pillars",
  description:
    "Learn about GENAI Community VIT Bhopal — our mission to accelerate AI literacy, our multi-vertical team structure, and our campus research pillars.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About Us · Mission & Vision | GENAI Community VIT Bhopal",
    description:
      "Learn about GENAI Community VIT Bhopal — our mission to accelerate AI literacy and our campus research pillars.",
    url: "https://www.genaiclubvitb.in/about",
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#f5b642] selection:text-black overflow-hidden relative">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://www.genaiclubvitb.in" },
          { name: "About", url: "https://www.genaiclubvitb.in/about" },
        ]}
      />
      <Navbar />

      {/* Ambient background lighting */}
      <div className="pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 h-[600px] w-full max-w-7xl bg-[radial-gradient(ellipse_at_center,_rgba(245,182,66,0.08),_transparent_70%)] blur-3xl" />

      <main className="py-8 relative space-y-16">
        <AboutSection />
        <ClubPillarsSection />
      </main>
      <Footer />
    </div>
  );
}

