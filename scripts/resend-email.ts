import fs from "fs";
import { sendDeliveryEmail } from "../src/lib/resend";
import { supabaseAdmin } from "../src/lib/supabase/admin";
import type { Order } from "../src/lib/types";

const orderId = process.argv[2];
if (!orderId) {
  console.error("Usage: npx tsx scripts/resend-email.ts <orderId>");
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
  await sendDeliveryEmail(order);
  console.log(`E-mail reenviado para ${order.buyer_email} · /p/${order.public_id}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
