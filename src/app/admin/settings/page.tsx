"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Settings = {
  priceCoreCents: number;
  priceUpsellCents: number;
  priceDownsellCents: number;
  bannerEnabled: boolean;
  bannerText: string | null;
  bannerTargetAt: string | null;
  supportEmail: string | null;
  supportWhatsapp: string | null;
};

export default function AdminSettingsPage() {
  const router = useRouter();
  const [s, setS] = useState<Settings | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/orders?settings=1");
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error ?? "Erro");
        return;
      }
      setS(j.settings);
    })();
  }, [router]);

  async function save() {
    if (!s) return;
    setMsg(null);
    setError(null);
    const res = await fetch("/api/admin/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_settings", settings: s }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(j.error ?? "Falha");
      return;
    }
    setMsg("Salvo");
  }

  if (!s) {
    return <p className="text-muted-foreground">Carregando…</p>;
  }

  return (
    <div className="max-w-md space-y-4">
      <h1 className="font-heading text-2xl font-semibold text-wine-deep">
        Settings
      </h1>
      <div>
        <Label>Preço core (centavos)</Label>
        <Input
          type="number"
          value={s.priceCoreCents}
          onChange={(e) =>
            setS({ ...s, priceCoreCents: Number(e.target.value) })
          }
        />
      </div>
      <div>
        <Label>Preço upsell (centavos)</Label>
        <Input
          type="number"
          value={s.priceUpsellCents}
          onChange={(e) =>
            setS({ ...s, priceUpsellCents: Number(e.target.value) })
          }
        />
      </div>
      <div>
        <Label>Preço downsell (centavos)</Label>
        <Input
          type="number"
          value={s.priceDownsellCents}
          onChange={(e) =>
            setS({ ...s, priceDownsellCents: Number(e.target.value) })
          }
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={s.bannerEnabled}
          onChange={(e) => setS({ ...s, bannerEnabled: e.target.checked })}
        />
        Banner ativo
      </label>
      <div>
        <Label>Texto do banner</Label>
        <Input
          value={s.bannerText ?? ""}
          onChange={(e) => setS({ ...s, bannerText: e.target.value || null })}
        />
      </div>
      <div>
        <Label>Banner target (ISO)</Label>
        <Input
          value={s.bannerTargetAt ?? ""}
          onChange={(e) =>
            setS({ ...s, bannerTargetAt: e.target.value || null })
          }
          placeholder="2026-12-31T23:59:00-03:00"
        />
      </div>
      <div>
        <Label>E-mail suporte</Label>
        <Input
          value={s.supportEmail ?? ""}
          onChange={(e) => setS({ ...s, supportEmail: e.target.value || null })}
        />
      </div>
      <div>
        <Label>WhatsApp suporte</Label>
        <Input
          value={s.supportWhatsapp ?? ""}
          onChange={(e) =>
            setS({ ...s, supportWhatsapp: e.target.value || null })
          }
          placeholder="5511999999999"
        />
      </div>
      {msg ? <p className="text-sm text-wine">{msg}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button className="bg-wine text-cream" onClick={() => void save()}>
        Salvar
      </Button>
    </div>
  );
}
