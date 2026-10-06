import { isAuthorizedCron } from "@/lib/security/cron-auth";
import { NextRequest, NextResponse } from "next/server";
import { syncLinkedInDispatches } from "@/lib/data/blog";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

/**
 * Webhook and Automated Ingestion Endpoint for LinkedIn posts.
 * Accepts { posts: [ { rawContent, postUrl, authorName, publishedAt } ] } or a single post.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isAuthorizedCron(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    let incomingList: Array<{
      rawContent: string;
      postUrl: string;
      authorName?: string;
      publishedAt?: string;
    }> = [];

    if (Array.isArray(body.posts)) {
      incomingList = body.posts;
    } else if (body.rawContent && body.postUrl) {
      incomingList = [body];
    } else {
      return NextResponse.json(
        { error: "Invalid payload: rawContent and postUrl are required." },
        { status: 400 }
      );
    }

    const result = await syncLinkedInDispatches(incomingList);

    try {
      revalidatePath("/blogs");
      revalidatePath("/");
    } catch {}

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: any) {
    console.error("Blogs sync error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process sync request" },
      { status: 500 }
    );
  }
}

/**
 * Health and on-demand trigger for blogs sync.
 */
export async function GET(request: NextRequest) {
  try {
    if (!isAuthorizedCron(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Trigger sync with past dispatches
    const result = await syncLinkedInDispatches();
    try {
      revalidatePath("/blogs");
      revalidatePath("/");
    } catch {}

    return NextResponse.json({
      status: "synced",
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json({ status: "error", error: err?.message || String(err) }, { status: 500 });
  }
}
