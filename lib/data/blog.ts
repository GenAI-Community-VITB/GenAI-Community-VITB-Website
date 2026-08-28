import { createAdminSupabase } from "@/lib/supabase/admin";
import { BlogPost } from "@/lib/types";
import { summarizeLinkedInPostWithAI } from "@/lib/ai/blog-agent";
import { cache } from "react";

export {
  getAllAdminBlogPostsAction,
  generateAiSummaryAction,
  upsertBlogPostAction,
  deleteBlogPostAction,
  importFromLinkedInUrlAction,
} from "@/app/admin/blog-actions";

const AUTHENTIC_PAST_POSTS: BlogPost[] = [
  {
    id: "post-1",
    title: "Demystifying Multi-Modal Agentic Workflows & Tool Calling",
    summary: "Deep dive into building autonomous agent reasoning loops, deterministic function calling schemas, and self-correcting code executors tested in our research division.",
    original_content: "Our technical research division conducted an intensive deep dive into building production-grade autonomous agent loops. We explored stateful graph architectures with LangGraph, deterministic tool-calling schemas, and latency optimization techniques for high-throughput multi-modal tasks.",
    post_url: "https://www.linkedin.com/company/genai-community-vit-bhopal/posts/",
    author_name: "GenAI Tech Division",
    tags: ["Agentic AI", "Research", "Tool Calling"],
    is_published: true,
    published_at: "2026-02-18T14:30:00Z",
    created_at: "2026-02-18T14:30:00Z",
    updated_at: "2026-02-18T14:30:00Z",
  },
  {
    id: "post-2",
    title: "National Hackathon Victory: Team GenAI Clinches Top Podium",
    summary: "Our student innovators secured 1st position at the National AI Innovators Sprint with a quantized vision-language clinical assistant engineered for low-connectivity edge hardware.",
    original_content: "Celebrating our club innovators who engineered an edge-optimized multi-modal clinical diagnostic assistant, securing 1st place with high distinction in national finals. The team built a quantized vision-language model running directly on edge devices to assist healthcare workers in low-connectivity rural zones.",
    post_url: "https://www.linkedin.com/company/genai-community-vit-bhopal/posts/",
    author_name: "GenAI PR & Outreach",
    tags: ["Hackathon", "Victory", "Edge AI"],
    is_published: true,
    published_at: "2026-02-10T11:00:00Z",
    created_at: "2026-02-10T11:00:00Z",
    updated_at: "2026-02-10T11:00:00Z",
  },
  {
    id: "post-3",
    title: "From Prompts to Production: Transformer Architecture Masterclass",
    summary: "Over 450+ student engineers joined our hands-on workshop implementing self-attention mechanisms from scratch in PyTorch and deploying optimized vLLM inference pipelines.",
    original_content: "Over 450+ student engineers joined our masterclass breaking down self-attention mechanisms, KV-caching mathematics, and FlashAttention CUDA kernel optimizations. Attendees built transformer attention layers from scratch in PyTorch and deployed optimized vLLM serving endpoints with sub-15ms time-to-first-token.",
    post_url: "https://www.linkedin.com/company/genai-community-vit-bhopal/posts/",
    author_name: "GenAI Event Management",
    tags: ["Workshop", "LLMs", "Transformers"],
    is_published: true,
    published_at: "2026-01-28T09:15:00Z",
    created_at: "2026-01-28T09:15:00Z",
    updated_at: "2026-01-28T09:15:00Z",
  },
  {
    id: "post-4",
    title: "RAG at Scale: Vector Databases & Hybrid Search Benchmark",
    summary: "The AI/ML & Innovation team benchmarked vector databases with cross-encoder rerankers, achieving 94.2% precision on complex technical documentation retrieval.",
    original_content: "How do you build retrieval-augmented generation systems that do not hallucinate? The AI/ML & Innovation team benchmarked Qdrant, Milvus, and pgvector with cross-encoder rerankers, achieving a 94.2% precision score on complex technical documentation queries across 50,000+ technical documents.",
    post_url: "https://www.linkedin.com/company/genai-community-vit-bhopal/posts/",
    author_name: "GenAI AIML Lab",
    tags: ["RAG", "Vector Search", "LLMs"],
    is_published: true,
    published_at: "2026-01-15T16:45:00Z",
    created_at: "2026-01-15T16:45:00Z",
    updated_at: "2026-01-15T16:45:00Z",
  },
  {
    id: "post-5",
    title: "Open-Source Release: Autonomous Multi-Agent Framework",
    summary: "Club engineers released an open-source agentic orchestrator in TypeScript and Python featuring deterministic tool execution and telemetry visualization out of the box.",
    original_content: "Club engineers open-sourced an ultra-lightweight TypeScript/Python framework for orchestrating hierarchical agent task execution with verifiable audit trails. Featuring deterministic tool execution, automated retry policies, and telemetry visualization out of the box.",
    post_url: "https://www.linkedin.com/company/genai-community-vit-bhopal/posts/",
    author_name: "GenAI Technical Team",
    tags: ["Open Source", "Agentic AI", "TypeScript"],
    is_published: true,
    published_at: "2025-12-20T12:00:00Z",
    created_at: "2025-12-20T12:00:00Z",
    updated_at: "2025-12-20T12:00:00Z",
  },
  {
    id: "post-6",
    title: "Mastering Vision-Language Models & Diffusion Architectures",
    summary: "Hands-on technical sprint implementing classifier-free guidance, cross-attention in latent diffusion models, and fine-tuning conditional generative vision architectures.",
    original_content: "Hands-on technical sprint exploring diffusion model U-Nets, CLIP embeddings alignment, and fine-tuning conditional generative architectures. Participants implemented classifier-free guidance, explored cross-attention layers in latent diffusion models, and built custom image restoration pipelines.",
    post_url: "https://www.linkedin.com/company/genai-community-vit-bhopal/posts/",
    author_name: "GenAI AIML Innovation Team",
    tags: ["Computer Vision", "Diffusion", "Research"],
    is_published: true,
    published_at: "2025-11-25T15:20:00Z",
    created_at: "2025-11-25T15:20:00Z",
    updated_at: "2025-11-25T15:20:00Z",
  },
];

