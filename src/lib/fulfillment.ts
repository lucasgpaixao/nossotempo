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
      mp_payment_core_id: String(paymentId),
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
  fulfilled = await regenerateAssets(fulfilled.id);

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

  const { data, error } = await supabaseAdmin()
    .from("orders")
    .update({
      status: "upsell_paid",
      mp_payment_upsell_id: String(paymentId),
      physical_shipping: shipping ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id)
    .select("*")
    .single();
  if (error || !data) throw new Error("Falha ao marcar upsell físico");

  const updated = await regenerateAssets((data as Order).id);
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
  return updated;
}

/** Downsell = polaroids + carta em PDF, entregues por link de download. */
export async function markDownsellPaid(order: Order, paymentId: string) {
  if (order.mp_payment_downsell_id === String(paymentId)) return order;

  const { data, error } = await supabaseAdmin()
    .from("orders")
    .update({
      status: "downsell_paid",
      mp_payment_downsell_id: String(paymentId),
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id)
    .select("*")
    .single();
  if (error || !data) throw new Error("Falha ao marcar downsell digital");

  const updated = await regenerateAssets((data as Order).id);
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
  return updated;
}
