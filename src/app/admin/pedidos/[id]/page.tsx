"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

  async function load() {
    const res = await fetch(`/api/admin/orders?id=${id}`);
    if (res.status === 401) {
      router.replace("/admin/login");
      return;
    }
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(j.error ?? "Erro");
      return;
    }
    setOrder(j.order);
    setAssets(j.assets ?? {});
    setName1(j.order.name1 ?? "");
    setName2(j.order.name2 ?? "");
    setMessage(j.order.message ?? "");
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function act(action: string, extra?: Record<string, unknown>) {
    setMsg(null);
    setError(null);
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
    setMsg("OK");
    await load();
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
          onClick={() => void act("fulfill")}
        >
          Marcar pago (core)
        </Button>
        <Button size="sm" variant="outline" onClick={() => void act("resend_email")}>
          Reenviar e-mail
        </Button>
        <Button size="sm" variant="outline" onClick={() => void act("regenerate")}>
          Regenerar assets
        </Button>
      </div>

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
          onClick={() =>
            void act("update_order", {
              patch: { name1, name2, message },
            })
          }
        >
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

      {msg ? <p className="text-sm text-wine">{msg}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
