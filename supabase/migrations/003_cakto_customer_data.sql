-- Nosso Tempo — dados do cliente e da cobrança vindos do webhook da Cakto
-- (nome, telefone, forma de pagamento e valor efetivamente pago por oferta),
-- pra exibir no admin dentro de cada pedido.
alter table orders
  add column buyer_name text,
  add column buyer_phone text,
  add column payment_method text,
  add column core_amount_cents integer,
  add column upsell_amount_cents integer,
  add column downsell_amount_cents integer;

comment on column orders.buyer_name is
  'Nome do comprador — customer.name do webhook da Cakto (pode diferir de name1/name2, que são os nomes do casal no presente)';
comment on column orders.buyer_phone is
  'Telefone do comprador — customer.phone do webhook da Cakto';
comment on column orders.payment_method is
  'Forma de pagamento da última oferta processada (pix, credit_card, etc) — paymentMethod do webhook da Cakto';
comment on column orders.core_amount_cents is
  'Valor efetivamente cobrado pelo core, em centavos (amount da Cakto) — pode diferir do preço configurado em site_settings se o preço mudou depois';
comment on column orders.upsell_amount_cents is
  'Valor efetivamente cobrado pelo upsell físico, em centavos';
comment on column orders.downsell_amount_cents is
  'Valor efetivamente cobrado pelo downsell digital, em centavos';
