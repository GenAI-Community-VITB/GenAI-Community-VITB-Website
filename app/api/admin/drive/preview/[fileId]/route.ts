import { NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";
import { getAuthenticatedStaff, hasRole } from "@/lib/auth/permissions";
import { getDriveFileStream } from "@/lib/google/drive";
import { isPaymentMedia } from "@/lib/security/media-access";
import { isSafeImageType } from "@/lib/security/image-upload";

export async function GET(_req: NextRequest, context: { params: Promise<{ fileId: string }> }) {
  try {
    const { role, profile } = await getAuthenticatedStaff();
    if (!role || !hasRole(role, "finance", profile?.roles)) {
      return new NextResponse("Unauthorized", { status: 403 });
    }
    const { fileId } = await context.params;
    if (!await isPaymentMedia(fileId)) return new NextResponse("Screenshot not found.", { status: 404 });
    const file = await getDriveFileStream(fileId);
    if (!file) return new NextResponse("Screenshot not found.", { status: 404 });
    if (!isSafeImageType(file.mimeType)) {
      file.stream.destroy();
      return new NextResponse("Unsupported screenshot type.", { status: 415 });
    }
    return new NextResponse(Readable.toWeb(file.stream) as ReadableStream, {
      headers: {
        "Content-Type": file.mimeType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    return new NextResponse("Screenshot temporarily unavailable.", { status: 503 });
  }
}
