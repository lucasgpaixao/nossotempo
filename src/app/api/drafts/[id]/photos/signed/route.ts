import { NextResponse } from "next/server";
import { canMutateDraft, isPubliclyVisible, type Order } from "@/lib/types";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/drafts/[id]/photos/signed?path=
 * Retorna URL assinada curta para preview no wizard (só draft/pending).
 */
export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const path = new URL(req.url).searchParams.get("path");
  if (!path || !path.startsWith(`${id}/`)) {
    return NextResponse.json({ error: "path inválido." }, { status: 400 });
  }

  try {
    const { data: order } = await supabaseAdmin()
      .from("orders")
      .select("status")
      .eq("id", id)
      .maybeSingle();

    if (!order) {
      return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    }

    const status = (order as Pick<Order, "status">).status;
    if (!canMutateDraft(status) && !isPubliclyVisible(status)) {
      return NextResponse.json({ error: "Não permitido." }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin()
      .storage.from("couple-photos")
      .createSignedUrl(path, 60 * 30);

    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: "Falha ao assinar." }, { status: 500 });
    }

    return NextResponse.redirect(data.signedUrl);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Serviço indisponível." }, { status: 503 });
  }
}
