-- Defaults de preços e settings
insert into site_settings (
  id,
  price_core_cents,
  price_upsell_cents,
  price_downsell_cents,
  banner_enabled,
  support_email,
  support_whatsapp
) values (
  1,
  3700,
  4900,
  900,
  false,
  null,
  null
)
on conflict (id) do nothing;
