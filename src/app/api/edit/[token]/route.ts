import { NextResponse } from "next/server";
import { draftPatchToRow } from "@/lib/drafts";
import { regenerateAssets } from "@/lib/pdf";
import { sendDeliveryEmail } from "@/lib/resend";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isPubliclyVisible, type Order } from "@/lib/types";
import { draftUpdateSchema } from "@/lib/validations";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ token: string }> };

async function getByToken(token: string): Promise<Order | null> {
  const { data, error } = await supabaseAdmin()
    .from("orders")
    .select("*")
    .eq("edit_token", token)
    .maybeSingle();
  if (error || !data) return null;
  return data as Order;
}

function tokenValid(order: Order) {
  if (!order.edit_token || !order.edit_expires_at) return false;
  if (!isPubliclyVisible(order.status)) return false;
  return new Date(order.edit_expires_at).getTime() > Date.now();
}

/** GET /api/edit/[token] */
export async function GET(_req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const order = await getByToken(token);
  if (!order || !tokenValid(order)) {
    return NextResponse.json(
      { error: "Link inválido ou expirado." },
      { status: 404 },
    );
  }

  const { data: photos } = await supabaseAdmin()
    .from("order_photos")
    .select("id, storage_path, sort_order")
    .eq("order_id", order.id)
    .order("sort_order", { ascending: true });

  return NextResponse.json({ order, photos: photos ?? [] });
}

/** PATCH /api/edit/[token] */
export async function PATCH(req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const order = await getByToken(token);
  if (!order || !tokenValid(order)) {
    return NextResponse.json(
      { error: "Link inválido ou expirado." },
      { status: 404 },
    );
  }

  const body = await req.json();
  const parsed = draftUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Não permite mudar e-mail/termos via edit magic link de forma solta —
  // buyerEmail opcional ok se quiser atualizar.
  const row = draftPatchToRow(parsed.data);
  const { data, error } = await supabaseAdmin()
    .from("orders")
    .update(row)
    .eq("id", order.id)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Falha ao salvar." }, { status: 500 });
  }

  let updated = data as Order;
  try {
    updated = await regenerateAssets(updated.id);
  } catch (e) {
    console.error("regenerate on edit", e);
  }

  const resendEmail = new URL(req.url).searchParams.get("resend") === "1";
  if (resendEmail) {
    try {
      await sendDeliveryEmail(updated);
    } catch (e) {
      console.error("resend on edit", e);
    }
  }

  return NextResponse.json({ order: updated });
}
