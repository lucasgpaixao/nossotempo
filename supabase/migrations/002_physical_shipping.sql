-- Nosso Tempo — suporte a upsell físico (polaroids + carta impressas, envio manual)
alter table orders
  add column physical_shipping jsonb,
  add column physical_shipped_at timestamptz;

comment on column orders.physical_shipping is
  'Endereço de entrega bruto vindo do webhook da Cakto (estrutura ainda não normalizada — ver admin para leitura manual)';
comment on column orders.physical_shipped_at is
  'Marcado manualmente no admin quando o operador imprime e posta o upsell físico';
