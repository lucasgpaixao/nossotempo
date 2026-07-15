import { NextResponse } from "next/server";
import { isPubliclyVisible, type Order } from "@/lib/types";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { MAX_PHOTOS, processAndUploadPhoto, validatePhotoFile } from "@/lib/photos";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

async function getOrder(id: string): Promise<Order | null> {
  const { data, error } = await supabaseAdmin()
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as Order;
}

/**
 * Só permite mutar fotos com um edit_token válido. O wizard sobe as fotos
 * de uma vez pelo /api/checkout/core; nenhum fluxo legítimo edita fotos na
 * fase draft/pending_payment — liberar isso sem token deixava qualquer um
 * que conhecesse o UUID do pedido (vaza via `sck` da Cakto) apagar/trocar
 * as fotos do casal.
 */
function canUploadPhotos(order: Order, editToken: string | null) {
  return Boolean(
    editToken &&
      order.edit_token === editToken &&
      order.edit_expires_at &&
      new Date(order.edit_expires_at).getTime() > Date.now() &&
      isPubliclyVisible(order.status),
  );
}

/** POST /api/drafts/[id]/photos — multipart upload */
export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const order = await getOrder(id);
    if (!order) {
      return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    }

    const editToken = new URL(req.url).searchParams.get("editToken");
    if (!canUploadPhotos(order, editToken)) {
      return NextResponse.json(
        { error: "Não é possível enviar fotos neste status." },
        { status: 409 },
      );
    }

    const { count } = await supabaseAdmin()
      .from("order_photos")
      .select("*", { count: "exact", head: true })
      .eq("order_id", id);

    if ((count ?? 0) >= MAX_PHOTOS) {
      return NextResponse.json(
        { error: `Máximo de ${MAX_PHOTOS} fotos.` },
        { status: 400 },
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Envie o campo file." },
        { status: 400 },
      );
    }

    const validationError = validatePhotoFile(file);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const sortOrder = count ?? 0;
    let photo;
    try {
      photo = await processAndUploadPhoto(id, file, sortOrder);
    } catch (e) {
      console.error("photo upload", e);
      return NextResponse.json({ error: "Falha no upload." }, { status: 500 });
    }

    await supabaseAdmin()
      .from("orders")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json({ photo }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Serviço indisponível." }, { status: 503 });
  }
}

/** DELETE /api/drafts/[id]/photos?photoId= */
export async function DELETE(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const photoId = url.searchParams.get("photoId");
  const editToken = url.searchParams.get("editToken");
  if (!photoId) {
    return NextResponse.json({ error: "photoId obrigatório." }, { status: 400 });
  }

  try {
    const order = await getOrder(id);
    if (!order || !canUploadPhotos(order, editToken)) {
      return NextResponse.json({ error: "Não permitido." }, { status: 409 });
    }

    const { data: photo } = await supabaseAdmin()
      .from("order_photos")
      .select("*")
      .eq("id", photoId)
      .eq("order_id", id)
      .maybeSingle();

    if (!photo) {
      return NextResponse.json({ error: "Foto não encontrada." }, { status: 404 });
    }

    await supabaseAdmin().storage.from("couple-photos").remove([photo.storage_path]);
    await supabaseAdmin().from("order_photos").delete().eq("id", photoId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Serviço indisponível." }, { status: 503 });
  }
}
