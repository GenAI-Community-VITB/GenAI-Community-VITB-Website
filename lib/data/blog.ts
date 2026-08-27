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
      .order("published_at", { ascending: false });

    if (error || !posts) {
      return [];
    }

    return posts as BlogPost[];
  } catch {
    return [];
  }
});

export async function getAllAdminBlogPostsAction(): Promise<{
  success: boolean;
  posts?: BlogPost[];
  error?: string;
}> {
  try {
    const supabase = createAdminSupabase();
    const { data: posts, error } = await supabase
      .from("blog_posts")
      .select("*")
      .order("published_at", { ascending: false });

    if (error) throw new Error(error.message);
    return { success: true, posts: (posts || []) as BlogPost[] };
  } catch (err: any) {
    return { success: false, error: err.message, posts: [] };
  }
}

export async function generateAiSummaryAction(params: {
  rawContent: string;
  postUrl?: string;
}): Promise<{
  success: boolean;
  headline?: string;
  summary?: string;
  tags?: string[];
  error?: string;
}> {
  try {
    if (!params.rawContent || params.rawContent.trim().length === 0) {
      return { success: false, error: "Please enter LinkedIn post text to summarize." };
    }

    const aiRes = await summarizeLinkedInPostWithAI({
      rawContent: params.rawContent,
      postUrl: params.postUrl,
    });

    return {
      success: true,
      headline: aiRes.headline,
      summary: aiRes.summary,
      tags: aiRes.tags,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to generate AI summary." };
  }
}

export async function upsertBlogPostAction(formData: FormData): Promise<{
  success: boolean;
  post?: BlogPost;
  error?: string;
}> {
  try {
    const id = formData.get("id") ? String(formData.get("id")).trim() : undefined;
    const title = String(formData.get("title") || "").trim();
    const summary = String(formData.get("summary") || "").trim();
    const originalContent = String(formData.get("original_content") || "").trim();
    const postUrl = String(formData.get("post_url") || "").trim();
    const authorName = String(formData.get("author_name") || "GENAI Social Media Team").trim();
    const tagsRaw = String(formData.get("tags") || "").trim();
    const isPublished = formData.get("is_published") === "true" || formData.get("is_published") === "on";
    const imageUrl = formData.get("image_url") ? String(formData.get("image_url")).trim() : null;

    if (!title) return { success: false, error: "Headline title is required." };
    if (!summary) return { success: false, error: "Summary is required." };
    if (!postUrl) return { success: false, error: "LinkedIn post URL is required." };

    const tags = tagsRaw
      ? tagsRaw.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean)
      : ["GenAI", "Community"];

    const supabase = createAdminSupabase();

    if (id) {
      const { data, error } = await supabase
        .from("blog_posts")
        .update({
          title,
          summary,
          original_content: originalContent || null,
          post_url: postUrl,
          author_name: authorName,
          tags,
          is_published: isPublished,
          image_url: imageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw new Error(error.message);
      return { success: true, post: data as BlogPost };
    } else {
      const { data, error } = await supabase
        .from("blog_posts")
        .insert({
          title,
          summary,
          original_content: originalContent || null,
          post_url: postUrl,
          author_name: authorName,
          tags,
          is_published: isPublished,
          image_url: imageUrl,
          published_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (error) throw new Error(error.message);
      return { success: true, post: data as BlogPost };
    }
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to save blog post." };
  }
}

export async function deleteBlogPostAction(formData: FormData): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const id = String(formData.get("id") || "").trim();
    if (!id) return { success: false, error: "Post ID is required." };

    const supabase = createAdminSupabase();
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) throw new Error(error.message);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete blog post." };
  }
}

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
