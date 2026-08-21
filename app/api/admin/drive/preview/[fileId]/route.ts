import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedStaff, hasRole } from "@/lib/auth/permissions";
import { getDriveFileStream } from "@/lib/google/drive";
import { Readable } from "stream";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ fileId: string }> },
) {
  try {
    const { role } = await getAuthenticatedStaff();

    // Only Finance and Tech users can preview payment screenshots
    if (!role || !hasRole(role, "finance")) {
      return new NextResponse("Unauthorized: Insufficient permissions to view payment screenshots.", {
        status: 403,
      });
    }

    const { fileId } = await context.params;
    if (!fileId) {
      return new NextResponse("File ID is required.", { status: 400 });
    }

    // If mock file in development
    if (fileId.startsWith("mock-drive-")) {
      // Return a lightweight placeholder SVG
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
          <rect width="600" height="400" fill="#141414"/>
          <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="#f5b642" font-family="sans-serif" font-size="20" font-weight="bold">Mock Payment Screenshot</text>
          <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="#888888" font-family="sans-serif" font-size="14">File ID: ${fileId}</text>
          <text x="50%" y="65%" dominant-baseline="middle" text-anchor="middle" fill="#666666" font-family="sans-serif" font-size="12">Google Drive API credentials active in production</text>
        </svg>
      `;
      return new NextResponse(svg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "private, max-age=3600",
        },
      });
    }

    const fileStreamData = await getDriveFileStream(fileId);
    if (!fileStreamData) {
      return new NextResponse("Screenshot file not found on Google Drive.", { status: 404 });
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
        "Content-Type": fileStreamData.mimeType,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (err: any) {
    console.error("Error previewing Drive file:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
