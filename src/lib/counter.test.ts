import { describe, expect, it } from "vitest";
import { diffInParts, formatCoupleNames } from "./counter";

/** Constrói Date a partir de componentes BRT (UTC-3, sem DST desde 2019) */
function brt(y: number, m: number, d: number, h = 0, min = 0, s = 0): Date {
  // America/Sao_Paulo = UTC-3
  return new Date(Date.UTC(y, m - 1, d, h + 3, min, s));
}

describe("diffInParts", () => {
  it("retorna zeros se now < startedAt", () => {
    const started = brt(2024, 6, 15, 12, 0, 0);
    const now = brt(2024, 6, 15, 11, 0, 0);
    expect(diffInParts(started, now)).toEqual({
      years: 0,
      months: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });

  it("conta exatamente 1 ano", () => {
    const started = brt(2023, 3, 10, 0, 0, 0);
    const now = brt(2024, 3, 10, 0, 0, 0);
    expect(diffInParts(started, now)).toEqual({
      years: 1,
      months: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });

  it("empresta dias ao cruzar mês (bissexto)", () => {
    // 31 jan → 1 mar 2024: calendário com empréstimo → 0 meses e 30 dias
    const started = brt(2024, 1, 31, 10, 0, 0);
    const now = brt(2024, 3, 1, 10, 0, 0);
    const parts = diffInParts(started, now);
    expect(parts.years).toBe(0);
    expect(parts.months).toBe(0);
    expect(parts.days).toBe(30);
  });

  it("conta 1 mês e alguns dias sem cruzar dia inválido", () => {
    const started = brt(2024, 1, 15, 10, 0, 0);
    const now = brt(2024, 2, 20, 10, 0, 0);
    expect(diffInParts(started, now)).toMatchObject({
      years: 0,
      months: 1,
      days: 5,
    });
  });

  it("inclui horas minutos segundos", () => {
    const started = brt(2024, 7, 9, 14, 30, 10);
    const now = brt(2024, 7, 9, 16, 35, 25);
    expect(diffInParts(started, now)).toEqual({
      years: 0,
      months: 0,
      days: 0,
      hours: 2,
      minutes: 5,
      seconds: 15,
    });
  });

  it("empresta hora quando minutos negativos", () => {
    const started = brt(2024, 7, 9, 14, 50, 0);
    const now = brt(2024, 7, 9, 16, 10, 0);
    expect(diffInParts(started, now)).toEqual({
      years: 0,
      months: 0,
      days: 0,
      hours: 1,
      minutes: 20,
      seconds: 0,
    });
  });
});

describe("formatCoupleNames", () => {
  it("junta com &", () => {
    expect(formatCoupleNames("Ana", "Bruno")).toBe("Ana & Bruno");
  });
});
