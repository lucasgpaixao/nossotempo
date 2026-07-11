import fs from "fs";
import { regenerateAssets } from "../src/lib/pdf";
import { sendDeliveryEmail } from "../src/lib/resend";
import { supabaseAdmin } from "../src/lib/supabase/admin";
import type { Order } from "../src/lib/types";

const orderId = process.argv[2];
if (!orderId) {
  console.error("Usage: npx tsx scripts/fix-fulfill-assets.ts <orderId>");
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
// QR / links de produção
process.env.NEXT_PUBLIC_APP_URL = "https://nossotempo-henna.vercel.app";

async function main() {
  const order = await regenerateAssets(orderId);
  console.log("qr_path", order.qr_storage_path);
  console.log("public_id", order.public_id);

  await supabaseAdmin()
    .from("orders")
    .update({ buyer_email: "lucasgpaixao@gmail.com" })
    .eq("id", orderId);

  const { data } = await supabaseAdmin()
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  await sendDeliveryEmail(data as Order);
  console.log("email ok → lucasgpaixao@gmail.com");
  console.log(`page https://nossotempo-henna.vercel.app/p/${order.public_id}`);
  console.log(`sucesso https://nossotempo-henna.vercel.app/sucesso/${orderId}`);
  console.log(
    `editar https://nossotempo-henna.vercel.app/editar/${order.edit_token}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
