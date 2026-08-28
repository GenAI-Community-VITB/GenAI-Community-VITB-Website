import { Metadata } from "next";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { MemberHierarchyTree } from "@/components/site/hierarchy-tree";
import { getHierarchyMembers, getTeamsWithMembers } from "@/lib/data/public";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Meet Our Team & Community Hierarchy",
  description:
    "Explore the student leaders, technical vertical leads, coordinators, and active core members of the GENAI Community at VIT Bhopal University.",
  alternates: {
    canonical: "/team",
  },
  openGraph: {
    title: "Meet Our Team & Leadership | GENAI Community VIT Bhopal",
    description:
      "Explore the student leaders, technical vertical leads, and coordinators of GENAI Community at VIT Bhopal University.",
    url: "https://www.genaiclubvitb.in/team",
    images: [{ url: "/ClubIcon.png", width: 512, height: 512, alt: "GenAI Community VIT Bhopal" }],
  },
};

export default async function TeamHierarchyPage() {
  const [hierarchyMembers, teamsWithMembers] = await Promise.all([
    getHierarchyMembers(),
    getTeamsWithMembers(),
  ]);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#f5b642] selection:text-black overflow-x-clip relative">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://www.genaiclubvitb.in" },
          { name: "Team", url: "https://www.genaiclubvitb.in/team" },
        ]}
      />
      <Navbar />
      <main className="py-8 pb-32 relative z-30 overflow-visible">
        <MemberHierarchyTree initialMembers={hierarchyMembers} teams={teamsWithMembers} />
      </main>
      <Footer />
    </div>
  );
}
