"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PAGE_SIZE = 20;

type Row = {
  id: string;
  public_id: string;
  status: string;
  buyer_email: string | null;
  name1: string | null;
  name2: string | null;
  created_at: string;
  mp_payment_upsell_id: string | null;
  physical_shipped_at: string | null;
};

const STATUS_OPTIONS = [
  "draft",
  "pending_payment",
  "core_paid",
  "upsell_offered",
  "upsell_paid",
  "downsell_offered",
  "downsell_paid",
  "completed",
  "cancelled",
] as const;

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(
    async (signal: AbortSignal) => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (q) params.set("q", q);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      const res = await fetch(`/api/admin/orders?${params.toString()}`, {
        signal,
      });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error ?? "Erro");
        return;
      }
      setError(null);
      setOrders(j.orders ?? []);
      setTotal(j.total ?? 0);
    },
    [router, status, from, to, q, page],
  );

  useEffect(() => {
    setPage(1);
  }, [status, from, to, q]);

  useEffect(() => {
    const controller = new AbortController();
    const t = setTimeout(() => {
      void load(controller.signal).catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        throw e;
      });
    }, 300);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [load]);

  async function deleteOrder(id: string, label: string) {
    if (
      !window.confirm(
        `Apagar o pedido "${label}" permanentemente? Isso remove o registro e os arquivos (fotos/QR/PDFs). Não pode ser desfeito.`,
      )
    ) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_order", orderId: id }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error ?? "Falha ao apagar.");
        return;
      }
      setError(null);
      const controller = new AbortController();
      await load(controller.signal);
    } finally {
      setDeletingId(null);
    }
  }

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold text-wine-deep">
        Pedidos
      </h1>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="filter-status">Status</Label>
          <select
            id="filter-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
          >
            <option value="">Todos</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="filter-from">De</Label>
          <Input
            id="filter-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="filter-to">Até</Label>
          <Input
            id="filter-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="filter-q">Nome ou e-mail</Label>
          <Input
            id="filter-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar…"
          />
        </div>
      </div>

      {error ? <p className="mt-4 text-destructive">{error}</p> : null}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-wine/20 text-muted-foreground">
            <tr>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Nomes</th>
              <th className="py-2 pr-3">E-mail</th>
              <th className="py-2 pr-3">Criado</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-wine/10">
                <td className="py-2 pr-3 font-mono text-xs">{o.status}</td>
                <td className="py-2 pr-3">
                  {o.name1 && o.name2 ? `${o.name1} & ${o.name2}` : "—"}
                  {o.mp_payment_upsell_id && !o.physical_shipped_at ? (
                    <span className="ml-2 rounded bg-wine/10 px-1.5 py-0.5 text-xs text-wine">
                      📦 enviar
                    </span>
                  ) : null}
                </td>
                <td className="py-2 pr-3">{o.buyer_email ?? "—"}</td>
                <td className="py-2 pr-3 text-muted-foreground">
                  {new Date(o.created_at).toLocaleString("pt-BR")}
                </td>
                <td className="py-2 text-right">
                  <div className="flex justify-end gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/pedidos/${o.id}`}>Abrir</Link>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={deletingId !== null}
                      onClick={() =>
                        void deleteOrder(
                          o.id,
                          o.name1 && o.name2
                            ? `${o.name1} & ${o.name2}`
                            : (o.buyer_email ?? o.id),
                        )
                      }
                    >
                      {deletingId === o.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      Apagar
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && !error ? (
          <p className="mt-6 text-muted-foreground">Nenhum pedido ainda.</p>
        ) : null}
      </div>

      {total > 0 ? (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <p>
            {total} pedido{total === 1 ? "" : "s"} · página {page} de {lastPage}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= lastPage}
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            >
              Próxima
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
