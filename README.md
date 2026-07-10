# Nosso Tempo

Presente digital: página do casal com fotos, mensagem, música YouTube, pagamento Mercado Pago, QR + e-mail.

## Stack

Next.js (App Router) · Tailwind · shadcn/ui · Supabase · Mercado Pago · Resend · Vercel

## Setup local

```bash
cp .env.example .env.local
# preencha as variáveis (ver abaixo)

npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). Admin: `/admin/login`.

### Variáveis (`.env.local`)

| Variável | Obrigatório | Notas |
|----------|-------------|--------|
| `NEXT_PUBLIC_APP_URL` | sim | `http://localhost:3000` em local; URL Vercel em prod |
| `NEXT_PUBLIC_SUPABASE_URL` | sim | Projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sim | Anon / publishable |
| `SUPABASE_SERVICE_ROLE_KEY` | sim | Só servidor |
| `CRON_SECRET` | sim | Protege `/api/cron/cleanup-drafts` |
| `MERCADOPAGO_ACCESS_TOKEN` | para pagar | Sandbox no dev |
| `MERCADOPAGO_WEBHOOK_SECRET` | prod | Validação do webhook |
| `RESEND_API_KEY` | e-mail | Sem key, fulfill só loga |
| `EMAIL_FROM` | e-mail | Domínio verificado no Resend |
| `YOUTUBE_API_KEY` | música | Busca no wizard |

### Supabase

1. Rode a migration `supabase/migrations/001_init.sql` + seed
2. Buckets privados: `couple-photos`, `order-assets`
3. Admin: user no Auth + linha em `admin_users`  
   (`node scripts/create-admin.mjs email senha`)

```bash
npm test
npm run build
```

### Deploy (Vercel)

1. Link do projeto + envs (incluindo `CRON_SECRET`)
2. Após o 1º deploy, atualize `NEXT_PUBLIC_APP_URL` para a URL pública
3. Webhook MP → `https://<dominio>/api/webhooks/mercadopago`
4. Cron diário já está em `vercel.json` (`0 6 * * *`)

## Status

MVP implementado (landing, wizard, página do casal, checkout/webhook, PDFs, e-mail, edição 7 dias, admin, cron). Mercado Pago / Resend / YouTube: configurar keys quando for testar o funil completo.

**Produção:** https://nossotempo-henna.vercel.app  
**Admin:** https://nossotempo-henna.vercel.app/admin/login

