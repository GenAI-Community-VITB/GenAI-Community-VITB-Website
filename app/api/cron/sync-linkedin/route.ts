import { isAuthorizedCron } from "@/lib/security/cron-auth";
import { NextRequest, NextResponse } from "next/server";
import { syncLinkedInDispatches, getPastClubBlogPosts } from "@/lib/data/blog";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

/**
 * Automated Cron Endpoint for syncing official LinkedIn dispatches to the community blog.
 * Secured via CRON_SECRET header.
 */
export async function GET(request: NextRequest) {
  return handleSync(request);
}

export async function POST(request: NextRequest) {
  return handleSync(request);
}

async function handleSync(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized cron trigger" }, { status: 401 });
  }

  try {
    // Collect seed / past dispatches to ensure database is fully populated
    const basePosts = getPastClubBlogPosts().map((p) => ({
      rawContent: p.original_content || p.summary,
      postUrl: p.post_url,
      authorName: p.author_name || "GENAI Community",
      publishedAt: p.published_at,
    }));

    const result = await syncLinkedInDispatches(basePosts);

    // Revalidate paths
    try {
      revalidatePath("/blogs");
      revalidatePath("/");
    } catch {}

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: any) {
    console.error("Cron sync error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to execute cron sync" },
      { status: 500 }
    );
  }
}
