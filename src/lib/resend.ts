import { Resend } from "resend";
import { AddonEmail } from "@/emails/addon";
import { DeliveryEmail } from "@/emails/delivery";
import { PhysicalOrderEmail } from "@/emails/physical";
import { appUrl } from "@/lib/app-url";
import { getSiteSettings } from "@/lib/pricing";
import { signedAssetUrl } from "@/lib/pdf";
import type { Order } from "@/lib/types";

function resendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function fromAddress() {
  return process.env.EMAIL_FROM ?? "Nosso Tempo <contato@nossotempo.ampliautomacao.com.br>";
}

export async function sendDeliveryEmail(order: Order) {
  const resend = resendClient();
  if (!resend || !order.buyer_email || !order.name1 || !order.name2) {
    console.info("[email] skip delivery — missing resend/email/names");
    return { skipped: true as const };
  }

  const settings = await getSiteSettings();
  const pageUrl = `${appUrl()}/p/${order.public_id}`;
  const editUrl = order.edit_token
    ? `${appUrl()}/editar/${order.edit_token}`
    : null;

  const attachments: {
    filename: string;
    content: Buffer;
    contentId?: string;
  }[] = [];
  let qrCid: string | null = null;

  if (order.qr_storage_path) {
    const { data } = await (
      await import("@/lib/supabase/admin")
    )
      .supabaseAdmin()
      .storage.from("order-assets")
      .download(order.qr_storage_path);
    if (data) {
      const buf = Buffer.from(await data.arrayBuffer());
      qrCid = "qrcode";
      attachments.push({
        filename: "qr.png",
        content: buf,
        contentId: qrCid,
      });
    }
  }

  const { error } = await resend.emails.send({
    from: fromAddress(),
    to: order.buyer_email,
    subject: `Nosso Tempo — ${order.name1} & ${order.name2}`,
    react: DeliveryEmail({
      name1: order.name1,
      name2: order.name2,
      pageUrl,
      editUrl,
      qrCid,
      supportEmail: settings.supportEmail,
      supportWhatsapp: settings.supportWhatsapp,
    }),
    attachments: attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
      ...(a.contentId ? { contentId: a.contentId } : {}),
    })),
  });

  if (error) {
    console.error("sendDeliveryEmail", error);
    throw new Error("Falha ao enviar e-mail");
  }

  return { skipped: false as const };
}

export async function sendAddonEmail(
  order: Order,
  kind: "polaroid" | "letter",
) {
  const resend = resendClient();
  if (!resend || !order.buyer_email) {
    console.info("[email] skip addon");
    return { skipped: true as const };
  }

  const path =
    kind === "polaroid" ? order.polaroid_pdf_path : order.letter_pdf_path;
  if (!path) {
    console.info("[email] skip addon — no pdf path");
    return { skipped: true as const };
  }

  const url = await signedAssetUrl(path, 60 * 60 * 24 * 7);
  if (!url) throw new Error("Falha ao assinar PDF");

  const label = kind === "polaroid" ? "Polaroids" : "Carta";

  const { error } = await resend.emails.send({
    from: fromAddress(),
    to: order.buyer_email,
    subject: `Nosso Tempo — ${label} PDF`,
    react: AddonEmail({ label, downloadUrl: url }),
  });

  if (error) {
    console.error("sendAddonEmail", error);
    throw new Error("Falha ao enviar e-mail do extra");
  }

  return { skipped: false as const };
}

/** Confirmação pro comprador — sem link, o item físico vai pelo correio. */
export async function sendPhysicalOrderEmail(order: Order) {
  const resend = resendClient();
  if (!resend || !order.buyer_email || !order.name1 || !order.name2) {
    console.info("[email] skip physical order — missing resend/email/names");
    return { skipped: true as const };
  }

  const { error } = await resend.emails.send({
    from: fromAddress(),
    to: order.buyer_email,
    subject: "Nosso Tempo — pedido de polaroids + carta impressas recebido",
    react: PhysicalOrderEmail({ name1: order.name1, name2: order.name2 }),
  });

  if (error) {
    console.error("sendPhysicalOrderEmail", error);
    throw new Error("Falha ao enviar e-mail de confirmação física");
  }

  return { skipped: false as const };
}

/**
 * Aviso interno pro suporte/admin quando um upsell físico é pago — o
 * endereço vem bruto do webhook da Cakto (estrutura ainda não confirmada),
 * então só formatamos como JSON legível em vez de tentar parsear campos.
 */
export async function notifyAdminPhysicalOrder(order: Order) {
  const resend = resendClient();
  const settings = await getSiteSettings();
  const to = settings.supportEmail;
  if (!resend || !to) {
    console.info("[email] skip admin physical notify — missing resend/supportEmail");
    return { skipped: true as const };
  }

  const addressJson = JSON.stringify(order.physical_shipping ?? {}, null, 2);

  const { error } = await resend.emails.send({
    from: fromAddress(),
    to,
    subject: `Novo pedido físico — ${order.name1} & ${order.name2}`,
    html: `
      <p>Pedido <strong>${order.id}</strong> comprou o upsell físico (polaroids + carta impressas).</p>
      <p>Baixe os PDFs no admin (${appUrl()}/admin/pedidos/${order.id}) pra imprimir e postar.</p>
      <p>Endereço recebido da Cakto:</p>
      <pre>${addressJson}</pre>
    `,
  });

  if (error) {
    console.error("notifyAdminPhysicalOrder", error);
    // Não derruba o fulfillment por causa de um aviso interno.
  }

  return { skipped: false as const };
}
