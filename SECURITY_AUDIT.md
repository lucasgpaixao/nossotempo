# Auditoria de Segurança — Nosso Tempo

**Data:** 2026-07-15 · **Escopo:** todo o código em `src/`, `scripts/`, `supabase/`, configs e advisors do Supabase (projeto `nossotempo`).

Legenda de severidade: 🔴 Alta · 🟠 Média · 🟡 Baixa / hardening · ✅ Verificado e OK

---

## ✅ ~~A1. Webhook da Cakto loga o `secret` em texto plano~~ (corrigido em 2026-07-15)

**Arquivo:** [src/app/api/webhooks/cakto/route.ts:82](src/app/api/webhooks/cakto/route.ts)

Quando o payload chega sem `sck`, o handler faz `JSON.stringify(body)` — e o `body` inclui o campo `secret` do webhook. Esse secret é a **única** autenticação do webhook: quem tiver acesso aos logs do Vercel (ou a qualquer integração de log) consegue forjar `purchase_approved` e liberar pedidos sem pagar (`fulfillCore`).

**Correção:** remover/mascarar `secret` antes de logar (`const { secret: _, ...safe } = body`).

---

## ✅ ~~A2. `/sucesso/[orderId]` expõe o link de edição e o e-mail do comprador a partir do UUID do pedido~~ (corrigido em 2026-07-15)

**Arquivo:** [src/app/sucesso/[orderId]/page.tsx](src/app/sucesso/[orderId]/page.tsx), [src/app/api/edit/[token]/route.ts](src/app/api/edit/[token]/route.ts), [src/lib/validations.ts](src/lib/validations.ts)

A página de sucesso é acessível por qualquer pessoa que conheça o UUID interno do pedido e exibia: o `edit_token` (via link `/editar/{token}`), o `buyer_email` e o link da página. Esse UUID **circula fora do nosso controle**: ele vai na URL de checkout da Cakto como `sck` (histórico do navegador, logs/analytics da Cakto, extensões, referrers). Quem capturasse o UUID podia, por 7 dias, editar o conteúdo do presente e — pior — trocar o `buyer_email` via PATCH `/api/edit/[token]` e reenviar o e-mail de entrega (`?resend=1`) para si.

**Correção aplicada:**
- A página de sucesso não renderiza mais `editUrl` nem `buyer_email` — só o link público da página. O link de edição é entregue exclusivamente pelo e-mail de entrega (`sendDeliveryEmail`).
- Criado `editUpdateSchema` (`draftUpdateSchema.omit({ buyerEmail, termsAccepted })`), usado no PATCH `/api/edit/[token]`: um token vazado não consegue mais redirecionar os e-mails de entrega. O admin (`/api/admin/orders`) continua podendo editar o e-mail via `draftUpdateSchema`.

Verificado end-to-end: PATCH com `buyerEmail` → 400; página de sucesso sem link de edição/e-mail; teste unitário do schema confirmando a rejeição.

> **Pendência residual (não crítica):** o UUID ainda dá acesso de edição a quem o capturar via `sck`, pois o link de edição usa esse mesmo token de pedido. Mitigado (não expõe mais e-mail nem permite sequestrá-lo), mas um token efêmero próprio para a página de sucesso seria o ideal — rastreado como melhoria futura.

---

## ✅ ~~A3. Upload/remoção de fotos sem nenhuma autenticação enquanto o pedido está `pending_payment`~~ (corrigido em 2026-07-15)

**Arquivo:** [src/app/api/drafts/[id]/photos/route.ts](src/app/api/drafts/[id]/photos/route.ts)

`canUploadPhotos()` retornava `true` para qualquer pedido em `draft`/`pending_payment` **sem exigir token algum** — bastava o UUID (que vaza via `sck`, ver A2). Um atacante podia apagar as fotos do casal antes do pagamento ou substituí-las por conteúdo arbitrário (que depois vai para a página pública e para os PDFs impressos).

**Correção aplicada:** removido o ramo sem token. Auditando os chamadores, confirmei que o wizard (`/criar`) sobe todas as fotos de uma vez pelo `POST /api/checkout/core` e **nunca** chama `/api/drafts/[id]/photos`; o único consumidor legítimo de POST/DELETE é a página de edição, que sempre envia `editToken`. Agora `canUploadPhotos` exige um `edit_token` válido, não expirado, em pedido já visível publicamente.

Verificado end-to-end: DELETE sem token → 409; DELETE com token válido → passa da auth (404 por foto inexistente). POST usa a mesma guarda.

