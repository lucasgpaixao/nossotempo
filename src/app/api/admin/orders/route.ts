import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { fulfillCoreManual } from "@/lib/fulfillment";
import { regenerateAssets, signedAssetUrl } from "@/lib/pdf";
import { sendDeliveryEmail } from "@/lib/resend";
import { draftPatchToRow } from "@/lib/drafts";
import { getSiteSettings } from "@/lib/pricing";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Order } from "@/lib/types";
import { draftUpdateSchema } from "@/lib/validations";
import { z } from "zod";

export const runtime = "nodejs";

/** GET /api/admin/orders */
export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const url = new URL(req.url);
  if (url.searchParams.get("settings") === "1") {
    const settings = await getSiteSettings();
    return NextResponse.json({ settings });
  }

  const id = url.searchParams.get("id");
  if (id) {
    const { data } = await supabaseAdmin()
      .from("orders")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!data) {
      return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    }
    const o = data as Order;
    const assets: Record<string, string | null> = {};
    if (o.qr_storage_path) {
      assets.qr = await signedAssetUrl(o.qr_storage_path);
    }
    if (o.polaroid_pdf_path) {
      assets.polaroid = await signedAssetUrl(o.polaroid_pdf_path);
    }
    if (o.letter_pdf_path) {
      assets.letter = await signedAssetUrl(o.letter_pdf_path);
    }
    return NextResponse.json({ order: o, assets });
  }

  const status = url.searchParams.get("status");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const q = url.searchParams.get("q")?.trim();

  let query = supabaseAdmin()
    .from("orders")
    .select(
      "id, public_id, status, buyer_email, name1, name2, created_at, updated_at, mp_payment_core_id, mp_payment_upsell_id, mp_payment_downsell_id, physical_shipped_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (status) query = query.eq("status", status);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);
  if (q) {
    query = query.or(
      `buyer_email.ilike.%${q}%,name1.ilike.%${q}%,name2.ilike.%${q}%`,
    );
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Falha ao listar." }, { status: 500 });
  }

  return NextResponse.json({ orders: data ?? [] });
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("fulfill"), orderId: z.string().uuid() }),
  z.object({ action: z.literal("resend_email"), orderId: z.string().uuid() }),
  z.object({ action: z.literal("regenerate"), orderId: z.string().uuid() }),
  z.object({ action: z.literal("mark_shipped"), orderId: z.string().uuid() }),
  z.object({
    action: z.literal("update_order"),
    orderId: z.string().uuid(),
    patch: draftUpdateSchema,
  }),
  z.object({
    action: z.literal("update_settings"),
    settings: z.object({
      priceCoreCents: z.number().int().positive().optional(),
      priceUpsellCents: z.number().int().positive().optional(),
      priceDownsellCents: z.number().int().positive().optional(),
      bannerEnabled: z.boolean().optional(),
      bannerText: z.string().nullable().optional(),
      bannerTargetAt: z.string().nullable().optional(),
      supportEmail: z.string().nullable().optional(),
      supportWhatsapp: z.string().nullable().optional(),
    }),
  }),
]);

/** POST /api/admin/orders — ações */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const parsed = actionSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const body = parsed.data;

  if (body.action === "update_settings") {
    const s = body.settings;
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (s.priceCoreCents !== undefined) row.price_core_cents = s.priceCoreCents;
    if (s.priceUpsellCents !== undefined) row.price_upsell_cents = s.priceUpsellCents;
    if (s.priceDownsellCents !== undefined) {
      row.price_downsell_cents = s.priceDownsellCents;
    }
    if (s.bannerEnabled !== undefined) row.banner_enabled = s.bannerEnabled;
    if (s.bannerText !== undefined) row.banner_text = s.bannerText;
    if (s.bannerTargetAt !== undefined) row.banner_target_at = s.bannerTargetAt;
    if (s.supportEmail !== undefined) row.support_email = s.supportEmail;
    if (s.supportWhatsapp !== undefined) row.support_whatsapp = s.supportWhatsapp;

    const { error } = await supabaseAdmin()
      .from("site_settings")
      .update(row)
      .eq("id", 1);
    if (error) {
      return NextResponse.json({ error: "Falha ao salvar settings." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const { data: order } = await supabaseAdmin()
    .from("orders")
    .select("*")
    .eq("id", body.orderId)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  const o = order as Order;

  if (body.action === "fulfill") {
    const updated = await fulfillCoreManual(o);
    return NextResponse.json({ order: updated });
  }

  if (body.action === "resend_email") {
    await sendDeliveryEmail(o);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "regenerate") {
    const updated = await regenerateAssets(o.id);
    return NextResponse.json({ order: updated });
  }

  if (body.action === "mark_shipped") {
    const { data, error } = await supabaseAdmin()
      .from("orders")
      .update({ physical_shipped_at: new Date().toISOString() })
      .eq("id", o.id)
      .select("*")
      .single();
    if (error || !data) {
      return NextResponse.json({ error: "Falha ao marcar enviado." }, { status: 500 });
    }
    return NextResponse.json({ order: data as Order });
  }

  if (body.action === "update_order") {
    const row = draftPatchToRow(body.patch);
    const { data, error } = await supabaseAdmin()
      .from("orders")
      .update(row)
      .eq("id", o.id)
      .select("*")
      .single();
    if (error || !data) {
      return NextResponse.json({ error: "Falha ao atualizar." }, { status: 500 });
    }
    let updated = data as Order;
    try {
      updated = await regenerateAssets(updated.id);
    } catch (e) {
      console.error(e);
    }
    return NextResponse.json({ order: updated });
  }

  return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 });
}
