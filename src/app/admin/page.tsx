"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Row = {
  id: string;
  public_id: string;
  status: string;
  buyer_email: string | null;
  name1: string | null;
  name2: string | null;
  created_at: string;
};

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/orders");
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error ?? "Erro");
        return;
      }
      setOrders(j.orders ?? []);
    })();
  }, [router]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold text-wine-deep">
        Pedidos
      </h1>
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
                </td>
                <td className="py-2 pr-3">{o.buyer_email ?? "—"}</td>
                <td className="py-2 pr-3 text-muted-foreground">
                  {new Date(o.created_at).toLocaleString("pt-BR")}
                </td>
                <td className="py-2 text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/pedidos/${o.id}`}>Abrir</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && !error ? (
          <p className="mt-6 text-muted-foreground">Nenhum pedido ainda.</p>
        ) : null}
      </div>
    </div>
  );
}
