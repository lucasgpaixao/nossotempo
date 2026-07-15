import { NextResponse } from "next/server";

/**
 * Rate limiter fixed-window em memória, sem dependências externas.
 *
 * Limitação conhecida: o estado vive no processo. Em serverless (Vercel) cada
 * instância tem o seu próprio mapa e cold starts zeram a contagem, então isto
 * NÃO é um limite global rígido — é uma barreira barata contra brute force e
 * abuso trivial de um mesmo IP. Para um teto global e durável, trocar por um
 * store compartilhado (Upstash/Vercel KV) mantendo a mesma interface.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

function sweep(now: number) {
  // Varredura preguiçosa pra não deixar o mapa crescer sem limite.
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
};

/**
 * @param key  identificador do chamador (ex.: `login:<ip>`)
 * @param limit  máximo de requisições permitidas na janela
 * @param windowMs  tamanho da janela em ms
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { ok: true, remaining: limit - existing.count, retryAfterSec: 0 };
}

/** Extrai o IP do cliente atrás do proxy da Vercel. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Resposta 429 padrão com header Retry-After. */
export function tooManyRequests(retryAfterSec: number) {
  return NextResponse.json(
    { error: "Muitas requisições. Tente novamente em instantes." },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
  );
}
