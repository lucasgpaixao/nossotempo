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

  const kind =
    ((payment.metadata as { kind?: string } | undefined)?.kind as
      | "core"
      | "upsell"
      | "downsell"
      | undefined) ?? "core";

  const { data: order, error } = await supabaseAdmin()
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) {
    console.error("Pedido não encontrado para payment", paymentId, orderId);
    return { ok: false, status: 404 };
  }

  const o = order as Order;

  if (kind === "upsell") {
    await markUpsellPaid(o, paymentId);
  } else if (kind === "downsell") {
    await markDownsellPaid(o, paymentId);
  } else {
    await fulfillCore(o, paymentId);
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