---

## ✅ ~~A4. Ausência de rate limiting em endpoints públicos e caros~~ (corrigido em 2026-07-15)

**Arquivos:** [src/lib/rate-limit.ts](src/lib/rate-limit.ts) (novo), [src/app/api/checkout/core/route.ts](src/app/api/checkout/core/route.ts), [src/app/api/youtube/search/route.ts](src/app/api/youtube/search/route.ts), [src/app/api/youtube/validate/route.ts](src/app/api/youtube/validate/route.ts), [src/app/api/admin/login/route.ts](src/app/api/admin/login/route.ts)

- `POST /api/checkout/core`: qualquer um podia criar pedidos ilimitados, cada um com até 6 fotos de 5 MB processadas pelo sharp e gravadas no Storage → abuso de custo/DoS. A limpeza só roda após 7 dias.
- `GET /api/youtube/search` e `POST /api/youtube/validate`: proxies sem auth para a YouTube API — terceiros podiam drenar a quota da `YOUTUBE_API_KEY`.
- `POST /api/admin/login`: sem proteção própria contra brute force.

**Correção aplicada:** criado um rate limiter fixed-window por IP (`src/lib/rate-limit.ts`, sem dependências) e aplicado:
- login admin: 5 tentativas / 5 min
- checkout: 10 pedidos / hora
- youtube search e validate: 30 req / min cada

Verificado: a 6ª tentativa de login no mesmo IP retorna **429** com `Retry-After`.

> **Limitação conhecida:** o estado é em memória e por instância — em serverless (Vercel) não é um teto global rígido (cold starts zeram a contagem). É uma barreira barata contra brute force/abuso trivial. Para um limite global e durável, trocar o store por Upstash/Vercel KV mantendo a mesma interface. Considerar também Turnstile/hCaptcha no checkout.

---

## 🟠 A5. Proteção contra senhas vazadas desabilitada no Supabase Auth — MITIGADO no plano Free

**Fonte:** Supabase security advisor (WARN).

O login do admin usa e-mail/senha do Supabase Auth. A checagem contra HaveIBeenPwned (*"Prevent use of leaked passwords"*) **só está disponível no plano Pro** — o projeto está no plano Free, então esse toggle específico não pode ser ativado sem upgrade.

**Contexto de risco:** o único login por senha é o do admin, uma conta criada manualmente (`scripts/create-admin.mjs`) cuja senha é controlada pelo operador. O valor da checagem HaveIBeenPwned é maior para cadastro público de usuários, que este app não possui.

**Mitigação aplicada no painel (plano Free), decisão do dono do projeto em 2026-07-15:**
- Minimum password length: 6 → **12**.
- Password requirements: exigir maiúsculas + minúsculas + dígitos + símbolos.
- Secure password change: **ligado** (exige login recente para trocar senha).
- Require current password when updating: **ligado**.
- MFA/TOTP: **deixado como follow-up** (decisão do dono, 2026-07-15). O toggle do painel sozinho não protege — exige implementação de código (fluxo de cadastro TOTP, verificação no login e enforcement de AAL2 no `requireAdmin`). Justificativa: admin único, login já coberto por rate limit + senha forte + cookies httpOnly/secure + revogação de sessão no logout.

**Follow-up:** se um dia habilitar cadastro público de usuários, migrar para Pro e ligar o *"Prevent use of leaked passwords"* ([doc](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)).

---

## ✅ ~~A6. Cron aceita o secret via query string~~ (corrigido em 2026-07-15)

**Arquivo:** [src/app/api/cron/cleanup-drafts/route.ts](src/app/api/cron/cleanup-drafts/route.ts)

`?secret=` acabava em logs de acesso e histórico. O Vercel Cron já envia `Authorization: Bearer`.

**Correção aplicada:** removido o fallback de query string — a rota só aceita `Authorization: Bearer <CRON_SECRET>`. Verificado: `?secret=` → **401**, header Bearer → **200**, sem auth → **401**.

---

## ✅ ~~A7. Comparações de segredo não são constant-time~~ (corrigido em 2026-07-15)

**Arquivos:** [src/lib/timing-safe.ts](src/lib/timing-safe.ts) (novo), [src/lib/cakto.ts](src/lib/cakto.ts), [src/app/api/cron/cleanup-drafts/route.ts](src/app/api/cron/cleanup-drafts/route.ts)

`body.secret !== expected` e `secret !== expected` eram comparações de string comuns (timing attack teórico, risco prático baixo).

