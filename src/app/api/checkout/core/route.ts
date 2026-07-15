import { NextResponse } from "next/server";
import { buildCheckoutUrl } from "@/lib/cakto";
import { startedAtFromParts } from "@/lib/drafts";
import { createPublicId } from "@/lib/ids";
import { MAX_PHOTOS, processAndUploadPhoto, validatePhotoFile } from "@/lib/photos";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { checkoutSubmitSchema } from "@/lib/validations";

export const runtime = "nodejs";

function formValue(form: FormData, key: string): string | undefined {
  const v = form.get(key);
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

/**
 * POST /api/checkout/core — cria o pedido (nunca em status "draft", direto
 * em "pending_payment"), sobe as fotos e monta a URL de checkout Cakto.
 * Único ponto de contato do wizard com o backend: até aqui, tudo vive só
 * no estado do navegador.
 */
export async function POST(req: Request) {
  try {
    if (!process.env.CAKTO_CHECKOUT_URL) {
      return NextResponse.json(
        {
          error:
            "Cakto não configurada. Defina CAKTO_CHECKOUT_URL no .env.local.",
        },
        { status: 503 },
      );
    }

    const form = await req.formData();

    const fields = {
      name1: formValue(form, "name1"),
      name2: formValue(form, "name2"),
      startedDate: formValue(form, "startedDate"),
      startedTime: formValue(form, "startedTime"),
      message: formValue(form, "message"),
      youtubeVideoId: formValue(form, "youtubeVideoId"),
      youtubeTitle: formValue(form, "youtubeTitle"),
      youtubeThumbnail: formValue(form, "youtubeThumbnail"),
      buyerEmail: formValue(form, "buyerEmail"),
      termsAccepted: formValue(form, "termsAccepted") === "true",
    };

    const parsed = checkoutSubmitSchema.safeParse(fields);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Complete todas as etapas antes de pagar.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const photoFiles = form.getAll("photos").filter((f): f is File => f instanceof File);
    if (photoFiles.length < 1) {
      return NextResponse.json({ error: "Envie pelo menos 1 foto." }, { status: 400 });
    }
    if (photoFiles.length > MAX_PHOTOS) {
      return NextResponse.json(
        { error: `Máximo de ${MAX_PHOTOS} fotos.` },
        { status: 400 },
      );
    }
    for (const file of photoFiles) {
      const err = validatePhotoFile(file);
      if (err) return NextResponse.json({ error: err }, { status: 400 });
    }

    const data = parsed.data;
    const startedAt = startedAtFromParts(data.startedDate, data.startedTime ?? null);
    const publicId = createPublicId();

    const { data: order, error: insertErr } = await supabaseAdmin()
      .from("orders")
      .insert({
        public_id: publicId,
        status: "pending_payment",
        name1: data.name1,
        name2: data.name2,
        message: data.message,
        started_at: startedAt,
        buyer_email: data.buyerEmail,
        terms_accepted_at: new Date().toISOString(),
        youtube_video_id: data.youtubeVideoId ?? null,
        youtube_title: data.youtubeTitle ?? null,
        youtube_thumbnail: data.youtubeThumbnail ?? null,
      })
      .select("id")
      .single();

    if (insertErr || !order) {
      console.error("checkout order create", insertErr);
      return NextResponse.json({ error: "Falha ao criar pedido." }, { status: 500 });
    }

    const orderId = order.id as string;

    try {
      for (let i = 0; i < photoFiles.length; i++) {
        await processAndUploadPhoto(orderId, photoFiles[i], i);
      }
    } catch (e) {
      console.error("checkout photo upload", e);
      const { data: photos } = await supabaseAdmin()
        .from("order_photos")
        .select("storage_path")
        .eq("order_id", orderId);
      const paths = (photos ?? []).map((p) => p.storage_path as string);
      if (paths.length) {
        await supabaseAdmin().storage.from("couple-photos").remove(paths);
      }
      await supabaseAdmin().from("orders").delete().eq("id", orderId);
      return NextResponse.json(
        { error: "Falha ao enviar as fotos. Tente de novo." },
        { status: 500 },
      );
    }

    const checkoutUrl = buildCheckoutUrl({ orderId, buyerEmail: data.buyerEmail });

    return NextResponse.json({ checkoutUrl });
  } catch (e) {
    console.error("checkout/core", e);
    return NextResponse.json(
      { error: "Falha ao criar checkout. Tente de novo." },
      { status: 500 },
    );
  }
}
