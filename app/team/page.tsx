import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { MemberHierarchyTree } from "@/components/site/hierarchy-tree";
import { getHierarchyMembers } from "@/lib/data/public";

export const revalidate = 60;

export default async function TeamHierarchyPage() {
  const hierarchyMembers = await getHierarchyMembers();

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="py-4">
        <MemberHierarchyTree initialMembers={hierarchyMembers} />
      </main>
      <Footer />
    </div>
  );
}