**Correção aplicada:** criado `safeEqual()` (SHA-256 + `crypto.timingSafeEqual`, tolerante a tamanhos diferentes e a valores vazios) e usado tanto na verificação do secret do webhook Cakto quanto no cron. Verificado por teste unitário (iguais → true, diferentes/vazios → false).

---

## ✅ ~~A8. Proxy de fotos: validação de path fraca~~ (parcialmente corrigido em 2026-07-15)

**Arquivo:** [src/app/api/drafts/[id]/photos/signed/route.ts](src/app/api/drafts/[id]/photos/signed/route.ts)

- A checagem `path.startsWith(`${id}/`)` não rejeitava `..` (ex.: `{id}/../{outro}/x.webp`).

**Correção aplicada:** o proxy agora rejeita paths contendo `..` ou `//` além de exigir o prefixo `{id}/`. Verificado: um path com `..` retorna **400**.

> **Observação (baixo risco, deixado como está):** fotos de pedidos em `draft`/`pending_payment` ainda são servidas por esse GET sem token. Nenhum fluxo legítimo exibe fotos de rascunho (o wizard usa previews locais no navegador; páginas públicas e de edição só mostram pedidos pagos), e o acesso exige adivinhar dois UUIDs aleatórios (o do pedido + o do arquivo). Pode ser endurecido depois restringindo o GET a `isPubliclyVisible`.

---

## ✅ ~~A9. Logout não revoga a sessão no Supabase~~ (corrigido em 2026-07-15)

**Arquivo:** [src/app/api/admin/logout/route.ts](src/app/api/admin/logout/route.ts)

Só limpava os cookies; o access/refresh token continuavam válidos no servidor (access por ~1 h, refresh por 30 dias se tivesse sido copiado).

**Correção aplicada:** o logout agora monta o client autenticado (`createAdminAuthClient`) e chama `client.auth.signOut()` — revogando a sessão no servidor — antes de limpar os cookies. Falha no signOut é logada mas não impede a limpeza dos cookies.

---

## ✅ ~~A10. Injeção de filtro PostgREST na busca do admin~~ (corrigido em 2026-07-15)

**Arquivo:** [src/app/api/admin/orders/route.ts](src/app/api/admin/orders/route.ts)

`q` era interpolado direto na string do `.or(\`buyer_email.ilike.%${q}%\`)`. Vírgulas/parênteses no termo de busca alteravam a expressão de filtro (não era SQL injection — o PostgREST parseia com segurança — mas permitia manipular o filtro e gerar erros).

**Correção aplicada:** `q` passa por `replace(/[,()."*\\%]/g, " ")` antes de entrar no `.or(...)`, removendo os metacaracteres da gramática de filtro do PostgREST.

---

## ✅ ~~A11. Sem headers de segurança HTTP~~ (corrigido em 2026-07-15)

**Arquivo:** [next.config.ts](next.config.ts)

Não havia `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` etc. O admin podia ser embutido em iframe de terceiros (clickjacking).

