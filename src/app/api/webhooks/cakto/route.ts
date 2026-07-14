import { NextResponse } from "next/server";
import { InvalidCaktoWebhookError, verifyCaktoWebhookSecret } from "@/lib/cakto";
import {
  fulfillCore,
  markDownsellPaid,
  markUpsellPaid,
} from "@/lib/fulfillment";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Order } from "@/lib/types";

export const runtime = "nodejs";

type CaktoOffer = { id?: string; name?: string; price?: number };

type CaktoBody = {
  secret?: string;
  event?: string;
  data?: {
    id?: string;
    refId?: string;
    parent_order?: string;
    status?: string;
    offer?: CaktoOffer;
    offer_type?: string;
    customer?: { email?: string };
    // Campo(s) de tracking customizado — nome exato ainda não confirmado
    // contra um payload real da Cakto. Ver checklist enviada ao usuário.
    sck?: string;
    trackingParams?: { sck?: string };
    checkoutUrl?: string;
  };
};

function extractOrderId(body: CaktoBody): string | null {
  const d = body.data;
  if (!d) return null;

  const candidates = [d.sck, d.trackingParams?.sck];

  if (d.checkoutUrl) {
    try {
      const sck = new URL(d.checkoutUrl).searchParams.get("sck");
      if (sck) candidates.push(sck);
    } catch {
      // ignore URL inválida
    }
  }

  return candidates.find((c) => Boolean(c)) ?? null;
}

function resolveKind(d: NonNullable<CaktoBody["data"]>): "core" | "upsell" | "downsell" | null {
  if (d.offer_type === "main") return "core";

  const offerId = d.offer?.id;
  if (offerId && offerId === process.env.CAKTO_UPSELL_OFFER_ID) return "upsell";
  if (offerId && offerId === process.env.CAKTO_DOWNSELL_OFFER_ID) return "downsell";

  // Sem offer_type reconhecido nem match de offer id configurado: assume
  // core se não houver parent_order (é a compra principal), senão desconhecido.
  if (!d.parent_order) return "core";
  return null;
}

/** POST /api/webhooks/cakto */
export async function POST(req: Request) {
  let body: CaktoBody = {};
  try {
    body = (await req.json()) as CaktoBody;
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  try {
    verifyCaktoWebhookSecret(body);
  } catch (e) {
    if (e instanceof InvalidCaktoWebhookError) {
      console.warn("Cakto webhook secret inválido");
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Config" }, { status: 500 });
  }

  const d = body.data;
  if (!d || body.event !== "purchase_approved" || d.status !== "paid") {
    return NextResponse.json({ received: true, skipped: true });
  }

  const orderId = extractOrderId(body);
  if (!orderId) {
    console.warn("Cakto webhook sem order_id (sck) — payload completo:", JSON.stringify(body));
    return NextResponse.json({ received: true, skipped: true });
  }

  const kind = resolveKind(d);
  if (!kind) {
    console.warn(
      "Cakto webhook com offer não reconhecida — payload completo:",
      JSON.stringify(body),
    );
    return NextResponse.json({ received: true, skipped: true });
  }

  const { data: order, error } = await supabaseAdmin()
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) {
    console.error("Pedido não encontrado para webhook Cakto", d.id, orderId);
    return NextResponse.json({ error: "Pedido" }, { status: 404 });
  }

  const paymentId = String(d.id ?? d.refId ?? `cakto-${Date.now()}`);
  let o = order as Order;

  try {
    if (kind === "core") {
      o = await fulfillCore(o, paymentId);
    } else if (kind === "upsell") {
      o = await markUpsellPaid(o, paymentId);
    } else if (kind === "downsell") {
      o = await markDownsellPaid(o, paymentId);
    }

    // Cakto entrega core + order bumps como webhooks separados (diferente do
    // MP, que mandava tudo numa Preference/webhook só). Força "completed"
    // sempre que o core já foi pago, não importa a ordem de chegada dos
    // eventos — evita regressão pra "upsell_paid"/"downsell_paid" se o
    // webhook do bump chegar depois do core.
    if (o.mp_payment_core_id && o.status !== "completed") {
      await supabaseAdmin()
        .from("orders")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", o.id);
    }
  } catch (e) {
    console.error("Cakto fulfillment falhou", kind, orderId, e);
    return NextResponse.json({ error: "Falha" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
