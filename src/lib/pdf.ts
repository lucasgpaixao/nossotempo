import { renderToBuffer } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { createElement } from "react";
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

  for (const p of list.slice(0, 3)) {
    const { data, error } = await supabaseAdmin()
      .storage.from("couple-photos")
      .download(p.storage_path);
    if (error || !data) continue;
    const ab = await data.arrayBuffer();
    const mime = data.type || "image/webp";
    urls.push(await bufferToDataUrl(Buffer.from(ab), mime));
  }

  return urls;
}

async function uploadAsset(path: string, body: Buffer, contentType: string) {
  const { error } = await supabaseAdmin()
    .storage.from("order-assets")
    .upload(path, body, { contentType, upsert: true });
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

  const needsPolaroid =
    Boolean(o.polaroid_pdf_path) ||
    o.status === "upsell_paid" ||
    Boolean(o.mp_payment_upsell_id);

  const needsLetter =
    Boolean(o.letter_pdf_path) ||
    o.status === "downsell_paid" ||
    Boolean(o.mp_payment_downsell_id);

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

export async function generatePolaroidPdf(order: Order): Promise<Order> {
  const { data, error } = await supabaseAdmin()
    .from("orders")
    .update({
      polaroid_pdf_path: `${order.id}/polaroids.pdf`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id)
    .select("*")
    .single();
  if (error || !data) throw new Error("Falha ao marcar polaroid");
  return regenerateAssets(order.id);
}

export async function generateLetterPdf(order: Order): Promise<Order> {
  const { data, error } = await supabaseAdmin()
    .from("orders")
    .update({
      letter_pdf_path: `${order.id}/carta.pdf`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id)
    .select("*")
    .single();
  if (error || !data) throw new Error("Falha ao marcar carta");
  return regenerateAssets(order.id);
}

export async function signedAssetUrl(path: string, expiresSec = 3600) {
  const { data, error } = await supabaseAdmin()
    .storage.from("order-assets")
    .createSignedUrl(path, expiresSec);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
