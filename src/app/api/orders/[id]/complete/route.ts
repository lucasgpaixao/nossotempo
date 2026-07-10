import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isPubliclyVisible, type Order } from "@/lib/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/orders/[id]/complete — marca funil como completed (recusou extras). */
export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const { data: order } = await supabaseAdmin()
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  }

  const o = order as Order;
  if (!isPubliclyVisible(o.status)) {
    return NextResponse.json({ error: "Pedido ainda não pago." }, { status: 409 });
  }

  if (
    o.status === "completed" ||
    o.status === "upsell_paid" ||
    o.status === "downsell_paid"
  ) {
    return NextResponse.json({ ok: true, status: o.status });
  }

  const { data, error } = await supabaseAdmin()
    .from("orders")
    .update({
      status: "completed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("status")
    .single();

  if (error) {
    return NextResponse.json({ error: "Falha." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: data.status });
}
