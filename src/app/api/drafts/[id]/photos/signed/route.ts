import { NextResponse } from "next/server";
import { canMutateDraft, isPubliclyVisible, type Order } from "@/lib/types";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/drafts/[id]/photos/signed?path=
 * Proxy same-origin da foto (evita <img> quebrado em redirect cross-origin).
 */
export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const path = new URL(req.url).searchParams.get("path");
  // Confina o path ao diretório do próprio pedido e bloqueia travessia
  // (`..`, `//`) antes de qualquer download do Storage.
  if (
    !path ||
    !path.startsWith(`${id}/`) ||
    path.includes("..") ||
    path.includes("//")
  ) {
    return NextResponse.json({ error: "path inválido." }, { status: 400 });
  }

  try {
    const { data: order } = await supabaseAdmin()
      .from("orders")
      .select("status")
      .eq("id", id)
      .maybeSingle();

    if (!order) {
      return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    }

    const status = (order as Pick<Order, "status">).status;
    if (!canMutateDraft(status) && !isPubliclyVisible(status)) {
      return NextResponse.json({ error: "Não permitido." }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin()
      .storage.from("couple-photos")
      .download(path);

    if (error || !data) {
      console.error("photo download", error);
      return NextResponse.json({ error: "Falha ao carregar foto." }, { status: 500 });
    }

    // Uint8Array (não Buffer): Buffer no NextResponse pode corromper binário (UTF-8).
    const bytes = new Uint8Array(await data.arrayBuffer());
    const contentType = data.type || "image/webp";

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "private, max-age=1800",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Serviço indisponível." }, { status: 503 });
  }
}
