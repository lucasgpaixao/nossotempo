import { NextResponse } from "next/server";
import {
  createCheckoutPreference,
  type CheckoutItem,
} from "@/lib/mercadopago";
import { getPricing } from "@/lib/pricing";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { canMutateDraft, type Order } from "@/lib/types";
import { checkoutCoreSchema } from "@/lib/validations";

export const runtime = "nodejs";

function isDraftComplete(order: Order, photoCount: number) {
  return Boolean(
    order.name1 &&
      order.name2 &&
      order.started_at &&
      order.message &&
      photoCount >= 1 &&
      order.buyer_email &&
      order.terms_accepted_at,
  );
}

/** POST /api/checkout/core — cria Preference Checkout Pro e redireciona. */
export async function POST(req: Request) {
  try {
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      return NextResponse.json(
        {
          error:
            "Mercado Pago não configurado. Defina MERCADOPAGO_ACCESS_TOKEN no .env.local.",
        },
        { status: 503 },
      );
    }

    const body = await req.json();
    const parsed = checkoutCoreSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { draftId, buyerEmail, termsAccepted, wantsUpsell, wantsDownsell } =
      parsed.data;

    const { data: order, error } = await supabaseAdmin()
      .from("orders")
      .select("*")
      .eq("id", draftId)
      .maybeSingle();

    if (error || !order) {
      return NextResponse.json({ error: "Rascunho não encontrado." }, { status: 404 });
    }

    const o = order as Order;
    if (!canMutateDraft(o.status)) {
      return NextResponse.json(
        { error: "Este pedido já foi pago ou não pode mais ser cobrado." },
        { status: 409 },
      );
    }

    const { count } = await supabaseAdmin()
      .from("order_photos")
      .select("id", { count: "exact", head: true })
      .eq("order_id", draftId);

    // Persiste e-mail + termos antes de cobrar
    const { data: updated, error: updErr } = await supabaseAdmin()
      .from("orders")
      .update({
        buyer_email: buyerEmail,
        terms_accepted_at: termsAccepted
          ? new Date().toISOString()
          : o.terms_accepted_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", draftId)
      .select("*")
      .single();

    if (updErr || !updated) {
      return NextResponse.json({ error: "Falha ao salvar e-mail." }, { status: 500 });
    }

    const ready = updated as Order;
    if (!isDraftComplete(ready, count ?? 0)) {
      return NextResponse.json(
        {
          error:
            "Complete nomes, data, pelo menos 1 foto, mensagem, e-mail e termos antes de pagar.",
        },
        { status: 400 },
      );
    }

    const pricing = await getPricing();
    const items: CheckoutItem[] = [
      {
        kind: "core",
        title: `Nosso Tempo — página de ${ready.name1} & ${ready.name2}`,
        unitPrice: pricing.priceCoreCents / 100,
      },
    ];
    if (wantsUpsell) {
      items.push({
        kind: "upsell",
        title: `Nosso Tempo — Polaroids PDF (${ready.name1} & ${ready.name2})`,
        unitPrice: pricing.priceUpsellCents / 100,
      });
    }
    if (wantsDownsell) {
      items.push({
        kind: "downsell",
        title: `Nosso Tempo — Carta PDF (${ready.name1} & ${ready.name2})`,
        unitPrice: pricing.priceDownsellCents / 100,
      });
    }

    const { preferenceId, initPoint } = await createCheckoutPreference({
      orderId: ready.id,
      publicId: ready.public_id,
      items,
      buyerEmail,
    });

    const preferenceUpdate: Record<string, unknown> = {
      status: "pending_payment",
      mp_preference_core_id: preferenceId,
      updated_at: new Date().toISOString(),
    };
    if (wantsUpsell) preferenceUpdate.mp_preference_upsell_id = preferenceId;
    if (wantsDownsell) preferenceUpdate.mp_preference_downsell_id = preferenceId;

    await supabaseAdmin().from("orders").update(preferenceUpdate).eq("id", ready.id);

    return NextResponse.json({ initPoint, preferenceId });
  } catch (e) {
    console.error("checkout/core", e);
    return NextResponse.json(
      { error: "Falha ao criar checkout. Tente de novo." },
      { status: 500 },
    );
  }
}
