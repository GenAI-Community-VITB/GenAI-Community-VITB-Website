import { createAdminSupabase } from "@/lib/supabase/admin";
import { BlogPost } from "@/lib/types";
import { summarizeLinkedInPostWithAI } from "@/lib/ai/blog-agent";
import { cache } from "react";

export const getBlogPosts = cache(async (): Promise<BlogPost[]> => {
  try {
    const supabase = createAdminSupabase();
    const { data: posts, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(6);

    if (error || !posts) {
      return getFallbackBlogPosts();
    }

    return posts as BlogPost[];
  } catch {
    return getFallbackBlogPosts();
  }
});

export async function createLinkedInBlogPost(params: {
  rawContent: string;
  postUrl: string;
  authorName?: string;
  customHeadline?: string;
  customSummary?: string;
}): Promise<{ success: boolean; post?: BlogPost; error?: string }> {
  try {
    const { rawContent, postUrl, authorName = "GENAI Social Media Team" } = params;

    // Run AI summarization agent
    const aiAnalysis = await summarizeLinkedInPostWithAI({
      rawContent,
      postUrl,
      authorName,
    });

    const headline = params.customHeadline?.trim() || aiAnalysis.headline;
    const summary = params.customSummary?.trim() || aiAnalysis.summary;

    const supabase = createAdminSupabase();
    const { data: post, error } = await supabase
      .from("blog_posts")
      .insert({
        title: headline,
        summary,
        original_content: rawContent,
        post_url: postUrl,
        author_name: authorName,
        tags: aiAnalysis.tags,
        is_published: true,
        published_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    return { success: true, post: post as BlogPost };
  } catch (err: any) {
    console.error("Error creating LinkedIn blog post:", err);
    return { success: false, error: err.message };
  }
}

function getFallbackBlogPosts(): BlogPost[] {
  return [
    {
      id: "blog-1",
      title: "Demystifying Multi-Modal Agentic Workflows & Tool Calling",
      summary:
        "Exploring autonomous agent reasoning paradigms, deterministic tool-calling loops, and production design patterns tested in our research lab.",
      post_url: "https://www.linkedin.com/company/generative-ai-community-vit-bhopal/",
      author_name: "GENAI Tech Division",
      tags: ["AI Agents", "Research", "Tool Calling"],
      is_published: true,
      published_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "blog-2",
      title: "National Hackathon Victory: Team GenAI Clinches Top Podium",
      summary:
        "Celebrating our club innovators who engineered a low-latency edge AI system for clinical diagnosis, securing 1st place in national finals.",
      post_url: "https://www.linkedin.com/company/generative-ai-community-vit-bhopal/",
      author_name: "GENAI PR & Outreach",
      tags: ["Hackathon", "Victory", "Innovation"],
      is_published: true,
      published_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "blog-3",
      title: "From Prompts to Production: Hands-on Transformer Architecture Workshop",
      summary:
        "Over 450+ attendees joined our intensive masterclass breaking down self-attention mechanisms, KV-caching, and FlashAttention optimizations.",
      post_url: "https://www.linkedin.com/company/generative-ai-community-vit-bhopal/",
      author_name: "GENAI Event Management",
      tags: ["Workshop", "LLMs", "Transformers"],
      is_published: true,
      published_at: new Date(Date.now() - 10 * 86400000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
}
