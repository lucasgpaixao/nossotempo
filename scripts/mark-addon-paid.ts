import fs from "fs";
import { markDownsellPaid, markUpsellPaid } from "../src/lib/fulfillment";
import { supabaseAdmin } from "../src/lib/supabase/admin";
import type { Order } from "../src/lib/types";

const orderId = process.argv[2];
const kind = process.argv[3] as "upsell" | "downsell" | undefined;

if (!orderId || (kind !== "upsell" && kind !== "downsell")) {
  console.error("Usage: npx tsx scripts/mark-addon-paid.ts <orderId> <upsell|downsell>");
  process.exit(1);
}

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")];
    }),
);

for (const [k, v] of Object.entries(env)) {
  process.env[k] = v;
}

async function main() {
  const { data, error } = await supabaseAdmin()
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !data) {
    console.error("Pedido não encontrado", error);
    process.exit(1);
  }

  const order = data as Order;
  console.log(`Antes: ${order.status}`);

  const fakePaymentId = `manual-${kind}-${Date.now()}`;
  const updated =
    kind === "upsell"
      ? await markUpsellPaid(order, fakePaymentId)
      : await markDownsellPaid(order, fakePaymentId);

  console.log(`Depois: ${updated.status}`);
  console.log(`Polaroid PDF: ${updated.polaroid_pdf_path ?? "-"}`);
  console.log(`Letter PDF: ${updated.letter_pdf_path ?? "-"}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
