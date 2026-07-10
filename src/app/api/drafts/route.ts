import { NextResponse } from "next/server";
import { createPublicId } from "@/lib/ids";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** POST /api/drafts — cria order status=draft + public_id */
export async function POST() {
  try {
    const publicId = createPublicId();
    const { data, error } = await supabaseAdmin()
      .from("orders")
      .insert({
        public_id: publicId,
        status: "draft",
      })
      .select("id, public_id, status, created_at")
      .single();

    if (error) {
      console.error("draft create error", error);
      return NextResponse.json(
        { error: "Não foi possível criar o rascunho." },
        { status: 500 },
      );
    }

    return NextResponse.json({ draft: data }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Serviço indisponível. Configure o Supabase." },
      { status: 503 },
    );
  }
}
