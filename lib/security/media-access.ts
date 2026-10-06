import { createAdminSupabase } from "@/lib/supabase/admin";

export function isValidFileId(fileId: string): boolean {
  return /^[A-Za-z0-9_-]{1,200}$/.test(fileId);
}

/** Possession of a Drive ID is not authorization to read it with server credentials. */
export async function isPublicMedia(fileId: string): Promise<boolean> {
  if (!isValidFileId(fileId)) return false;
  const db = createAdminSupabase();
  const payment = await db.from("payments").select("id").eq("drive_file_id", fileId).limit(1);
  if (payment.error || payment.data?.length) return false;
  const urls = [
    `/api/drive/asset/${fileId}`,
    `https://drive.google.com/file/d/${fileId}/view`,
    `https://drive.google.com/uc?export=view&id=${fileId}`,
    `https://drive.google.com/uc?id=${fileId}`,
    `https://lh3.googleusercontent.com/d/${fileId}`,
  ];
  const queries = [
    db.from("user_profiles").select("id").eq("drive_file_id",fileId).eq("is_active",true).eq("is_voided",false).limit(1),
    db.from("user_profiles").select("id").in("avatar_url",urls).eq("is_active",true).eq("is_voided",false).limit(1),
    db.from("members").select("id").in("image_url",urls).eq("status","active").limit(1),
    ...["teams","projects","events","achievements","event_winners"].map(table => db.from(table).select("id").in("image_url",urls).limit(1)),
    db.from("events").select("id").in("upi_qr_image_url",urls).limit(1),
    db.from("blog_posts").select("id").in("image_url",urls).eq("is_published",true).limit(1),
  ];
  const results = await Promise.all(queries);
  return results.some(result => !result.error && !!result.data?.length);
}

export async function isPaymentMedia(fileId: string): Promise<boolean> {
  if (!isValidFileId(fileId)) return false;
  const {data,error} = await createAdminSupabase().from("payments").select("id").eq("drive_file_id",fileId).limit(1);
  return !error && !!data?.length;
}
