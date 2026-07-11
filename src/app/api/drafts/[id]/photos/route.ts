import { NextResponse } from "next/server";
import sharp from "sharp";
import { canMutateDraft, isPubliclyVisible, type Order } from "@/lib/types";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PHOTOS = 3;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

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

function canUploadPhotos(order: Order, editToken: string | null) {
  if (canMutateDraft(order.status)) return true;
  if (
    editToken &&
    order.edit_token === editToken &&
    order.edit_expires_at &&
    new Date(order.edit_expires_at).getTime() > Date.now() &&
    isPubliclyVisible(order.status)
  ) {
    return true;
  }
  return false;
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

    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: "Use JPG, PNG ou WebP." },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Arquivo maior que 5 MB." },
        { status: 400 },
      );
    }

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

    const sortOrder = count ?? 0;
    const storagePath = `${id}/${crypto.randomUUID()}.webp`;

    const { error: upErr } = await supabaseAdmin()
      .storage.from("couple-photos")
      .upload(storagePath, new Uint8Array(resized), {
        contentType: "image/webp",
        upsert: false,
      });

    if (upErr) {
      console.error("photo upload", upErr);
      return NextResponse.json(
        { error: "Falha no upload." },
        { status: 500 },
      );
    }

    const { data: photo, error: dbErr } = await supabaseAdmin()
      .from("order_photos")
      .insert({
        order_id: id,
        storage_path: storagePath,
        sort_order: sortOrder,
      })
      .select("id, storage_path, sort_order")
      .single();

    if (dbErr) {
      console.error("photo row", dbErr);
      await supabaseAdmin().storage.from("couple-photos").remove([storagePath]);
      return NextResponse.json({ error: "Falha ao gravar foto." }, { status: 500 });
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
