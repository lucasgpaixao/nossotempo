import { renderToBuffer } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { createElement } from "react";
import sharp from "sharp";
import { LetterPdf } from "@/components/pdf/LetterPdf";
import { PolaroidPdf } from "@/components/pdf/PolaroidPdf";
import { appUrl } from "@/lib/app-url";
import { generateQrPng } from "@/lib/qr";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Order, OrderPhoto } from "@/lib/types";

// @react-pdf tipa DocumentProps de forma estrita; cast seguro no render.
function asPdfDoc(el: ReactElement): Parameters<typeof renderToBuffer>[0] {
  return el as Parameters<typeof renderToBuffer>[0];
}

async function bufferToDataUrl(buf: Buffer, mime: string) {
  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function downloadPhotoDataUrls(orderId: string): Promise<string[]> {
  const { data: photos } = await supabaseAdmin()
    .from("order_photos")
    .select("*")
    .eq("order_id", orderId)
    .order("sort_order", { ascending: true });

  const list = (photos ?? []) as OrderPhoto[];
  const urls: string[] = [];

  for (const p of list.slice(0, 6)) {
    const { data, error } = await supabaseAdmin()
      .storage.from("couple-photos")
      .download(p.storage_path);
    if (error || !data) continue;
    const ab = await data.arrayBuffer();
    // @react-pdf/renderer só suporta PNG/JPEG; normaliza (fotos são WebP no upload).
    const png = await sharp(Buffer.from(ab)).png().toBuffer();
    urls.push(await bufferToDataUrl(png, "image/png"));
  }

  return urls;
}

async function uploadAsset(path: string, body: Buffer, contentType: string) {
  const { error } = await supabaseAdmin()
    .storage.from("order-assets")
    .upload(path, new Uint8Array(body), { contentType, upsert: true });
  if (error) {
    console.error("uploadAsset", path, error);
    throw new Error(`Falha ao salvar ${path}`);
  }
  return path;
}

/** Gera/atualiza QR PNG e, se aplicável, PDFs de polaroid e carta. */
export async function regenerateAssets(orderId: string): Promise<Order> {
  const { data: order, error } = await supabaseAdmin()
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) throw new Error("Pedido não encontrado");
  const o = order as Order;
  if (!o.name1 || !o.name2) throw new Error("Pedido incompleto");

  const pageUrl = `${appUrl()}/p/${o.public_id}`;
  const qrBuffer = await generateQrPng(pageUrl);
  const qrPath = await uploadAsset(
    `${o.id}/qr.png`,
    qrBuffer,
    "image/png",
  );
  const qrDataUrl = await bufferToDataUrl(qrBuffer, "image/png");

  const patch: Record<string, unknown> = {
    qr_storage_path: qrPath,
    updated_at: new Date().toISOString(),
  };

  // Upsell (físico) e downsell (digital) são cada um um pacote único com
  // polaroids + carta juntos — qualquer um dos dois exige gerar os dois PDFs;
  // a diferença entre eles é só a entrega (admin imprime vs. link de download).
  const boughtExtra =
    Boolean(o.mp_payment_upsell_id) || Boolean(o.mp_payment_downsell_id);

  const needsPolaroid =
    Boolean(o.polaroid_pdf_path) ||
    o.status === "upsell_paid" ||
    o.status === "downsell_paid" ||
    boughtExtra;

  const needsLetter =
    Boolean(o.letter_pdf_path) ||
    o.status === "upsell_paid" ||
    o.status === "downsell_paid" ||
    boughtExtra;

  if (needsPolaroid) {
    const photos = await downloadPhotoDataUrls(o.id);
    if (photos.length === 0) throw new Error("Sem fotos para polaroid");
    const pdf = await renderToBuffer(
      asPdfDoc(
        createElement(PolaroidPdf, {
          name1: o.name1,
          name2: o.name2,
          photoDataUrls: photos,
          qrDataUrl,
          pageUrl,
        }),
      ),
    );
    patch.polaroid_pdf_path = await uploadAsset(
      `${o.id}/polaroids.pdf`,
      Buffer.from(pdf),
      "application/pdf",
    );
  }

  if (needsLetter && o.message) {
    const pdf = await renderToBuffer(
      asPdfDoc(
        createElement(LetterPdf, {
          name1: o.name1,
          name2: o.name2,
          message: o.message,
          qrDataUrl,
          pageUrl,
        }),
      ),
    );
    patch.letter_pdf_path = await uploadAsset(
      `${o.id}/carta.pdf`,
      Buffer.from(pdf),
      "application/pdf",
    );
  }

  const { data: updated, error: updErr } = await supabaseAdmin()
    .from("orders")
    .update(patch)
    .eq("id", o.id)
    .select("*")
    .single();

  if (updErr || !updated) throw new Error("Falha ao atualizar assets");
  return updated as Order;
}

export async function signedAssetUrl(path: string, expiresSec = 3600) {
  const { data, error } = await supabaseAdmin()
    .storage.from("order-assets")
    .createSignedUrl(path, expiresSec);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
