import { google, drive_v3 } from "googleapis";
import { Readable } from "stream";
import { createAdminSupabase } from "@/lib/supabase/admin";

// In-memory / database fallback cache for screenshot previews when Google personal drive quota applies
const localScreenshotCache = new Map<string, { buffer: Buffer; mimeType: string }>();

/**
 * Initializes and returns the authenticated Google Drive v3 client.
 * Uses service account credentials from environment variables.
 */
export function getGoogleDriveClient(): drive_v3.Drive | null {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    return null;
  }

  // Handle escaped newlines in private key string if passed from .env
  privateKey = privateKey.replace(/\\n/g, "\n");

  try {
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });

    return google.drive({ version: "v3", auth });
  } catch (err) {
    console.error("Error creating Google Drive JWT auth client:", err);
    return null;
  }
}

/**
 * Helper to find or create a subfolder in Google Drive under a parent folder.
 * Supports both Shared Drives and personal drives.
 */
async function getOrCreateFolder(
  drive: drive_v3.Drive,
  folderName: string,
  parentFolderId?: string,
  sharedDriveId?: string,
): Promise<string> {
  try {
    let query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;
    if (parentFolderId) {
      query += ` and '${parentFolderId}' in parents`;
    }

    const res = await drive.files.list({
      q: query,
      fields: "files(id, name)",
      spaces: sharedDriveId ? "drive" : "drive",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      driveId: sharedDriveId,
      corpora: sharedDriveId ? "drive" : "user",
    });

    if (res.data.files && res.data.files.length > 0 && res.data.files[0].id) {
      return res.data.files[0].id;
    }

    const fileMetadata: drive_v3.Schema$File = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentFolderId ? [parentFolderId] : undefined,
      driveId: sharedDriveId,
    };

    const folder = await drive.files.create({
      requestBody: fileMetadata,
      fields: "id",
      supportsAllDrives: true,
    });

    if (!folder.data.id) {
      return parentFolderId || "root";
    }

    return folder.data.id;
  } catch {
    return parentFolderId || "root";
  }
}

/**
 * Core upload function — uploads buffer to Google Drive Shared Drive or
 * falls back to base64 data-URL stored in Supabase (always works, no quota needed).
 */
async function uploadBufferToDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  folderPath: string[],
): Promise<{ fileId: string; viewUrl: string; isDataUrl: boolean }> {
  const drive = getGoogleDriveClient();
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  const sharedDriveId = process.env.GOOGLE_SHARED_DRIVE_ID;

  // Attempt Google Drive upload only if we have a Shared Drive ID or explicit root folder
  if (drive && (sharedDriveId || rootFolderId)) {
    try {
      let targetFolderId = rootFolderId || sharedDriveId!;

      // Traverse/create folder hierarchy
      if (targetFolderId) {
        for (const folderName of folderPath) {
          targetFolderId = await getOrCreateFolder(drive, folderName, targetFolderId, sharedDriveId);
        }
      }

      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);

      const response = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: targetFolderId ? [targetFolderId] : undefined,
          driveId: sharedDriveId,
        },
        media: {
          mimeType,
          body: stream,
        },
        fields: "id, name, webViewLink",
        supportsAllDrives: true,
      });

      const fileId = response.data.id;
      if (fileId) {
        // Make publicly readable
        try {
          await drive.permissions.create({
            fileId,
            requestBody: { role: "reader", type: "anyone" },
            supportsAllDrives: true,
          });
        } catch {
          // Permission setting can fail silently
        }

        return {
          fileId,
          viewUrl: `/api/drive/asset/${fileId}`,
          isDataUrl: false,
        };
      }
    } catch (driveErr: any) {
      const msg = driveErr?.message || String(driveErr);
      console.warn(`Google Drive upload failed (${msg}). Using inline data-URL fallback.`);
    }
  }

  // ─── Reliable Fallback: Base64 Data-URL stored in Supabase ───────────────
  // This approach stores the image as a data-URL directly in the image_url column.
  // It works 100% regardless of Drive quota, service account permissions, or network.
  // Images render in <img src="data:..." /> the same as any URL.
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  // Also cache in memory for streaming fallback
  const fallbackId = `storage_${Date.now()}_${Math.random().toString(36).slice(-6)}`;
  localScreenshotCache.set(fallbackId, { buffer, mimeType });

  return {
    fileId: fallbackId,
    viewUrl: dataUrl,   // Return actual data-URL — stored directly in DB image_url column
    isDataUrl: true,
  };
}

