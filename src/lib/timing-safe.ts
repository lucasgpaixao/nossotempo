import { createHash, timingSafeEqual } from "crypto";

/**
 * Compara dois segredos em tempo constante. Passa por SHA-256 antes de
 * `timingSafeEqual` para (a) igualar o tamanho dos buffers (o timingSafeEqual
 * lança se os comprimentos diferem) e (b) não vazar o tamanho do segredo pelo
 * timing. Retorna false se algum valor for vazio/undefined.
 */
export function safeEqual(a: string | undefined | null, b: string | undefined | null): boolean {
  if (!a || !b) return false;
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}
