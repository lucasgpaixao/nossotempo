import { Resend } from "resend";
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

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

  let qrCidHtml = "";
  const attachments: {
    filename: string;
    content: Buffer;
    contentId?: string;
  }[] = [];

  if (order.qr_storage_path) {
    const { data } = await (
      await import("@/lib/supabase/admin")
    )
      .supabaseAdmin()
      .storage.from("order-assets")
      .download(order.qr_storage_path);
    if (data) {
      const buf = Buffer.from(await data.arrayBuffer());
      attachments.push({
        filename: "qr.png",
        content: buf,
        contentId: "qrcode",
      });
      qrCidHtml = `<img src="cid:qrcode" alt="QR Code" width="180" height="180" style="display:block;margin:16px auto;border:2px solid #6b1e36;padding:8px;background:#fff" />`;
    }
  }

  const supportBits: string[] = [];
  if (settings.supportEmail) {
    supportBits.push(
      `<a href="mailto:${escapeHtml(settings.supportEmail)}">${escapeHtml(settings.supportEmail)}</a>`,
    );
  }
  if (settings.supportWhatsapp) {
    const wa = settings.supportWhatsapp.replace(/\D/g, "");
    supportBits.push(
      `<a href="https://wa.me/${wa}">WhatsApp</a>`,
    );
  }

  const names = `${escapeHtml(order.name1)} &amp; ${escapeHtml(order.name2)}`;
  const html = `
  <div style="font-family:Georgia,serif;background:#f7f0e8;padding:32px;color:#2a1520">
    <p style="letter-spacing:3px;color:#6b1e36;font-size:12px;text-align:center">NOSSO TEMPO</p>
    <h1 style="text-align:center;color:#4a1425;font-size:28px;margin:8px 0 24px">Presente liberado</h1>
    <p style="text-align:center">${names}</p>
    ${qrCidHtml}
    <p style="text-align:center"><a href="${pageUrl}" style="color:#6b1e36">Abrir página do casal</a></p>
    <p style="text-align:center;font-size:13px;color:#6b4a55;word-break:break-all">${pageUrl}</p>
    ${
      editUrl
        ? `<p style="text-align:center;margin-top:24px;font-size:14px">Editar por 7 dias:<br/><a href="${editUrl}" style="color:#6b1e36">${editUrl}</a></p>`
        : ""
    }
    ${
      supportBits.length
        ? `<p style="text-align:center;margin-top:32px;font-size:12px;color:#6b4a55">Suporte: ${supportBits.join(" · ")}</p>`
        : ""
    }
  </div>`;

  const { error } = await resend.emails.send({
    from: fromAddress(),
    to: order.buyer_email,
    subject: `Nosso Tempo — ${order.name1} & ${order.name2}`,
    html,
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
  const html = `
  <div style="font-family:Georgia,serif;background:#f7f0e8;padding:32px;color:#2a1520">
    <p style="letter-spacing:3px;color:#6b1e36;font-size:12px;text-align:center">NOSSO TEMPO</p>
    <h1 style="text-align:center;color:#4a1425;font-size:24px">Seu PDF: ${label}</h1>
    <p style="text-align:center">Baixe o arquivo para imprimir em casa (link válido por 7 dias).</p>
    <p style="text-align:center;margin-top:24px">
      <a href="${url}" style="background:#6b1e36;color:#f7f0e8;padding:12px 20px;text-decoration:none;border-radius:6px;display:inline-block">Baixar ${label}</a>
    </p>
  </div>`;

  const { error } = await resend.emails.send({
    from: fromAddress(),
    to: order.buyer_email,
    subject: `Nosso Tempo — ${label} PDF`,
    html,
  });

  if (error) {
    console.error("sendAddonEmail", error);
    throw new Error("Falha ao enviar e-mail do extra");
  }

  return { skipped: false as const };
}
