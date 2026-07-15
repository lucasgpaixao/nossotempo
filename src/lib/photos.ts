import sharp from "sharp";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const MAX_PHOTOS = 6;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Retorna a mensagem de erro se o arquivo não passar na validação, senão null. */
export function validatePhotoFile(file: File): string | null {
  if (!ALLOWED_PHOTO_TYPES.has(file.type)) return "Use JPG, PNG ou WebP.";
  if (file.size > MAX_PHOTO_BYTES) return "Arquivo maior que 5 MB.";
  return null;
}

/**
 * Redimensiona (máx. 1600px, mantendo proporção), converte pra WebP e sobe
 * pro bucket `couple-photos`, gravando a linha em `order_photos`.
 */
export async function processAndUploadPhoto(
  orderId: string,
  file: File,
  sortOrder: number,
) {
  const input = Buffer.from(await file.arrayBuffer());
  const resized = await sharp(input)
    .rotate()
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer();

  const storagePath = `${orderId}/${crypto.randomUUID()}.webp`;

  const { error: upErr } = await supabaseAdmin()
    .storage.from("couple-photos")
    .upload(storagePath, new Uint8Array(resized), {
      contentType: "image/webp",
      upsert: false,
    });
  if (upErr) throw upErr;

  const { data: photo, error: dbErr } = await supabaseAdmin()
    .from("order_photos")
    .insert({
      order_id: orderId,
      storage_path: storagePath,
      sort_order: sortOrder,
    })
    .select("id, storage_path, sort_order")
    .single();

  if (dbErr) {
    await supabaseAdmin().storage.from("couple-photos").remove([storagePath]);
    throw dbErr;
  }

  return photo;
}
