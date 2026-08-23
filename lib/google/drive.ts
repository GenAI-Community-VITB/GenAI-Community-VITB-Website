import { google, drive_v3 } from "googleapis";
import { Readable } from "stream";
import { createAdminSupabase } from "@/lib/supabase/admin";

// In-memory cache for fast local screenshot previews
const localScreenshotCache = new Map<string, { buffer: Buffer; mimeType: string }>();

/**
 * Initializes and returns the authenticated Google Drive v3 client.
 * Uses service account credentials from environment variables.
 */
export function getGoogleDriveClient(): drive_v3.Drive | null {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  let privateKey = process.env.GOOGLE_PRIVATE_KEY?.trim();

  if (!clientEmail || !privateKey) {
    return null;
  }

  // Strip surrounding quotes if accidentally present in .env
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
    privateKey = privateKey.slice(1, -1);
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
 * Supports both Shared Drives and personal shared folders.
 */
async function getOrCreateFolder(
  drive: drive_v3.Drive,
  folderName: string,
  parentFolderId?: string,
  sharedDriveId?: string,
): Promise<string> {
  try {
    let query = `mimeType='application/vnd.google-apps.folder' and name='${folderName.replace(/'/g, "\\'")}' and trashed=false`;
    if (parentFolderId && parentFolderId !== "root") {
      query += ` and '${parentFolderId}' in parents`;
    }

    const listParams: drive_v3.Params$Resource$Files$List = {
      q: query,
      fields: "files(id, name)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    };

    if (sharedDriveId) {
      listParams.driveId = sharedDriveId;
      listParams.corpora = "drive";
    }

    const res = await drive.files.list(listParams);

    if (res.data.files && res.data.files.length > 0 && res.data.files[0].id) {
      return res.data.files[0].id;
    }

    const effectiveParent = parentFolderId && parentFolderId !== "root" ? parentFolderId : undefined;

    const fileMetadata: drive_v3.Schema$File = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: effectiveParent ? [effectiveParent] : undefined,
    };

    if (sharedDriveId) {
      fileMetadata.driveId = sharedDriveId;
    }

    const folder = await drive.files.create({
      requestBody: fileMetadata,
      fields: "id",
      supportsAllDrives: true,
    });

    if (!folder.data.id) {
      return parentFolderId || "root";
    }

    return folder.data.id;
  } catch (err) {
    console.warn(`Could not get or create subfolder '${folderName}', using parent '${parentFolderId}':`, err);
    return parentFolderId || "root";
  }
}

/**
 * Core upload function — uploads buffer to Google Drive Shared Drive/Folder or
 * falls back to base64 data-URL stored in Supabase with persistent database backup.
 */
async function uploadBufferToDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  folderPath: string[],
): Promise<{ fileId: string; viewUrl: string; isDataUrl: boolean }> {
  const drive = getGoogleDriveClient();
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim();
  const sharedDriveId = process.env.GOOGLE_SHARED_DRIVE_ID?.trim();

  const relayUrl = process.env.GOOGLE_DRIVE_RELAY_URL?.trim() || process.env.GOOGLE_FORM_WEBHOOK_URL?.trim();

  // 1. Try Google Apps Script Drive Relay (Uploads directly to personal 15GB Google Drive)
  if (relayUrl) {
    try {
      const payload = {
        action: "upload",
        fileName,
        mimeType,
        base64: buffer.toString("base64"),
        folderId: rootFolderId || "",
        folderPath,
      };

      const res = await fetch(relayUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.fileId) {
          return {
            fileId: data.fileId,
            viewUrl: data.directUrl || data.viewUrl || `/api/drive/asset/${data.fileId}`,
            isDataUrl: false,
          };
        }
      }
    } catch (relayErr: any) {
      console.warn("Google Apps Script Drive Relay error:", relayErr?.message || relayErr);
    }
  }

  // 2. Attempt Google Drive direct upload via Service Account (Works with Shared Drives)
  if (drive && (rootFolderId || sharedDriveId)) {
    try {
      let targetFolderId = rootFolderId || sharedDriveId || "";

      // Traverse/create folder hierarchy if target folder is specified
      if (targetFolderId && targetFolderId !== "root" && folderPath.length > 0) {
        for (const folderName of folderPath) {
          targetFolderId = await getOrCreateFolder(drive, folderName, targetFolderId, sharedDriveId);
        }
      }

      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);

      const effectiveParents =
        targetFolderId && targetFolderId !== "root"
          ? [targetFolderId]
          : rootFolderId && rootFolderId !== "root"
            ? [rootFolderId]
            : undefined;

      const requestBody: drive_v3.Schema$File = {
        name: fileName,
        parents: effectiveParents,
      };

      if (sharedDriveId) {
        requestBody.driveId = sharedDriveId;
      }

      const response = await drive.files.create({
        requestBody,
        media: {
          mimeType,
          body: stream,
        },
        fields: "id, name, webViewLink",
        supportsAllDrives: true,
      });

      const fileId = response.data.id;
      if (fileId) {
        // Attempt to make readable
        try {
          await drive.permissions.create({
            fileId,
            requestBody: { role: "reader", type: "anyone" },
            supportsAllDrives: true,
          });
        } catch {
          // Ignore permission create failure on domain-restricted folders
        }

        return {
          fileId,
          viewUrl: `/api/drive/asset/${fileId}`,
          isDataUrl: false,
        };
      }
    } catch (driveErr: any) {
      console.warn(`Google Drive upload encountered error (${driveErr?.message || driveErr}). Persisting in fallback storage.`);
    }
  }

  // ─── Reliable Fallback: Base64 Data-URL stored in Supabase & Memory Cache ────
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const fallbackId = `storage_${Date.now()}_${Math.random().toString(36).slice(-6)}`;
  localScreenshotCache.set(fallbackId, { buffer, mimeType });

  // Also persist in database sync_failures table so images survive process restarts
  try {
    const supabase = createAdminSupabase();
    await supabase.from("sync_failures").insert({
      operation: "screenshot_payload",
      entity_id: fallbackId,
      error_message: "Google Drive offline fallback storage",
      payload: { fileId: fallbackId, base64, mimeType, fileName },
    });
  } catch {
    // Non-fatal
  }

  return {
    fileId: fallbackId,
    viewUrl: dataUrl,
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
  const rootParentId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim();

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
  // 1. Check local in-memory cache
  if (localScreenshotCache.has(fileId)) {
    const item = localScreenshotCache.get(fileId)!;
    const stream = new Readable();
    stream.push(item.buffer);
    stream.push(null);
    return { stream, mimeType: item.mimeType };
  }

  // 2. Check Supabase fallback storage
  if (fileId.startsWith("storage_")) {
    try {
      const supabase = createAdminSupabase();
      const { data } = await supabase
        .from("sync_failures")
        .select("payload")
        .eq("operation", "screenshot_payload")
        .eq("entity_id", fileId)
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

  // 3. Attempt Google Drive stream
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
    viewUrl: result.viewUrl,
  };
}
