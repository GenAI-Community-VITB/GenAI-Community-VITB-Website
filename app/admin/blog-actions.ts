"use server";

import { createAdminSupabase } from "@/lib/supabase/admin";
import type { BlogPost } from "@/lib/types";
import { summarizeLinkedInPostWithAI } from "@/lib/ai/blog-agent";
import { revalidatePath } from "next/cache";

export async function getAllAdminBlogPostsAction(): Promise<{ success: boolean; posts?: BlogPost[]; error?: string }> {
  try {
    const supabase = createAdminSupabase();
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .order("published_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, posts: (data || []) as BlogPost[] };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch blog posts." };
  }
}

export async function generateAiSummaryAction(params: {
  rawContent: string;
  postUrl?: string;
  authorName?: string;
}): Promise<{
  success: boolean;
  headline?: string;
  summary?: string;
  tags?: string[];
  error?: string;
}> {
  try {
    const result = await summarizeLinkedInPostWithAI({
      rawContent: params.rawContent,
      postUrl: params.postUrl || "https://www.linkedin.com/company/genai-community-vit-bhopal/posts/",
      authorName: params.authorName || "GENAI Social Media Team",
    });

    return {
      success: true,
      headline: result.headline,
      summary: result.summary,
      tags: result.tags,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to generate AI summary.",
    };
  }
}

export async function upsertBlogPostAction(formData: FormData): Promise<{
  success: boolean;
  post?: BlogPost;
  error?: string;
}> {
  try {
    const supabase = createAdminSupabase();
    const rawId = formData.get("id") ? String(formData.get("id")).trim() : null;
    const isEdit = Boolean(rawId);

    const title = String(formData.get("title") || "").trim();
    const summary = String(formData.get("summary") || "").trim();
    const originalContent = String(formData.get("original_content") || "").trim();
    const postUrl = String(formData.get("post_url") || "").trim();
    const authorName = String(formData.get("author_name") || "GENAI Social Media Team").trim();
    const tagsRaw = String(formData.get("tags") || "");
    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const isPublished = formData.get("is_published") === "true";
    const imageUrl = formData.get("image_url") ? String(formData.get("image_url")).trim() : null;

    if (!title) return { success: false, error: "Title is required." };
    if (!summary) return { success: false, error: "Summary is required." };

    const payload: Record<string, any> = {
      title,
      summary,
      original_content: originalContent || summary,
      post_url: postUrl || "https://www.linkedin.com/company/genai-community-vit-bhopal/posts/",
      author_name: authorName,
      tags: tags.length > 0 ? tags : ["AI", "Community"],
      is_published: isPublished,
      image_url: imageUrl,
      updated_at: new Date().toISOString(),
    };

    let savedPost: any = null;

    if (isEdit) {
      const { data, error } = await supabase
        .from("blog_posts")
        .update(payload)
        .eq("id", rawId)
        .select()
        .single();
      if (error) return { success: false, error: `Database error updating blog post: ${error.message}` };
      savedPost = data;
    } else {
      payload.id = crypto.randomUUID();
      payload.published_at = new Date().toISOString();
      payload.created_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("blog_posts")
        .insert(payload)
        .select()
        .single();
      if (error) return { success: false, error: `Database error inserting blog post: ${error.message}` };
      savedPost = data;
    }

    try {
      revalidatePath("/blogs");
      revalidatePath("/");
      revalidatePath("/admin");
    } catch {}

    return { success: true, post: savedPost as BlogPost };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to save blog post." };
  }
}

export async function deleteBlogPostAction(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const id = String(formData.get("id") || "").trim();
    if (!id) return { success: false, error: "Blog post ID is required." };

    const supabase = createAdminSupabase();
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) return { success: false, error: `Database error deleting blog post: ${error.message}` };

    try {
      revalidatePath("/blogs");
      revalidatePath("/");
      revalidatePath("/admin");
    } catch {}

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete blog post." };
  }
}

export async function importFromLinkedInUrlAction(params: {
  postUrl: string;
  rawContentHint?: string;
  authorName?: string;
}): Promise<{
  success: boolean;
  post?: BlogPost;
  error?: string;
}> {
  try {
    const cleanUrl = params.postUrl.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      return { success: false, error: "Please enter a valid HTTP/HTTPS LinkedIn post URL." };
    }

    // 1. Scrape metadata from LinkedIn post URL
    let extractedText = params.rawContentHint?.trim() || "";
    let ogImage: string | null = null;
    let extractedTitle: string | null = null;

    try {
      const response = await fetch(cleanUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(6000),
      });

      if (response.ok) {
        const html = await response.text();

        const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i) ||
          html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
        if (ogDescMatch && ogDescMatch[1]) {
          extractedText = extractedText || ogDescMatch[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
        }

        const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i);
        if (ogTitleMatch && ogTitleMatch[1]) {
          extractedTitle = ogTitleMatch[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
        }

        const ogImgMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i);
        if (ogImgMatch && ogImgMatch[1] && !ogImgMatch[1].includes("static.licdn.com")) {
          ogImage = ogImgMatch[1].replace(/&amp;/g, "&");
        }
      }
    } catch {
      // Fallback if scraping timed out or blocked
    }

    // 2. Synthesize with fallback if no description was scrapeable
    if (!extractedText) {
      const urlSlug = cleanUrl.split("/posts/")[1]?.split("?")[0] || cleanUrl.split("/activity-")[1]?.split("?")[0] || "";
      const readableTopic = urlSlug.replace(/[-_]/g, " ").replace(/[0-9]+/g, "").trim();
      extractedText = `Official technical post and community update from the Generative AI Community at VIT Bhopal regarding ${readableTopic || "recent AI innovations, research sprints, and workshops"}.`;
    }

    // 3. Summarize with Gemini AI
    const aiRes = await summarizeLinkedInPostWithAI({
      rawContent: extractedText,
      postUrl: cleanUrl,
      authorName: params.authorName || "GENAI Social Media Team",
    });

    const title = aiRes.headline || extractedTitle || "GenAI Community Dispatch";
    const summary = aiRes.summary || "Executive update from the GenAI Community VIT Bhopal.";
    const tags = aiRes.tags && aiRes.tags.length > 0 ? aiRes.tags : ["GenAI", "Community", "Research"];
    const author = params.authorName || "GENAI Social Media Team";

    // 4. Save directly into Supabase blog_posts table
    const supabase = createAdminSupabase();
    const newPostId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const { data: post, error: insertError } = await supabase
      .from("blog_posts")
      .insert({
        id: newPostId,
        title,
        summary,
        original_content: extractedText,
        post_url: cleanUrl,
        author_name: author,
        tags,
        is_published: true,
        image_url: ogImage,
        published_at: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select("*")
      .single();

    if (insertError) {
      return { success: false, error: `Database error inserting blog post: ${insertError.message}` };
    }

    try {
      revalidatePath("/blogs");
      revalidatePath("/");
      revalidatePath("/admin");
    } catch {}

    return {
      success: true,
      post: post as BlogPost,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to process LinkedIn URL with AI.",
    };
  }
}
