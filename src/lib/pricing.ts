import { supabaseAdmin } from "@/lib/supabase/admin";

export { formatBRL } from "@/lib/format";

export type Pricing = {
  priceCoreCents: number;
  priceUpsellCents: number;
  priceDownsellCents: number;
};

export type SiteSettings = Pricing & {
  bannerEnabled: boolean;
  bannerText: string | null;
  bannerTargetAt: string | null;
  supportEmail: string | null;
  supportWhatsapp: string | null;
};

const DEFAULTS: SiteSettings = {
  priceCoreCents: 3700,
  priceUpsellCents: 4900,
  priceDownsellCents: 900,
  bannerEnabled: false,
  bannerText: null,
  bannerTargetAt: null,
  supportEmail: null,
  supportWhatsapp: null,
};

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) {
      return DEFAULTS;
    }

    return {
      priceCoreCents: data.price_core_cents,
      priceUpsellCents: data.price_upsell_cents,
      priceDownsellCents: data.price_downsell_cents,
      bannerEnabled: data.banner_enabled,
      bannerText: data.banner_text,
      bannerTargetAt: data.banner_target_at,
      supportEmail: data.support_email,
      supportWhatsapp: data.support_whatsapp,
    };
  } catch {
    return DEFAULTS;
  }
}

export async function getPricing(): Promise<Pricing> {
  const s = await getSiteSettings();
  return {
    priceCoreCents: s.priceCoreCents,
    priceUpsellCents: s.priceUpsellCents,
    priceDownsellCents: s.priceDownsellCents,
  };
}
