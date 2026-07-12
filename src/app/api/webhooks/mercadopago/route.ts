import { NextResponse } from "next/server";
import {
  InvalidWebhookSignatureError,
  fetchMpPayment,
  verifyMpWebhook,
} from "@/lib/mercadopago";
import {
  fulfillCore,
  markDownsellPaid,
  markUpsellPaid,
} from "@/lib/fulfillment";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Order } from "@/lib/types";

export const runtime = "nodejs";

type MpBody = {
  type?: string;
  action?: string;
  data?: { id?: string | number };
};

async function processPayment(paymentId: string) {
  const payment = await fetchMpPayment(paymentId);
  if (!payment || payment.status !== "approved") {
    return { ok: true, skipped: true as const };
  }

  const orderId =
    (payment.metadata as { order_id?: string } | undefined)?.order_id ??
    payment.external_reference;

  if (!orderId) {
    console.warn("MP payment sem order ref", paymentId);
    return { ok: true, skipped: true as const };
  }

  const metadata = payment.metadata as
    | { kinds?: string; kind?: string }
    | undefined;
  // "kinds" (plural, carrinho com múltiplos itens numa preference só) tem
  // prioridade; "kind" (singular) é o formato legado de preferences antigas.
  const kinds = (metadata?.kinds ?? metadata?.kind ?? "core")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const { data: order, error } = await supabaseAdmin()
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) {
    console.error("Pedido não encontrado para payment", paymentId, orderId);
    return { ok: false, status: 404 };
  }

  let o = order as Order;

  if (kinds.includes("core")) {
    o = await fulfillCore(o, paymentId);
  }
  if (kinds.includes("upsell")) {
    o = await markUpsellPaid(o, paymentId);
  }
  if (kinds.includes("downsell")) {
    o = await markDownsellPaid(o, paymentId);
  }

  // Carrinho de item único: pagamento resolve o pedido de uma vez, sem
  // etapa de oferta pós-compra — status final é sempre "completed".
  if (kinds.includes("core") && o.status !== "completed") {
    await supabaseAdmin()
      .from("orders")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", o.id);
  }

  return { ok: true };
}

/** POST /api/webhooks/mercadopago */
export async function POST(req: Request) {
  const url = new URL(req.url);

  try {
    verifyMpWebhook(req, url);
  } catch (e) {
    if (e instanceof InvalidWebhookSignatureError) {
      console.warn("MP webhook signature invalid", e.reason);
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Config" }, { status: 500 });
  }

  let body: MpBody = {};
  try {
    body = (await req.json()) as MpBody;
  } catch {
    body = {};
  }

  const paymentId =
    body.data?.id?.toString() ??
    url.searchParams.get("data.id") ??
    url.searchParams.get("id");

  const topic =
    body.type ??
    body.action ??
    url.searchParams.get("type") ??
    url.searchParams.get("topic");

  // Responde rápido; processa se for payment
  if (
    paymentId &&
    (topic?.includes("payment") || body.type === "payment" || !topic)
  ) {
    try {
      const result = await processPayment(paymentId);
      if (!result.ok) {
        return NextResponse.json({ error: "Pedido" }, { status: result.status });
      }
    } catch (e) {
      console.error("processPayment", e);
      return NextResponse.json({ error: "Falha" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}

/** GET — alguns IPNs usam query */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const paymentId =
    url.searchParams.get("data.id") ??
    url.searchParams.get("id") ??
    url.searchParams.get("data_id");

  if (paymentId && url.searchParams.get("topic") === "payment") {
    try {
      await processPayment(paymentId);
    } catch (e) {
      console.error("IPN GET", e);
    }
  }

  return NextResponse.json({ received: true });
}
