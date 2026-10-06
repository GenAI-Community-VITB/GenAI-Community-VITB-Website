const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function isSafeImageType(type: string): boolean {
  return IMAGE_TYPES.has(type.toLowerCase().split(";")[0].trim());
}

/** Check bytes as well as the client-supplied MIME type before any storage write. */
export function validateImageUpload(buffer: Buffer, mimeType: string, maxBytes = 10 * 1024 * 1024): void {
  if (!buffer.length || buffer.length > maxBytes) throw new Error("Image must be between 1 byte and 10 MB.");
  const type = mimeType.toLowerCase();
  const matches = type === "image/png" ? buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    : type === "image/jpeg" ? buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
    : type === "image/webp" ? buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP"
    : false;
  if (!matches) throw new Error("Upload a valid JPG, PNG, or WEBP image. SVG and HTML files are not accepted.");
}
