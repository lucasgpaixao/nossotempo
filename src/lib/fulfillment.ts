import { createEditToken } from "@/lib/ids";
import { appUrl } from "@/lib/app-url";
import { generateLetterPdf, generatePolaroidPdf, regenerateAssets } from "@/lib/pdf";
import { sendAddonEmail, sendDeliveryEmail } from "@/lib/resend";
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

export async function markUpsellPaid(order: Order, paymentId: string) {
  if (order.mp_payment_upsell_id === String(paymentId)) return order;

  const { data, error } = await supabaseAdmin()
    .from("orders")
    .update({
      status: "upsell_paid",
      mp_payment_upsell_id: String(paymentId),
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id)
    .select("*")
    .single();
  if (error || !data) throw new Error("Falha ao marcar upsell");

  let updated = await generatePolaroidPdf(data as Order);
  try {
    await sendAddonEmail(updated, "polaroid");
  } catch (e) {
    console.error("upsell email", e);
  }
  return updated;
}

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
  if (error || !data) throw new Error("Falha ao marcar downsell");

  let updated = await generateLetterPdf(data as Order);
  try {
    await sendAddonEmail(updated, "letter");
  } catch (e) {
    console.error("downsell email", e);
  }
  return updated;
}
