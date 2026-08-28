import { Metadata } from "next";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { MemberHierarchyTree } from "@/components/site/hierarchy-tree";
import { getHierarchyMembers } from "@/lib/data/public";
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
  },
};

export default async function TeamHierarchyPage() {
  const hierarchyMembers = await getHierarchyMembers();

  return (
    <div className="min-h-screen bg-black text-white">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://www.genaiclubvitb.in" },
          { name: "Team", url: "https://www.genaiclubvitb.in/team" },
        ]}
      />
      <Navbar />
      <main className="py-8 pb-32 relative z-30 overflow-visible">
        <MemberHierarchyTree initialMembers={hierarchyMembers} />
      </main>
      <Footer />
    </div>
  );
}

