"use client";

import { useEffect, useState } from "react";

type Props = {
  text: string;
  targetAt?: string | null;
};

function formatRemaining(ms: number) {
  if (ms <= 0) return null;
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function PromoBanner({ text, targetAt }: Props) {
  const [remaining, setRemaining] = useState<string | null>(null);

  useEffect(() => {
    if (!targetAt) return;
    const target = new Date(targetAt).getTime();
    const tick = () => setRemaining(formatRemaining(target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetAt]);

  if (targetAt && remaining === null) return null;

  return (
    <div className="border-b border-wine/20 bg-wine text-cream">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2.5 text-center text-sm">
        <span>{text}</span>
        {remaining ? (
          <span className="font-medium tabular-nums tracking-wide">
            · termina em {remaining}
          </span>
        ) : null}
      </div>
    </div>
  );
}
