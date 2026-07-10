-- Nosso Tempo — schema inicial
create extension if not exists "pgcrypto";

create type order_status as enum (
  'draft',
  'pending_payment',
  'core_paid',
  'upsell_offered',
  'upsell_paid',
  'downsell_offered',
  'downsell_paid',
  'completed',
  'cancelled'
);

create table site_settings (
  id int primary key default 1 check (id = 1),
  price_core_cents int not null default 2990,
  price_upsell_cents int not null default 1990,
  price_downsell_cents int not null default 990,
  banner_enabled boolean not null default false,
  banner_text text,
  banner_target_at timestamptz,
  support_email text,
  support_whatsapp text,
  updated_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  status order_status not null default 'draft',
  buyer_email text,
  name1 text,
  name2 text,
  started_at timestamptz,
  message text,
  youtube_video_id text,
  youtube_title text,
  youtube_thumbnail text,
  edit_token text unique,
  edit_expires_at timestamptz,
  mp_preference_core_id text,
  mp_payment_core_id text,
  mp_preference_upsell_id text,
  mp_payment_upsell_id text,
  mp_preference_downsell_id text,
  mp_payment_downsell_id text,
  qr_storage_path text,
  polaroid_pdf_path text,
  letter_pdf_path text,
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table order_photos (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  storage_path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index orders_status_idx on orders(status);
create index orders_created_at_idx on orders(created_at desc);
create index orders_buyer_email_idx on orders(buyer_email);

alter table orders enable row level security;
alter table order_photos enable row level security;
alter table site_settings enable row level security;
alter table admin_users enable row level security;

-- Storage buckets (criar no dashboard ou via API):
--   couple-photos (private)
--   order-assets  (private) -- QR PNG, PDFs
