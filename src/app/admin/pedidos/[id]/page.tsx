"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Order = {
  id: string;
  public_id: string;
  status: string;
  buyer_email: string | null;
  name1: string | null;
  name2: string | null;
  message: string | null;
  qr_storage_path: string | null;
  polaroid_pdf_path: string | null;
  letter_pdf_path: string | null;
  edit_token: string | null;
  mp_payment_upsell_id: string | null;
  physical_shipping: unknown;
  physical_shipped_at: string | null;
};

export default function AdminPedidoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [assets, setAssets] = useState<Record<string, string | null>>({});
  const [name1, setName1] = useState("");
  const [name2, setName2] = useState("");
  const [message, setMessage] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const ACTION_LABELS: Record<string, string> = {
    fulfill: "Pedido marcado como pago.",
    resend_email: "E-mail reenviado com sucesso.",
    regenerate: "Assets regenerados com sucesso.",
    update_order: "Conteúdo salvo.",
    mark_shipped: "Marcado como enviado.",
  };

  async function load() {
    const res = await fetch(`/api/admin/orders?id=${id}`);
    if (res.status === 401) {
      router.replace("/admin/login");
      return null;
    }
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(j.error ?? "Erro");
      return null;
    }
    setOrder(j.order);
    setAssets(j.assets ?? {});
    setName1(j.order.name1 ?? "");
    setName2(j.order.name2 ?? "");
    setMessage(j.order.message ?? "");
    return j as { order: Order; assets: Record<string, string | null> };
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 4000);
    return () => clearTimeout(t);
  }, [msg]);

  async function act(action: string, extra?: Record<string, unknown>) {
    setMsg(null);
    setError(null);
    setPending(action);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, orderId: id, ...extra }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error ?? "Falha");
        return;
      }
      setMsg(ACTION_LABELS[action] ?? "Feito.");
      await load();
    } finally {
      setPending(null);
    }
  }

  /**
   * Gera (se preciso) e abre o PDF de polaroids pra QUALQUER pedido, mesmo
   * quem comprou só o core sem upsell/downsell — normalmente o PDF só é
   * gerado pra quem pagou o extra.
   */
  async function downloadPolaroidPdf() {
    setMsg(null);
    setError(null);
    setPending("polaroid_pdf");
    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "regenerate", orderId: id, force: true }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error ?? "Falha ao gerar PDF.");
        return;
      }
      const fresh = await load();
      const url = fresh?.assets?.polaroid;
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
        setMsg("PDF de polaroids pronto — abrindo em nova aba.");
      } else {
        setError("PDF gerado, mas o link não veio. Tente de novo.");
      }
    } finally {
      setPending(null);
    }
  }

  if (!order && !error) {
    return <p className="text-muted-foreground">Carregando…</p>;
  }
  if (!order) {
    return <p className="text-destructive">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-wine-deep">
            Pedido
          </h1>
          <p className="font-mono text-xs text-muted-foreground">{order.id}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin">Voltar</Link>
        </Button>
      </div>

      <p>
        Status: <strong>{order.status}</strong> ·{" "}
        <a
          className="text-wine underline"
          href={`/p/${order.public_id}`}
          target="_blank"
          rel="noreferrer"
        >
          Abrir página
        </a>
        {order.edit_token ? (
          <>
            {" "}
            ·{" "}
            <a
              className="text-wine underline"
              href={`/editar/${order.edit_token}`}
              target="_blank"
              rel="noreferrer"
            >
              Link editar
            </a>
          </>
        ) : null}
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          className="bg-wine text-cream"
          disabled={pending !== null}
          onClick={() => void act("fulfill")}
        >
          {pending === "fulfill" ? <Loader2 className="size-4 animate-spin" /> : null}
          Marcar pago (core)
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending !== null}
          onClick={() => void act("resend_email")}
        >
          {pending === "resend_email" ? <Loader2 className="size-4 animate-spin" /> : null}
          Reenviar e-mail
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending !== null}
          onClick={() => void act("regenerate")}
        >
          {pending === "regenerate" ? <Loader2 className="size-4 animate-spin" /> : null}
          Regenerar assets
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending !== null}
          onClick={() => void downloadPolaroidPdf()}
        >
          {pending === "polaroid_pdf" ? <Loader2 className="size-4 animate-spin" /> : null}
          Baixar PDF polaroids
        </Button>
      </div>

      {msg ? (
        <p className="flex items-center gap-2 rounded-md border border-emerald-600/30 bg-emerald-600/10 px-3 py-2 text-sm font-medium text-emerald-700">
          <span aria-hidden>✓</span> {msg}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="space-y-3 rounded-lg border border-wine/15 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Nome 1</Label>
            <Input value={name1} onChange={(e) => setName1(e.target.value)} />
          </div>
          <div>
            <Label>Nome 2</Label>
            <Input value={name2} onChange={(e) => setName2(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Mensagem</Label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
        <Button
          disabled={pending !== null}
          onClick={() =>
            void act("update_order", {
              patch: { name1, name2, message },
            })
          }
        >
          {pending === "update_order" ? <Loader2 className="size-4 animate-spin" /> : null}
          Salvar conteúdo
        </Button>
      </div>

      <div className="space-y-2 text-sm">
        {assets.qr ? (
          <p>
            <a href={assets.qr} className="text-wine underline" target="_blank" rel="noreferrer">
              Baixar QR
            </a>
          </p>
        ) : null}
        {assets.polaroid ? (
          <p>
            <a
              href={assets.polaroid}
              className="text-wine underline"
              target="_blank"
              rel="noreferrer"
            >
              Baixar polaroids PDF
            </a>
          </p>
        ) : null}
        {assets.letter ? (
          <p>
            <a
              href={assets.letter}
              className="text-wine underline"
              target="_blank"
              rel="noreferrer"
            >
              Baixar carta PDF
            </a>
          </p>
        ) : null}
      </div>

      {order.mp_payment_upsell_id ? (
        <div className="space-y-2 rounded-lg border border-wine/15 p-4">
          <p className="font-medium text-wine-deep">
            📦 Upsell físico (polaroids + carta impressas)
          </p>
          {order.physical_shipped_at ? (
            <p className="text-sm text-muted-foreground">
              Enviado em{" "}
              {new Date(order.physical_shipped_at).toLocaleString("pt-BR")}
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Baixe os PDFs acima, imprima e envie pelo correio. Endereço
                recebido da Cakto:
              </p>
              <pre className="overflow-x-auto rounded bg-cream-deep/40 p-3 text-xs">
                {JSON.stringify(order.physical_shipping ?? {}, null, 2)}
              </pre>
              <Button
                size="sm"
                disabled={pending !== null}
                onClick={() => void act("mark_shipped")}
              >
                {pending === "mark_shipped" ? <Loader2 className="size-4 animate-spin" /> : null}
                Marcar como enviado
              </Button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
