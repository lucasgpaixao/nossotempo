import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * GET /api/cron/cleanup-drafts
 * Protegido por CRON_SECRET (Authorization: Bearer … ou ?secret=).
 * Apaga drafts com mais de 7 dias + arquivos no Storage.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const auth = req.headers.get("authorization");
  // Vercel Cron envia Authorization: Bearer <CRON_SECRET>
  const secret =
    url.searchParams.get("secret") ??
    (auth?.startsWith("Bearer ") ? auth.slice(7) : null);

  const expected = process.env.CRON_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  const { data: drafts, error } = await supabaseAdmin()
    .from("orders")
    .select("id")
    .eq("status", "draft")
    .lt("created_at", cutoff.toISOString());

  if (error) {
    console.error("cleanup list", error);
    return NextResponse.json({ error: "Falha" }, { status: 500 });
  }

  let deleted = 0;
  for (const row of drafts ?? []) {
    const id = row.id as string;

    const { data: photos } = await supabaseAdmin()
      .from("order_photos")
      .select("storage_path")
      .eq("order_id", id);

    const photoPaths = (photos ?? []).map(
      (p: { storage_path: string }) => p.storage_path,
    );
    if (photoPaths.length) {
      await supabaseAdmin().storage.from("couple-photos").remove(photoPaths);
    }

    // assets do draft (raro, mas limpa)
    await supabaseAdmin()
      .storage.from("order-assets")
      .remove([`${id}/qr.png`, `${id}/polaroids.pdf`, `${id}/carta.pdf`]);

    await supabaseAdmin().from("orders").delete().eq("id", id);
    deleted += 1;
  }

  return NextResponse.json({ deleted, cutoff: cutoff.toISOString() });
}
