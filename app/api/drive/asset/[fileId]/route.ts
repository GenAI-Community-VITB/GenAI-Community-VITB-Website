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
          <defs>
            <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#2a2012"/>
              <stop offset="100%" stop-color="#0c0a07"/>
            </linearGradient>
            <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#f5b642"/>
              <stop offset="100%" stop-color="#ffd06a"/>
            </linearGradient>
          </defs>
          <rect width="200" height="200" rx="24" fill="url(#g1)" stroke="#382c16" stroke-width="2"/>
          <circle cx="100" cy="100" r="54" fill="#141009" stroke="#f5b642" stroke-width="1.5" stroke-dasharray="4 2"/>
          <text x="100" y="106" dominant-baseline="middle" text-anchor="middle" fill="url(#g2)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="900" letter-spacing="1">AI</text>
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
