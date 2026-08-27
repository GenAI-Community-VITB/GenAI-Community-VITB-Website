import { NextRequest, NextResponse } from "next/server";
import { syncLinkedInDispatches, getPastClubBlogPosts } from "@/lib/data/blog";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

/**
 * Automated Cron Endpoint for syncing official LinkedIn dispatches to the community blog.
 * Secured via CRON_SECRET header or query parameter.
 */
export async function GET(request: NextRequest) {
  return handleSync(request);
}

export async function POST(request: NextRequest) {
  return handleSync(request);
}

async function handleSync(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get("authorization");
  const { searchParams } = new URL(request.url);
  const secretParam = searchParams.get("secret");

  // Check authorization if CRON_SECRET is configured
  if (cronSecret) {
    const isAuthorized =
      authHeader === `Bearer ${cronSecret}` ||
      secretParam === cronSecret ||
      request.headers.get("x-cron-secret") === cronSecret;

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized cron trigger" }, { status: 401 });
    }
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
