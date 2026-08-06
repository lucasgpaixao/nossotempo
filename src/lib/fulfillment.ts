import { track } from "@vercel/analytics/server";
import { createEditToken } from "@/lib/ids";
import { appUrl } from "@/lib/app-url";
import { regenerateAssets } from "@/lib/pdf";
import {
  notifyAdminPhysicalOrder,
  sendAddonEmail,
  sendDeliveryEmail,
  sendPhysicalOrderEmail,
} from "@/lib/resend";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Order } from "@/lib/types";

/**
 * Libera o core após pagamento aprovado:
 * status, QR no Storage, edit_token 7d, e-mail.
 */
export async function fulfillCore(
  order: Order,
  paymentId: string,
): Promise<Order> {
  if (order.mp_payment_core_id === String(paymentId)) {
    return order;
  }

  if (
    order.status !== "draft" &&
    order.status !== "pending_payment" &&
    order.mp_payment_core_id
  ) {
    return order;
  }

  const editToken = order.edit_token ?? createEditToken();
  const editExpires = new Date();
  editExpires.setDate(editExpires.getDate() + 7);

  const { data, error } = await supabaseAdmin()
    .from("orders")
    .update({
      status: "core_paid",
      edit_token: editToken,
      edit_expires_at: editExpires.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id)
    .select("*")
    .single();

  if (error || !data) {
    console.error("fulfillCore update failed", error);
    throw new Error("Falha ao liberar pedido");
  }

  let fulfilled = data as Order;

  // PDFs/QR primeiro; `mp_payment_core_id` (a chave de idempotência checada
  // no topo desta função) só é gravado DEPOIS que os assets existem. Se
  // regenerateAssets falhar, a exceção sobe, o webhook responde erro e a
  // Cakto tenta de novo — em vez de marcar "já processado" e travar o
  // pedido pra sempre sem QR/e-mail (era exatamente o caso que exigia rodar
  // scripts/fix-fulfill-assets.ts manualmente pra destravar).
  fulfilled = await regenerateAssets(fulfilled.id);

  const { data: withPaymentId, error: paymentIdErr } = await supabaseAdmin()
    .from("orders")
    .update({
      mp_payment_core_id: String(paymentId),
      updated_at: new Date().toISOString(),
    })
    .eq("id", fulfilled.id)
    .select("*")
    .single();

  if (paymentIdErr || !withPaymentId) {
    console.error("fulfillCore payment id save failed", paymentIdErr);
    throw new Error("Falha ao concluir liberação do pedido");
  }
  fulfilled = withPaymentId as Order;

  try {
    await track("core_paid");
  } catch (e) {
    console.error("analytics core_paid failed", e);
  }

  try {
    await sendDeliveryEmail(fulfilled);
  } catch (e) {
    console.error("delivery email failed", e);
  }

  console.info(
    `[fulfillCore] ${fulfilled.public_id} · ${appUrl()}/p/${fulfilled.public_id}`,
  );

  return fulfilled;
}

/** Marca pago manualmente (admin) sem payment id do MP. */
export async function fulfillCoreManual(order: Order): Promise<Order> {
  if (
    order.status !== "draft" &&
    order.status !== "pending_payment" &&
    order.mp_payment_core_id
  ) {
    return order;
  }
  return fulfillCore(order, order.mp_payment_core_id ?? `manual-${Date.now()}`);
}

/**
 * Upsell = polaroids + carta IMPRESSAS, enviadas pelo correio. Gera os
 * mesmos PDFs que o downsell (o admin baixa e imprime), mas não manda link
 * de download pro comprador — só uma confirmação. Endereço vem bruto do
 * webhook da Cakto (estrutura ainda não normalizada) e fica salvo pro
 * admin ler manualmente.
 */
export async function markUpsellPaid(
  order: Order,
  paymentId: string,
  shipping?: unknown,
) {
  if (order.mp_payment_upsell_id === String(paymentId)) return order;

  const { error: statusErr } = await supabaseAdmin()
    .from("orders")
    .update({
      status: "upsell_paid",
      physical_shipping: shipping ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);
  if (statusErr) throw new Error("Falha ao marcar upsell físico");

  // Mesma lógica do fulfillCore: idempotência (`mp_payment_upsell_id`) só é
  // gravada depois que os PDFs existem, senão uma falha no meio do caminho
  // trava o pedido pra sempre sem nunca reprocessar.
  const updated = await regenerateAssets(order.id);
  try {
    await sendPhysicalOrderEmail(updated);
  } catch (e) {
    console.error("physical order email", e);
  }
  try {
    await notifyAdminPhysicalOrder(updated);
  } catch (e) {
    console.error("admin physical notify", e);
  }

  const { data, error } = await supabaseAdmin()
    .from("orders")
    .update({
      mp_payment_upsell_id: String(paymentId),
      updated_at: new Date().toISOString(),
    })
    .eq("id", updated.id)
    .select("*")
    .single();
  if (error || !data) throw new Error("Falha ao concluir upsell físico");
  return data as Order;
}

/** Downsell = polaroids + carta em PDF, entregues por link de download. */
export async function markDownsellPaid(order: Order, paymentId: string) {
  if (order.mp_payment_downsell_id === String(paymentId)) return order;

  const { error: statusErr } = await supabaseAdmin()
    .from("orders")
    .update({ status: "downsell_paid", updated_at: new Date().toISOString() })
    .eq("id", order.id);
  if (statusErr) throw new Error("Falha ao marcar downsell digital");

  // Mesma lógica do fulfillCore: idempotência (`mp_payment_downsell_id`) só
  // é gravada depois que os PDFs e os e-mails foram tentados. Antes disso, o
  // registro era gravado ANTES de gerar os PDFs — se `regenerateAssets`
  // falhasse (foto com erro, timeout do render, etc.), a exceção subia sem
  // enviar nada, mas o pedido já ficava marcado como "processado". Qualquer
  // retentativa da Cakto (ou reprocesso manual) batia nesse mesmo guard de
  // idempotência ali em cima e retornava na hora, sem nunca gerar o PDF nem
  // mandar o e-mail — esse era o motivo do PDF não chegar no downsell.
  const updated = await regenerateAssets(order.id);
  try {
    await sendAddonEmail(updated, "polaroid");
  } catch (e) {
    console.error("downsell polaroid email", e);
  }
  try {
    await sendAddonEmail(updated, "letter");
  } catch (e) {
    console.error("downsell letter email", e);
  }

  const { data, error } = await supabaseAdmin()
    .from("orders")
    .update({
      mp_payment_downsell_id: String(paymentId),
      updated_at: new Date().toISOString(),
    })
    .eq("id", updated.id)
    .select("*")
    .single();
  if (error || !data) throw new Error("Falha ao concluir downsell digital");
  return data as Order;
}
