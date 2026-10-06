import { NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";
import { getDriveFileStream } from "@/lib/google/drive";
import { isPublicMedia, isValidFileId } from "@/lib/security/media-access";
import { isSafeImageType } from "@/lib/security/image-upload";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, context: { params: Promise<{ fileId: string }> }) {
  try {
    const { fileId } = await context.params;
    if (!isValidFileId(fileId)) return new NextResponse("Invalid file ID.", { status: 400 });
    if (!await isPublicMedia(fileId)) return new NextResponse("Asset not found.", { status: 404 });
    const file = await getDriveFileStream(fileId);
    if (!file) return new NextResponse("Asset not found.", { status: 404 });
    if (!isSafeImageType(file.mimeType)) {
      file.stream.destroy();
      return new NextResponse("Unsupported media type.", { status: 415 });
    }
    return new NextResponse(Readable.toWeb(file.stream) as ReadableStream, {
      headers: {
        "Content-Type": file.mimeType,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        // Recheck publication/access on each request, including after removal.
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new NextResponse("Asset temporarily unavailable.", { status: 503 });
  }
}
