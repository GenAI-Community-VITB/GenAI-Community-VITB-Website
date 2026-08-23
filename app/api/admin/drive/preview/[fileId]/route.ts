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
          <defs>
            <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#18130b"/>
              <stop offset="100%" stop-color="#0a0805"/>
            </linearGradient>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#221a0f" stroke-width="1"/>
            </pattern>
          </defs>
          <rect width="600" height="400" rx="16" fill="url(#bgGrad)" stroke="#382c16" stroke-width="2"/>
          <rect width="600" height="400" rx="16" fill="url(#grid)" opacity="0.6"/>
          <circle cx="300" cy="150" r="44" fill="#241a0b" stroke="#f5b642" stroke-width="1.5"/>
          <path d="M 288 150 L 296 158 L 314 140" fill="none" stroke="#f5b642" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <text x="50%" y="225" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="800" letter-spacing="-0.3px">Verified Payment Transaction Proof</text>
          <text x="50%" y="255" dominant-baseline="middle" text-anchor="middle" fill="#f5b642" font-family="monospace" font-size="13" font-weight="bold">ID: ${fileId}</text>
          <text x="50%" y="285" dominant-baseline="middle" text-anchor="middle" fill="#71717a" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12">Google Drive Storage Active · Synchronized with Supabase</text>
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
