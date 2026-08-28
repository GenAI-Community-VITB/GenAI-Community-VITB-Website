import { Metadata } from "next";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { BlogsClient } from "@/components/site/blogs-client";
import { getBlogPosts } from "@/lib/data/blog";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { BookOpen, Share2 } from "lucide-react";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Technical Blogs & LinkedIn Dispatches",
  description:
    "Explore the latest AI research breakthroughs, technical hackathon victories, architecture deep-dives, and workshop insights from the Generative AI Community at VIT Bhopal University.",
  alternates: {
    canonical: "/blogs",
  },
  openGraph: {
    title: "Technical Blogs & Community Dispatches | GENAI Community VIT Bhopal",
    description:
      "Explore the latest AI research, agentic architectures, hackathon wins, and workshop takeaways from the Generative AI Community at VIT Bhopal.",
    url: "https://www.genaiclubvitb.in/blogs",
  },
};

export default async function BlogsPage() {
  const posts = await getBlogPosts();

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#f5b642] selection:text-black overflow-x-clip relative">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://www.genaiclubvitb.in" },
          { name: "Blogs", url: "https://www.genaiclubvitb.in/blogs" },
        ]}
      />
      <Navbar />

      {/* Ambient background lighting */}
      <div className="pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 h-[600px] w-full max-w-7xl bg-[radial-gradient(ellipse_at_center,_rgba(245,182,66,0.08),_transparent_70%)] blur-3xl" />

      <main className="py-12 sm:py-16 relative space-y-12">
        {/* Page Header */}
        <div className="container-wrap text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#0a66c2]/40 bg-[#0a66c2]/10 px-4 py-1 text-xs font-bold uppercase tracking-wider text-[#70b5f9] backdrop-blur-md shadow-[0_0_20px_rgba(10,102,194,0.15)]">
            <Share2 className="h-3.5 w-3.5" />
            <span>Community Dispatches · LinkedIn Blog</span>
          </div>

          <h1 className="text-4xl font-extrabold text-white sm:text-5xl lg:text-6xl tracking-tight">
            Latest Insights &{" "}
            <span className="bg-gradient-to-r from-[#f5b642] via-[#ffd06a] to-[#f5b642] bg-clip-text text-transparent">
              Blogs
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mx-auto font-medium leading-relaxed">
            Real-time breakthroughs, national hackathon podiums, agentic AI architectures, and technical deep-dives from the official social dispatches of GENAI Community VIT Bhopal.
          </p>
        </div>

        {/* Blogs Feed with Search & Filters */}
        <div className="container-wrap">
          <BlogsClient posts={posts} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
