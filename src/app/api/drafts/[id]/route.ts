import { NextResponse } from "next/server";
import { draftPatchToRow } from "@/lib/drafts";
import { canMutateDraft, type Order } from "@/lib/types";
import { draftUpdateSchema } from "@/lib/validations";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

/** GET /api/drafts/[id] */
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const order = await getOrder(id);
    if (!order) {
      return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    }

    const { data: photos } = await supabaseAdmin()
      .from("order_photos")
      .select("id, storage_path, sort_order")
      .eq("order_id", id)
      .order("sort_order", { ascending: true });

    return NextResponse.json({ draft: order, photos: photos ?? [] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Serviço indisponível." }, { status: 503 });
  }
}

/** PATCH /api/drafts/[id] */
export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const order = await getOrder(id);
    if (!order) {
      return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    }
    if (!canMutateDraft(order.status)) {
      return NextResponse.json(
        { error: "Este rascunho não pode mais ser editado por aqui." },
        { status: 409 },
      );
    }

    const body = await req.json();
    const parsed = draftUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const row = draftPatchToRow(parsed.data);
    const { data, error } = await supabaseAdmin()
      .from("orders")
      .update(row)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("draft patch error", error);
      return NextResponse.json({ error: "Falha ao salvar." }, { status: 500 });
    }

    return NextResponse.json({ draft: data });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Serviço indisponível." }, { status: 503 });
  }
}