**Correção aplicada:** adicionado `headers()` aplicando a todas as rotas: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` e `Permissions-Policy: camera=(), microphone=(), geolocation=()`. Verificado (headers presentes na resposta) e a página `/p` do casal continua renderizando o embed do YouTube sem erros.

> **Não incluído (follow-up):** uma CSP completa (`Content-Security-Policy`) foi deixada de fora porque a página `/p` injeta o iframe do YouTube e o Next usa estilos/scripts inline — uma CSP restritiva quebraria isso e exige tuning dedicado (liberar `youtube.com`/`ytimg.com`, `nonce` para inline). `X-Frame-Options: DENY` já cobre o clickjacking no curto prazo.

---

## ✅ ~~A12. `youtubeThumbnail` aceita URL arbitrária~~ (corrigido em 2026-07-15)

**Arquivo:** [src/lib/validations.ts](src/lib/validations.ts)

`z.string().url()` permitia qualquer origem. A URL fica no banco e pode ser renderizada como `<img>` (wizard/e-mails) → pixel de tracking ou conteúdo indesejado.

**Correção aplicada:** criado o validador `youtubeThumbnailUrl` (refine sobre o host: só `img.youtube.com`, `ytimg.com` ou subdomínios `*.ytimg.com`), aplicado no `draftUpdateSchema` e no `checkoutSubmitSchema`. Verificado por teste unitário: URL do `i.ytimg.com` aceita, `evil.com` rejeitada.

---

## ✅ Pontos verificados e considerados OK

- **Segredos:** nenhum segredo hardcoded em `src/` ou `scripts/`; `.env.local` está corretamente fora do git (`.gitignore` cobre `.env` e `.env*.local`; nenhum `.env` no histórico); `.mcp.json` também ignorado.
- **RLS:** habilitado em todas as tabelas sem policies = *deny-all* para a anon key; todo acesso passa pelo service role no servidor. (Os avisos "RLS Enabled No Policy" do advisor são INFO e refletem esse desenho intencional.)
- **Service role key:** usada apenas em módulos server-side (`src/lib/supabase/admin.ts`); nenhum import em Client Components.
- **Rotas admin:** `/api/admin/orders` (GET/POST) exige `requireAdmin()` (sessão Supabase + linha em `admin_users`); as páginas `/admin/*` são client components que só obtêm dados dessa API protegida.
- **Cookies de sessão:** `httpOnly`, `secure` em produção, `sameSite: lax` — CSRF em POST mitigado (Lax não envia cookie em POST cross-site).
- **XSS:** nenhum `dangerouslySetInnerHTML`/`eval`; tudo renderizado via JSX (escapado). `videoId` só entra no player oficial do YouTube via API (não em HTML cru).
- **Upload de fotos:** limite de 5 MB e MIME allowlist, e o sharp re-encoda tudo para WebP — arquivos maliciosos não sobrevivem ao pipeline; nome de destino é UUID gerado no servidor.
- **Validação de entrada:** Zod `.strict()` nos PATCHes; `draftPatchToRow` faz allowlist explícita de colunas (sem mass assignment).
- **Webhook idempotente:** `fulfillCore`/`markUpsellPaid`/`markDownsellPaid` são idempotentes por `payment_id` e não regridem status.
- **Buckets de Storage privados** com signed URLs de 1 h.

---

## Progresso das correções

- ✅ **A1** — log do secret do webhook (corrigido, verificado).
- ✅ **A2** — sucesso não expõe mais edit_token/e-mail + `buyerEmail` bloqueado no edit link (corrigido, verificado).
- ✅ **A3** — rotas de foto agora exigem `edit_token` válido (corrigido, verificado).
- ✅ **A4** — rate limiting por IP em login/checkout/youtube (corrigido, verificado; ver limitação in-memory).
- 🟡 **A5** — leaked password protection é Pro-only; **mitigado no plano Free** com min length 12 + requisitos de senha + secure password change + require current password (aplicado no painel em 2026-07-15).
- ✅ **A8** — path traversal do proxy de fotos bloqueado (corrigido, verificado).

- ✅ **A6** — cron só aceita `Authorization: Bearer` (corrigido, verificado).
- ✅ **A7** — comparações de segredo constant-time via `safeEqual` (corrigido, verificado).
- ✅ **A9** — logout revoga a sessão no Supabase (corrigido).
- ✅ **A10** — busca do admin sanitiza metacaracteres do PostgREST (corrigido).
- ✅ **A11** — headers de segurança HTTP globais (corrigido, verificado; CSP completa fica como follow-up).
- ✅ **A12** — `youtubeThumbnail` restrito aos hosts do YouTube (corrigido, verificado).

### Hardening extra no painel do Supabase (2026-07-15)

- **Política de senha do admin** reforçada (ver A5): min length 12, requisitos de caractere, secure password change, require current password.
- **Signup público desligado** (User Signups → "Allow new users to sign up" = off): o app não tem cadastro público — o único usuário do Auth é o admin, criado via service role (`scripts/create-admin.mjs`), que ignora esse toggle. Confirmado no código que só há `signInWithPassword`, nenhum `signUp`.
- **MFA/TOTP**: follow-up — exige implementação de código (ver A5).

### Itens que permanecem como follow-up (não são bugs abertos)

- **A5** — se abrir cadastro público de usuários, migrar para Pro e ligar o *leaked password protection* nativo (hoje mitigado no Free).
- **MFA/TOTP** — implementar 2º fator no login do admin (fluxo de cadastro + login com código + AAL2 no `requireAdmin`).
- **A8** — endurecer o GET de fotos para `isPubliclyVisible` (opcional, baixo risco).
- **A2** — token efêmero próprio para a página de sucesso (opcional).
- **A11** — CSP completa com allowlist do YouTube (opcional).
- **A4** — trocar o rate limiter in-memory por Upstash/Vercel KV para teto global.
