import { NextResponse } from "next/server";
import { buildCheckoutUrl } from "@/lib/cakto";
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

/** POST /api/checkout/core — monta URL de checkout Cakto e redireciona. */
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

    const body = await req.json();
    const parsed = checkoutCoreSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { draftId, buyerEmail, termsAccepted } = parsed.data;

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

    const checkoutUrl = buildCheckoutUrl({ orderId: ready.id, buyerEmail });

    await supabaseAdmin()
      .from("orders")
      .update({
        status: "pending_payment",
        updated_at: new Date().toISOString(),
      })
      .eq("id", ready.id);

    return NextResponse.json({ checkoutUrl });
  } catch (e) {
    console.error("checkout/core", e);
    return NextResponse.json(
      { error: "Falha ao criar checkout. Tente de novo." },
      { status: 500 },
    );
  }
}
