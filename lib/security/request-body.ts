export async function limitedFormData(request: Request, maxBytes = 12 * 1024 * 1024): Promise<FormData> {
  const declared = Number(request.headers.get("content-length"));
  if (declared > maxBytes) throw new Error("REQUEST_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("EMPTY_BODY");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const {done,value} = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) { await reader.cancel(); throw new Error("REQUEST_TOO_LARGE"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = Buffer.concat(chunks);
  return new Response(bytes, { headers: { "Content-Type": request.headers.get("content-type") || "" } }).formData();
}
