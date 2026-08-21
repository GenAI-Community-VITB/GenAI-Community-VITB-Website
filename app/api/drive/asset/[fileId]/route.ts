import { NextRequest, NextResponse } from "next/server";
import { getDriveFileStream } from "@/lib/google/drive";

export const dynamic = "force-dynamic";

/**
 * Public Asset & Avatar Streamer from Google Drive & Fallback Storage
 * Scalable: Caches in CDN & Browser for 7 days with stale-while-revalidate.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ fileId: string }> },
) {
  try {
    const { fileId } = await context.params;
    if (!fileId) {
      return new NextResponse("File ID is required.", { status: 400 });
    }

    // Mock fallback in local/dev
    if (fileId.startsWith("mock-") || fileId.startsWith("storage_avatar_mock")) {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
          <rect width="200" height="200" fill="#18140c"/>
          <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#f5b642" font-family="sans-serif" font-size="28" font-weight="bold">GA</text>
        </svg>
      `;
      return new NextResponse(svg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=604800, immutable",
        },
      });
    }

    const fileStreamData = await getDriveFileStream(fileId);
    if (!fileStreamData) {
      return new NextResponse("Asset file not found.", { status: 404 });
    }

    // Convert Node Readable to Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        fileStreamData.stream.on("data", (chunk) => controller.enqueue(chunk));
        fileStreamData.stream.on("end", () => controller.close());
        fileStreamData.stream.on("error", (err) => controller.error(err));
      },
    });

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": fileStreamData.mimeType || "image/jpeg",
        "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400, immutable",
      },
    });
  } catch (err: any) {
    console.error("Error streaming public Drive asset:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
