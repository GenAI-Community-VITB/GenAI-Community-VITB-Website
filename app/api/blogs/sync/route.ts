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
    const cronSecret = process.env.CRON_SECRET?.trim();
    const authHeader = request.headers.get("authorization");
    const { searchParams } = new URL(request.url);
    const secretParam = searchParams.get("secret");

    if (cronSecret) {
      const isAuthorized =
        authHeader === `Bearer ${cronSecret}` ||
        secretParam === cronSecret ||
        request.headers.get("x-cron-secret") === cronSecret;

      if (!isAuthorized) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
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
