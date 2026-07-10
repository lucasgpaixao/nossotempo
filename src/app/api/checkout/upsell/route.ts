import { NextResponse } from "next/server";
import { createCheckoutPreference } from "@/lib/mercadopago";
import { getPricing } from "@/lib/pricing";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isPubliclyVisible, type Order } from "@/lib/types";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({ orderId: z.string().uuid() });

/** POST /api/checkout/upsell */
export async function POST(req: Request) {
  try {
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: "Mercado Pago não configurado." },
        { status: 503 },
      );
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    const { data: order } = await supabaseAdmin()
      .from("orders")
      .select("*")
      .eq("id", parsed.data.orderId)
      .maybeSingle();

    if (!order) {
      return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
    }

    const o = order as Order;
    if (!isPubliclyVisible(o.status) || !o.buyer_email) {
      return NextResponse.json({ error: "Pedido ainda não pago." }, { status: 409 });
    }
    if (o.mp_payment_upsell_id || o.mp_payment_downsell_id) {
      return NextResponse.json({ error: "Extra já adquirido." }, { status: 409 });
    }

    const pricing = await getPricing();
    const { preferenceId, initPoint } = await createCheckoutPreference({
      orderId: o.id,
      publicId: o.public_id,
      kind: "upsell",
      title: `Nosso Tempo — Polaroids PDF (${o.name1} & ${o.name2})`,
      unitPrice: pricing.priceUpsellCents / 100,
      buyerEmail: o.buyer_email,
    });

    await supabaseAdmin()
      .from("orders")
      .update({
        status: "upsell_offered",
        mp_preference_upsell_id: preferenceId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", o.id);

    return NextResponse.json({ initPoint, preferenceId });
  } catch (e) {
    console.error("checkout/upsell", e);
    return NextResponse.json({ error: "Falha no checkout." }, { status: 500 });
  }
}