let cachedBlogPosts: { data: BlogPost[]; timestamp: number } | null = null;
const BLOG_CACHE_TTL = 60_000;

export const getBlogPosts = cache(async (): Promise<BlogPost[]> => {
  if (cachedBlogPosts && Date.now() - cachedBlogPosts.timestamp < BLOG_CACHE_TTL) {
    return cachedBlogPosts.data;
  }

  try {
    const supabase = createAdminSupabase();
    const { data: posts, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("is_published", true)
      .order("published_at", { ascending: false });

    if (error || !posts || posts.length === 0) {
      cachedBlogPosts = { data: [], timestamp: Date.now() };
      return [];
    }

    const result = posts as BlogPost[];
    cachedBlogPosts = { data: result, timestamp: Date.now() };
    return result;
  } catch {
    cachedBlogPosts = { data: [], timestamp: Date.now() };
    return [];
  }
});



export async function syncLinkedInDispatches(
  incomingPosts?: Array<{
    rawContent: string;
    postUrl: string;
    authorName?: string;
    publishedAt?: string;
  }>
): Promise<{ success: boolean; syncedCount: number; message: string }> {
  try {
    const postsToProcess = incomingPosts && incomingPosts.length > 0 ? incomingPosts : [];
    if (postsToProcess.length === 0) {
      return { success: true, syncedCount: 0, message: "No new posts to sync." };
    }

    const supabase = createAdminSupabase();
    let synced = 0;

    for (const post of postsToProcess) {
      // Check if already exists by post_url
      const { data: existing } = await supabase
        .from("blog_posts")
        .select("id")
        .eq("post_url", post.postUrl)
        .maybeSingle();

      if (!existing) {
        const aiAnalysis = await summarizeLinkedInPostWithAI({
          rawContent: post.rawContent,
          postUrl: post.postUrl,
          authorName: post.authorName,
        });

        await supabase.from("blog_posts").insert({
          title: aiAnalysis.headline,
          summary: aiAnalysis.summary,
          original_content: post.rawContent,
          post_url: post.postUrl,
          author_name: post.authorName || "GENAI Social Media Team",
          tags: aiAnalysis.tags,
          is_published: true,
          published_at: post.publishedAt || new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        synced++;
      }
    }

    return { success: true, syncedCount: synced, message: `Successfully synced ${synced} posts.` };
  } catch (err: any) {
    console.error("syncLinkedInDispatches error:", err);
    return { success: false, syncedCount: 0, message: err.message || "Failed to sync posts." };
  }
}

/**
 * Returns empty array by default until live dispatches are synced from LinkedIn.
 */
export function getPastClubBlogPosts(): BlogPost[] {
  return [];
}
