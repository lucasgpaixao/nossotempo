"use client";

import { useEffect, useState } from "react";
import { type CounterParts, diffInParts } from "@/lib/counter";
import { cn } from "@/lib/utils";

type Props = {
  startedAt: string | Date;
  className?: string;
};

const LABELS: { key: keyof CounterParts; label: string }[] = [
  { key: "years", label: "Anos" },
  { key: "months", label: "Meses" },
  { key: "days", label: "Dias" },
  { key: "hours", label: "Horas" },
  { key: "minutes", label: "Min" },
  { key: "seconds", label: "Seg" },
];

export function RelationshipCounter({ startedAt, className }: Props) {
  // Chave primitiva e estável p/ dependência do effect — `new Date(...)` teria
  // uma referência nova a cada render e causaria loop infinito de re-render.
  const startedAtKey =
    startedAt instanceof Date ? startedAt.getTime() : startedAt;
  const [parts, setParts] = useState<CounterParts>(() =>
    diffInParts(
      typeof startedAt === "string" ? new Date(startedAt) : startedAt,
      new Date(),
    ),
  );

  useEffect(() => {
    const start = typeof startedAt === "string" ? new Date(startedAt) : startedAt;
    const tick = () => setParts(diffInParts(start, new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAtKey]);

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6",
        className,
      )}
    >
      {LABELS.map(({ key, label }) => (
        <div
          key={key}
          className="flex flex-col items-center justify-center rounded-lg bg-wine/5 px-3 py-4 text-center"
        >
          <span className="font-heading text-2xl font-semibold tabular-nums text-wine-deep sm:text-3xl">
            {String(parts[key]).padStart(2, "0")}
          </span>
          <span className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
