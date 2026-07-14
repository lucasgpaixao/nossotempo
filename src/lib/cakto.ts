import { appUrl } from "@/lib/app-url";

export { appUrl };

export class InvalidCaktoWebhookError extends Error {}

function checkoutBaseUrl() {
  const url = process.env.CAKTO_CHECKOUT_URL;
  if (!url) {
    throw new Error("Missing CAKTO_CHECKOUT_URL");
  }
  return url;
}

/**
 * Cakto não tem uma API de "criar cobrança dinâmica" (como a Preference do
 * Mercado Pago): o checkout é um link fixo por Oferta, configurado no painel.
 * Prefill de e-mail via query string; upsell/downsell são Order Bumps
 * configurados na própria Oferta, escolhidos pelo comprador no checkout deles.
 *
 * `sck` é o único parâmetro de tracking customizado documentado publicamente;
 * usamos pra carregar nosso order_id e recuperá-lo no webhook.
 */
export function buildCheckoutUrl(input: { orderId: string; buyerEmail: string }) {
  const url = new URL(checkoutBaseUrl());
  url.searchParams.set("email", input.buyerEmail);
  url.searchParams.set("confirmEmail", input.buyerEmail);
  url.searchParams.set("sck", input.orderId);
  return url.toString();
}

/**
 * O payload do webhook da Cakto inclui um campo `secret` de texto plano
 * (definido na hora de criar o webhook no painel) — não é HMAC. Comparação
 * direta é o que a doc deles descreve.
 */
export function verifyCaktoWebhookSecret(body: { secret?: unknown }) {
  const expected = process.env.CAKTO_WEBHOOK_SECRET;
  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Missing CAKTO_WEBHOOK_SECRET");
    }
    return;
  }
  if (body.secret !== expected) {
    throw new InvalidCaktoWebhookError("secret mismatch");
  }
}
