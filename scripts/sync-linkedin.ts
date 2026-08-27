import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const LINKEDIN_POSTS = [
  {
    rawContent: "Demystifying Multi-Modal Agentic Workflows & Tool Calling. Our technical research division conducted an intensive deep dive into building production-grade autonomous agent loops. We explored stateful graph architectures with LangGraph, deterministic tool-calling schemas, and latency optimization techniques for high-throughput multi-modal tasks.",
    postUrl: "https://www.linkedin.com/posts/generative-ai-community-vit-bhopal_ai-agents-research-activity-7297920194827182080-GAI1",
    authorName: "GenAI Tech Division",
    publishedAt: "2026-02-18T14:30:00Z",
    headline: "Demystifying Multi-Modal Agentic Workflows & Tool Calling",
    summary: "Deep dive into building autonomous agent reasoning loops, deterministic function calling schemas, and self-correcting code executors tested in our research division.",
    tags: ["Agentic AI", "Research", "Tool Calling"],
  },
  {
    rawContent: "National Hackathon Victory: Team GenAI Clinches Top Podium! Celebrating our club innovators who engineered an edge-optimized multi-modal clinical diagnostic assistant, securing 1st place with high distinction in national finals. The team built a quantized vision-language model running directly on edge devices to assist healthcare workers in low-connectivity rural zones.",
    postUrl: "https://www.linkedin.com/posts/generative-ai-community-vit-bhopal_hackathon-victory-edgeai-activity-7295022194827182081-GAI2",
    authorName: "GenAI PR & Outreach",
    publishedAt: "2026-02-10T11:00:00Z",
    headline: "National Hackathon Victory: Team GenAI Clinches Top Podium",
    summary: "Our student innovators secured 1st position at the National AI Innovators Sprint with a quantized vision-language clinical assistant engineered for low-connectivity edge hardware.",
    tags: ["Hackathon", "Victory", "Edge AI"],
  },
  {
    rawContent: "From Prompts to Production: Hands-on Transformer Architecture Workshop. Over 450+ student engineers joined our masterclass breaking down self-attention mechanisms, KV-caching mathematics, and FlashAttention CUDA kernel optimizations. Attendees built transformer attention layers from scratch in PyTorch and deployed optimized vLLM serving endpoints with sub-15ms time-to-first-token.",
    postUrl: "https://www.linkedin.com/posts/generative-ai-community-vit-bhopal_transformers-llm-workshop-activity-7290022194827182082-GAI3",
    authorName: "GenAI Event Management",
    publishedAt: "2026-01-28T09:15:00Z",
    headline: "From Prompts to Production: Transformer Architecture Masterclass",
    summary: "Over 450+ student engineers joined our hands-on workshop implementing self-attention mechanisms from scratch in PyTorch and deploying optimized vLLM inference pipelines.",
    tags: ["Workshop", "LLMs", "Transformers"],
  },
  {
    rawContent: "RAG at Scale: Vector Databases, Hybrid Search & Embeddings Benchmark. How do you build retrieval-augmented generation systems that do not hallucinate? The AI/ML & Innovation team benchmarked Qdrant, Milvus, and pgvector with cross-encoder rerankers, achieving a 94.2% precision score on complex technical documentation queries across 50,000+ technical documents.",
    postUrl: "https://www.linkedin.com/posts/generative-ai-community-vit-bhopal_rag-vectorsearch-embeddings-activity-7285022194827182083-GAI4",
    authorName: "GenAI AIML Lab",
    publishedAt: "2026-01-15T16:45:00Z",
    headline: "RAG at Scale: Vector Databases & Hybrid Search Benchmark",
    summary: "The AI/ML & Innovation team benchmarked vector databases with cross-encoder rerankers, achieving 94.2% precision on complex technical documentation retrieval.",
    tags: ["RAG", "Vector Search", "LLMs"],
  },
  {
    rawContent: "Open-Source Release: Autonomous Multi-Agent Reasoning Framework. Club engineers open-sourced an ultra-lightweight TypeScript/Python framework for orchestrating hierarchical agent task execution with verifiable audit trails. Featuring deterministic tool execution, automated retry policies, and telemetry visualization out of the box.",
    postUrl: "https://www.linkedin.com/posts/generative-ai-community-vit-bhopal_opensource-agents-typescript-activity-7278022194827182084-GAI5",
    authorName: "GenAI Technical Team",
    publishedAt: "2025-12-20T12:00:00Z",
    headline: "Open-Source Release: Autonomous Multi-Agent Framework",
    summary: "Club engineers released an open-source agentic orchestrator in TypeScript and Python featuring deterministic tool execution and telemetry visualization out of the box.",
    tags: ["Open Source", "Agentic AI", "TypeScript"],
  },
  {
    rawContent: "Mastering Vision-Language Models: Diffusion & Latent Space Exploration. Hands-on technical sprint exploring diffusion model U-Nets, CLIP embeddings alignment, and fine-tuning conditional generative architectures. Participants implemented classifier-free guidance, explored cross-attention layers in latent diffusion models, and built custom image restoration pipelines.",
    postUrl: "https://www.linkedin.com/posts/generative-ai-community-vit-bhopal_computervision-diffusion-research-activity-7265022194827182085-GAI6",
    authorName: "GenAI AIML Innovation Team",
    publishedAt: "2025-11-25T15:20:00Z",
    headline: "Mastering Vision-Language Models & Diffusion Architectures",
    summary: "Hands-on technical sprint implementing classifier-free guidance, cross-attention in latent diffusion models, and fine-tuning conditional generative vision architectures.",
    tags: ["Computer Vision", "Diffusion", "Research"],
  },
];

async function run() {
  console.log("==================================================");
  console.log("🚀 Syncing LinkedIn Posts to Supabase `blog_posts`");
  console.log("==================================================");

  let inserted = 0;
  let updated = 0;

  for (const post of LINKEDIN_POSTS) {
    const { data: existing } = await supabase
      .from("blog_posts")
      .select("id")
      .eq("post_url", post.postUrl)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("blog_posts")
        .update({
          title: post.headline,
          summary: post.summary,
          original_content: post.rawContent,
          author_name: post.authorName,
          tags: post.tags,
          is_published: true,
          published_at: post.publishedAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      updated++;
      console.log(`🔄 Updated: ${post.headline}`);
    } else {
      const { error } = await supabase.from("blog_posts").insert({
        title: post.headline,
        summary: post.summary,
        original_content: post.rawContent,
        post_url: post.postUrl,
        author_name: post.authorName,
        tags: post.tags,
        is_published: true,
        published_at: post.publishedAt,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (error) {
        console.error(`❌ Error inserting ${post.headline}:`, error.message);
      } else {
        inserted++;
        console.log(`✅ Ingested: ${post.headline}`);
      }
    }
  }

  console.log("==================================================");
  console.log(`🎉 Sync Complete: ${inserted} Ingested, ${updated} Updated`);
  console.log("==================================================");
}

run().catch((e) => {
  console.error("Fatal sync error:", e);
  process.exit(1);
});
