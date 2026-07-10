import {
  InvalidWebhookSignatureError,
  MercadoPagoConfig,
  Payment,
  Preference,
  WebhookSignatureValidator,
} from "mercadopago";
import { appUrl } from "@/lib/app-url";

export { InvalidWebhookSignatureError, appUrl };

function accessToken() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    throw new Error("Missing MERCADOPAGO_ACCESS_TOKEN");
  }
  return token;
}

export function mpConfig() {
  return new MercadoPagoConfig({ accessToken: accessToken() });
}

export function mpPreference() {
  return new Preference(mpConfig());
}

export function mpPayment() {
  return new Payment(mpConfig());
}

export type CheckoutKind = "core" | "upsell" | "downsell";

export async function createCheckoutPreference(input: {
  orderId: string;
  publicId: string;
  kind: CheckoutKind;
  title: string;
  unitPrice: number; // BRL float, e.g. 29.9
  buyerEmail: string;
}) {
  const base = appUrl();
  const preference = mpPreference();

  const result = await preference.create({
    body: {
      items: [
        {
          id: `${input.kind}-${input.orderId}`,
          title: input.title,
          description: input.title,
          quantity: 1,
          unit_price: input.unitPrice,
          currency_id: "BRL",
        },
      ],
      payer: { email: input.buyerEmail },
      external_reference: input.orderId,
      metadata: {
        order_id: input.orderId,
        public_id: input.publicId,
        kind: input.kind,
      },
      back_urls: {
        success: `${base}/sucesso/${input.orderId}`,
        failure: `${base}/criar?draft=${input.orderId}&pay=failed`,
        pending: `${base}/sucesso/${input.orderId}?pending=1`,
      },
      auto_return: "approved",
      notification_url: `${base}/api/webhooks/mercadopago?source_news=webhooks`,
      statement_descriptor: "NOSSO TEMPO",
    },
  });

  const initPoint =
    process.env.NODE_ENV === "production"
      ? result.init_point
      : (result.sandbox_init_point ?? result.init_point);

  if (!result.id || !initPoint) {
    throw new Error("Preferência Mercado Pago sem id/init_point");
  }

  return { preferenceId: result.id, initPoint };
}

export function verifyMpWebhook(req: Request, url: URL) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    // Em dev sem secret, aceita (sandbox local); em prod exige.
    if (process.env.NODE_ENV === "production") {
      throw new Error("Missing MERCADOPAGO_WEBHOOK_SECRET");
    }
    return;
  }

  WebhookSignatureValidator.validate({
    xSignature: req.headers.get("x-signature"),
    xRequestId: req.headers.get("x-request-id"),
    dataId: url.searchParams.get("data.id") ?? url.searchParams.get("id"),
    secret,
    toleranceSeconds: 300,
  });
}

export async function fetchMpPayment(paymentId: string) {
  const payment = mpPayment();
  return payment.get({ id: paymentId });
}
