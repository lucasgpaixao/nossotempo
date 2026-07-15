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

type CaktoItem = {
  id?: string;
  refId?: string;
  status?: string;
  offer?: { id?: string; name?: string };
  offer_type?: string; // "main" | "orderbump"
  sck?: string | null;
  // Estrutura ainda não confirmada contra um payload real com endereço
  // preenchido — guardamos o que vier, bruto, pro admin ler manualmente.
  address?: unknown;
  shipping?: unknown;
};

type CaktoBody = {
  secret?: string;
  event?: string;
  // Disparo "Agrupado": um array com um item por oferta da venda
  // (core + cada order bump), todos no mesmo request.
  data?: CaktoItem[];
};

function resolveOrderId(items: CaktoItem[]): string | null {
  for (const item of items) {
    if (item.sck) return item.sck;
  }
  return null;
}

function resolveKind(item: CaktoItem): "core" | "upsell" | "downsell" | null {
  if (item.offer_type === "main") return "core";
  // Upsell/downsell nativo da Cakto (página pós-pagamento, 1 clique) já
  // vem com offer_type explícito.
  if (item.offer_type === "upsell") return "upsell";
  if (item.offer_type === "downsell") return "downsell";
  // Order bump (fallback, caso ainda exista algum configurado): identifica
  // pelo id da oferta em vez do offer_type (que vem "orderbump" genérico).
  const offerId = item.offer?.id;
  if (offerId && offerId === process.env.CAKTO_UPSELL_OFFER_ID) return "upsell";
  if (offerId && offerId === process.env.CAKTO_DOWNSELL_OFFER_ID) return "downsell";
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

  const items = (body.data ?? []).filter((i) => i.status === "paid");
  if (body.event !== "purchase_approved" || items.length === 0) {
    return NextResponse.json({ received: true, skipped: true });
  }

  const orderId = resolveOrderId(items);
  if (!orderId) {
    // Nunca logar `body` inteiro: ele carrega o campo `secret`, que é a
    // única autenticação do webhook (JSON.stringify descarta `undefined`).
    const safeBody = { ...body, secret: undefined };
    console.warn("Cakto webhook sem sck — payload completo:", JSON.stringify(safeBody));
    return NextResponse.json({ received: true, skipped: true });
  }

  const { data: order, error } = await supabaseAdmin()
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) {
    console.error("Pedido não encontrado para webhook Cakto", orderId);
    return NextResponse.json({ error: "Pedido" }, { status: 404 });
  }

  let o = order as Order;

  try {
    for (const item of items) {
      const kind = resolveKind(item);
      const paymentId = String(item.id ?? item.refId ?? `cakto-${Date.now()}`);

      if (kind === "core") {
        o = await fulfillCore(o, paymentId);
      } else if (kind === "upsell") {
        o = await markUpsellPaid(o, paymentId, item.address ?? item.shipping ?? null);
      } else if (kind === "downsell") {
        o = await markDownsellPaid(o, paymentId);
      } else {
        console.warn("Cakto webhook com offer não reconhecida — item:", JSON.stringify(item));
      }
    }

    // O upsell/downsell nativo (página pós-pagamento) pode chegar num
    // webhook SEPARADO, minutos depois do core — não dá pra confiar em "o
    // core veio nesse mesmo request" (sawCore). Em vez disso, checamos o
    // estado persistido: se o core já foi pago (agora ou antes), o status
    // final é sempre "completed", nunca regride pra upsell_paid/downsell_paid.
    if (o.mp_payment_core_id && o.status !== "completed") {
      await supabaseAdmin()
        .from("orders")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", o.id);
    }
  } catch (e) {
    console.error("Cakto fulfillment falhou", orderId, e);
    return NextResponse.json({ error: "Falha" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
