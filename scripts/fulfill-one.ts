import fs from "fs";
import { fulfillCoreManual } from "../src/lib/fulfillment";
import { supabaseAdmin } from "../src/lib/supabase/admin";
import type { Order } from "../src/lib/types";

const orderId = process.argv[2];
if (!orderId) {
  console.error("Usage: npx tsx scripts/fulfill-one.ts <orderId>");
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
  console.log(`Antes: ${order.status} · /p/${order.public_id}`);

  const fulfilled = await fulfillCoreManual(order);
  console.log(`Depois: ${fulfilled.status}`);
  console.log(`Página: ${process.env.NEXT_PUBLIC_APP_URL}/p/${fulfilled.public_id}`);
  console.log(`Sucesso: ${process.env.NEXT_PUBLIC_APP_URL}/sucesso/${fulfilled.id}`);
  if (fulfilled.edit_token) {
    console.log(`Editar: ${process.env.NEXT_PUBLIC_APP_URL}/editar/${fulfilled.edit_token}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
