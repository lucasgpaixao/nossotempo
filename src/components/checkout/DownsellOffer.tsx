"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/pricing";

type Props = {
  orderId: string;
  priceCents: number;
};

export function DownsellOffer({ orderId, priceCents }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/downsell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Falha");
      window.location.href = j.initPoint;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
      setLoading(false);
    }
  }

  async function decline() {
    setLoading(true);
    try {
      await fetch(`/api/orders/${orderId}/complete`, { method: "POST" });
    } catch {
      /* ignore */
    }
    window.location.href = `/sucesso/${orderId}?offer=done`;
  }

  return (
    <div className="rounded-xl border border-wine/20 bg-card p-6 text-center shadow-sm">
      <p className="text-xs uppercase tracking-[0.2em] text-wine/55">
        Oferta especial
      </p>
      <h2 className="font-heading mt-2 text-2xl font-semibold text-wine-deep">
        Carta personalizada
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        PDF A4 com a mensagem de vocês e o QR — um cartão para imprimir e
        entregar junto com o presente.
      </p>
      <p className="mt-4 font-heading text-xl text-wine">
        {formatBRL(priceCents)}
      </p>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      <div className="mt-6 flex flex-col gap-2">
        <Button
          className="bg-wine text-cream hover:bg-wine-deep"
          disabled={loading}
          onClick={() => void accept()}
        >
          Quero a carta
        </Button>
        <Button variant="ghost" disabled={loading} onClick={() => void decline()}>
          Não, obrigado
        </Button>
      </div>
    </div>
  );
}
