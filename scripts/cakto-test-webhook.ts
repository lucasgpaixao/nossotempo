import fs from "fs";

/**
 * Dispara um evento de teste (`purchase_approved` por padrão) direto do
 * painel da Cakto pro nosso webhook configurado — sem precisar de uma
 * compra real. Depois busca o histórico do disparo (payload bruto + resposta
 * do nosso servidor) pra conferir o formato do campo `address`.
 *
 * Requer client_id/client_secret gerados em
 * https://app.cakto.com.br/dashboard/cakto-api (Integrações → Cakto API →
 * "Criar Chave de API") salvos em .env.local como CAKTO_CLIENT_ID /
 * CAKTO_CLIENT_SECRET.
 *
 * Uso:
 *   npx tsx scripts/cakto-test-webhook.ts [event_id]
 *   (default event_id = purchase_approved)
 *
 * Estado conhecido (2026-07-15): `GET /public_api/webhook/` retorna
 * `{count: 0, results: []}` mesmo com token válido (escopo "read webhooks"
 * confirmado) — o webhook criado pelo painel (Integrações → Webhooks) não
 * aparece nesse endpoint, motivo não identificado. Isso faz `listWebhooks()`
 * nunca achar o app e o script falhar em "Nenhum webhook configurado".
 * Caminho que funcionou nesse meio tempo: usar o botão "Enviar evento de
 * teste" no próprio painel (três pontinhos no webhook) e ler o payload nos
 * logs do Vercel (nosso webhook já loga o body bruto quando falta `sck`).
 */

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")];
    }),
);
for (const [k, v] of Object.entries(env)) {
  process.env[k] = v;
}

const API_BASE = "https://api.cakto.com.br/public_api";
const eventId = process.argv[2] ?? "purchase_approved";

async function getAccessToken(): Promise<string> {
  const clientId = process.env.CAKTO_CLIENT_ID;
  const clientSecret = process.env.CAKTO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Faltam CAKTO_CLIENT_ID / CAKTO_CLIENT_SECRET no .env.local. Gere em " +
        "https://app.cakto.com.br/dashboard/cakto-api (Integrações → Cakto API → Criar Chave de API).",
    );
  }
  const res = await fetch(`${API_BASE}/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret }),
  });
  if (!res.ok) {
    throw new Error(`Falha ao obter token (${res.status}): ${await res.text()}`);
  }
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

type WebhookApp = { id: number; status: string; name: string; url: string };

async function listWebhooks(token: string): Promise<WebhookApp[]> {
  const res = await fetch(`${API_BASE}/webhook/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Falha ao listar webhooks (${res.status}): ${await res.text()}`);
  }
  const json = (await res.json()) as { count: number; results: WebhookApp[] };
  return json.results;
}

async function triggerTestEvent(token: string, appId: number, event: string) {
  const res = await fetch(
    `${API_BASE}/webhook/event_test/${appId}/?event_id=${encodeURIComponent(event)}`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` } },
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Falha ao disparar evento de teste (${res.status}): ${text}`);
  }
  console.log("Disparo solicitado:", text || `(${res.status})`);
}

type EventHistoryEntry = {
  id: number;
  event_id: string;
  event_name: string;
  event_status: number;
  payload: unknown;
  response: unknown;
  dispatchedAt: string;
};

async function fetchHistory(token: string, appId: number, event: string) {
  const params = new URLSearchParams({
    app_id: String(appId),
    event_id: event,
    ordering: "-dispatchedAt",
    limit: "3",
  });
  const res = await fetch(`${API_BASE}/webhook/event_history/?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Falha ao buscar histórico (${res.status}): ${await res.text()}`);
  }
  const json = (await res.json()) as { results: EventHistoryEntry[] };
  return json.results;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log(`Evento de teste: ${eventId}`);

  const token = await getAccessToken();
  console.log("Token obtido.");

  const webhooks = await listWebhooks(token);
  if (webhooks.length === 0) {
    throw new Error("Nenhum webhook configurado na conta Cakto.");
  }
  const target =
    webhooks.find((w) => w.url.includes("nossotempo")) ?? webhooks[0];
  console.log(`Webhook alvo: #${target.id} · ${target.name} · ${target.url}`);

  await triggerTestEvent(token, target.id, eventId);

  console.log("Aguardando 4s pro disparo aparecer no histórico...");
  await sleep(4000);

  const history = await fetchHistory(token, target.id, eventId);
  if (history.length === 0) {
    console.log("Nenhum histórico encontrado ainda — tente rodar de novo em alguns segundos.");
    return;
  }

  const latest = history[0];
  console.log("\n=== Último disparo ===");
  console.log("dispatchedAt:", latest.dispatchedAt);
  console.log("event_status (HTTP retornado pelo nosso endpoint):", latest.event_status);
  console.log("\nPayload enviado:");
  console.log(JSON.stringify(latest.payload, null, 2));
  console.log("\nResposta do nosso servidor:");
  console.log(JSON.stringify(latest.response, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