/**
 * Uploads a payment screenshot to Google Drive with automatic resilient storage fallback.
 */
export async function uploadPaymentScreenshotToDrive(params: {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  eventTitle: string;
  year?: string;
}): Promise<{
  fileId: string;
  fileName: string;
  mimeType: string;
  folderId: string;
  viewUrl: string;
}> {
  const { fileBuffer, fileName, mimeType, eventTitle, year = new Date().getFullYear().toString() } = params;
  const rootParentId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

  const result = await uploadBufferToDrive(
    fileBuffer,
    fileName,
    mimeType,
    ["GenAI Community Events", eventTitle, "Payment Screenshots", year],
  );

  return {
    fileId: result.fileId,
    fileName,
    mimeType,
    folderId: rootParentId || "secure-storage",
    viewUrl: result.isDataUrl ? `/api/admin/drive/preview/${result.fileId}` : result.viewUrl,
  };
}

/**
 * Retrieves a file stream for a given Google Drive or Fallback file ID.
 */
export async function getDriveFileStream(
  fileId: string,
): Promise<{ stream: Readable; mimeType: string } | null> {
  // Check local/memory cache
  if (localScreenshotCache.has(fileId)) {
    const item = localScreenshotCache.get(fileId)!;
    const stream = new Readable();
    stream.push(item.buffer);
    stream.push(null);
    return { stream, mimeType: item.mimeType };
  }

  // Check Supabase fallback storage
  if (fileId.startsWith("storage_")) {
    try {
      const supabase = createAdminSupabase();
      const { data } = await supabase
        .from("sync_failures")
        .select("payload")
        .eq("operation", "screenshot_payload")
        .contains("payload", { fileId })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.payload?.base64) {
        const buffer = Buffer.from(data.payload.base64, "base64");
        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);
        return { stream, mimeType: data.payload.mimeType || "image/png" };
      }
    } catch (err) {
      console.error("Error retrieving fallback screenshot from database:", err);
    }
  }

  // Attempt Google Drive stream
  const drive = getGoogleDriveClient();
  if (!drive) return null;

  try {
    const meta = await drive.files.get({
      fileId,
      fields: "id, name, mimeType",
      supportsAllDrives: true,
    });

    const res = await drive.files.get(
      {
        fileId,
        alt: "media",
        supportsAllDrives: true,
      },
      { responseType: "stream" },
    );

    return {
      stream: res.data as Readable,
      mimeType: meta.data.mimeType || "image/png",
    };
  } catch (error) {
    console.error("Error retrieving file stream from Google Drive:", error);
    return null;
  }
}

/**
 * Uploads a club asset image (avatar, event banner, team banner, project cover).
 * Returns a viewUrl that is either:
 *   - A real Google Drive streaming URL (/api/drive/asset/<fileId>) if Drive upload succeeded
 *   - A base64 data-URL stored directly in the DB (data:image/...) as reliable fallback
 */
export async function uploadMemberAvatarToDrive({
  buffer,
  fileName,
  mimeType,
  memberName,
}: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  memberName: string;
}): Promise<{
  fileId: string;
  viewUrl: string;
}> {
  const safeName = memberName.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const cleanFileName = `asset_${safeName}_${Date.now()}.${fileName.split(".").pop() || "png"}`;

  const result = await uploadBufferToDrive(buffer, cleanFileName, mimeType, [
    "Club Assets",
    "Avatars & Media",
  ]);

  return {
    fileId: result.fileId,
    viewUrl: result.viewUrl,  // Could be data-URL or /api/drive/asset/<id>
  };
}
