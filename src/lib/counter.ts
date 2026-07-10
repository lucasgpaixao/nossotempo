export type CounterParts = {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

const BRT = "America/Sao_Paulo";

/** Partes de calendário em America/Sao_Paulo */
function partsInBRT(date: Date) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRT,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const map = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value]),
  );
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function daysInMonth(year: number, month: number): number {
  // month 1-12
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Diferença calendário real entre startedAt e now, interpretados em BRT.
 * Não usa ms/30dias — conta anos/meses/dias de calendário + h/m/s.
 */
export function diffInParts(startedAt: Date, now: Date): CounterParts {
  if (now.getTime() < startedAt.getTime()) {
    return {
      years: 0,
      months: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }

  const start = partsInBRT(startedAt);
  const end = partsInBRT(now);

  let years = end.year - start.year;
  let months = end.month - start.month;
  let days = end.day - start.day;
  let hours = end.hour - start.hour;
  let minutes = end.minute - start.minute;
  let seconds = end.second - start.second;

  if (seconds < 0) {
    seconds += 60;
    minutes -= 1;
  }
  if (minutes < 0) {
    minutes += 60;
    hours -= 1;
  }
  if (hours < 0) {
    hours += 24;
    days -= 1;
  }

  // Empréstimo de dias: volta mês a mês a partir de (end.year, end.month)
  {
    let y = end.year;
    let m = end.month;
    while (days < 0) {
      m -= 1;
      if (m < 1) {
        m = 12;
        y -= 1;
      }
      days += daysInMonth(y, m);
      months -= 1;
    }
  }

  if (months < 0) {
    months += 12;
    years -= 1;
  }

  return { years, months, days, hours, minutes, seconds };
}

export function formatCoupleNames(name1: string, name2: string): string {
  return `${name1.trim()} & ${name2.trim()}`;
}
