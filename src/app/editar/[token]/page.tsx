"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CouplePageView } from "@/components/couple-page/CouplePageView";
import { cn } from "@/lib/utils";

const MAX_PHOTOS = 6;

type Order = {
  id: string;
  public_id: string;
  name1: string | null;
  name2: string | null;
  started_at: string | null;
  message: string | null;
  youtube_video_id: string | null;
  youtube_title: string | null;
  youtube_thumbnail: string | null;
  edit_expires_at: string | null;
};

type Photo = { id: string; storage_path: string; sort_order: number };

function splitStartedAt(iso: string | null) {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(d).map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

export default function EditarClient() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [order, setOrder] = useState<Order | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const [name1, setName1] = useState("");
  const [name2, setName2] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [message, setMessage] = useState("");
  const [ytId, setYtId] = useState("");
  const [ytTitle, setYtTitle] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/edit/${token}`);
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Link inválido");
      setOrder(j.order);
      setPhotos(j.photos ?? []);
      setName1(j.order.name1 ?? "");
      setName2(j.order.name2 ?? "");
      const st = splitStartedAt(j.order.started_at);
      setDate(st.date);
      setTime(st.time === "00:00" ? "" : st.time);
      setMessage(j.order.message ?? "");
      setYtId(j.order.youtube_video_id ?? "");
      setYtTitle(j.order.youtube_title ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const photoUrls = useMemo(
    () =>
      photos.map((p) => ({
        src: `/api/drafts/${order?.id}/photos/signed?path=${encodeURIComponent(p.storage_path)}`,
        alt: `${name1} & ${name2}`,
      })),
    [photos, order?.id, name1, name2],
  );

  async function save() {
    if (!order) return;
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      const res = await fetch(`/api/edit/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name1,
          name2,
          startedDate: date,
          startedTime: time || null,
          message,
          youtubeVideoId: ytId || null,
          youtubeTitle: ytTitle || null,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Falha ao salvar");
      setOrder(j.order);
      setOk(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setSaving(false);
    }
  }

  async function onUpload(files: File[]) {
    if (!order || files.length === 0) return;
    const remaining = MAX_PHOTOS - photos.length;
    const toUpload = files.slice(0, remaining);
    const skipped = files.length - toUpload.length;

    setUploadingPhoto(true);
    setError(
      skipped > 0
        ? `Só cabem mais ${remaining} foto(s); ${skipped} não foi(ram) enviada(s).`
        : null,
    );
    try {
      for (const file of toUpload) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(
          `/api/drafts/${order.id}/photos?editToken=${encodeURIComponent(token)}`,
          { method: "POST", body: fd },
        );
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(j.error ?? "Falha no upload");
          return;
        }
        setPhotos((p) => [...p, j.photo]);
      }
    } catch {
      setError("Falha ao enviar as fotos. Tente de novo.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function removePhoto(photoId: string) {
    if (!order) return;
    const res = await fetch(
      `/api/drafts/${order.id}/photos?photoId=${photoId}&editToken=${encodeURIComponent(token)}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Falha ao remover");
      return;
    }
    setPhotos((p) => p.filter((x) => x.id !== photoId));
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-full max-w-lg items-center justify-center px-6">
        <p className="text-muted-foreground">Carregando…</p>
      </main>
    );
  }

  if (error && !order) {
    return (
      <main className="mx-auto flex min-h-full max-w-lg flex-col items-center justify-center px-6 text-center">
        <h1 className="font-heading text-2xl text-wine-deep">Link inválido</h1>
        <p className="mt-2 text-muted-foreground">{error}</p>
        <Button asChild className="mt-6">
          <Link href="/">Início</Link>
        </Button>
      </main>
    );
  }

  if (!order) return null;

  const expires = order.edit_expires_at
    ? new Date(order.edit_expires_at).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      })
    : "";

  return (
    <main className="mx-auto w-full max-w-lg px-6 py-10">
      <p className="text-xs uppercase tracking-[0.25em] text-wine/55">
        Nosso Tempo · Edição
      </p>
      <h1 className="font-heading mt-2 text-3xl font-semibold text-wine-deep">
        Editar página
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Válido até {expires}. Alterações regeneram QR/PDFs se existirem.
      </p>

      <div className="mt-8 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="n1">Nome 1</Label>
            <Input id="n1" value={name1} onChange={(e) => setName1(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="n2">Nome 2</Label>
            <Input id="n2" value={name2} onChange={(e) => setName2(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="time">Hora (opcional)</Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="msg">Mensagem</Label>
          <Textarea
            id="msg"
            value={message}
            maxLength={500}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
          />
        </div>
        <div className="space-y-3">
          <Label>
            Fotos ({photos.length}/{MAX_PHOTOS})
          </Label>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            disabled={photos.length >= MAX_PHOTOS || uploadingPhoto}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length) void onUpload(files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={photos.length >= MAX_PHOTOS || uploadingPhoto}
            onClick={() => photoInputRef.current?.click()}
            className={cn(
              "flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
              photos.length >= MAX_PHOTOS || uploadingPhoto
                ? "cursor-not-allowed border-wine/15 bg-cream-deep/40 text-muted-foreground"
                : "border-wine/45 bg-wine/5 text-wine-deep hover:border-wine hover:bg-wine/10",
            )}
          >
            {uploadingPhoto ? (
              <>
                <Loader2 className="size-8 animate-spin text-wine" aria-hidden />
                <span className="text-sm font-medium text-wine-deep">
                  Enviando fotos…
                </span>
              </>
            ) : (
              <>
                <span className="flex size-12 items-center justify-center rounded-full bg-wine text-cream shadow-sm">
                  <ImagePlus className="size-6" aria-hidden />
                </span>
                <span className="text-base font-semibold">
                  {photos.length >= MAX_PHOTOS
                    ? `Limite de ${MAX_PHOTOS} fotos atingido`
                    : "Escolher fotos"}
                </span>
                {photos.length < MAX_PHOTOS ? (
                  <span className="text-sm text-muted-foreground">
                    Toque aqui para selecionar uma ou mais imagens
                  </span>
                ) : null}
              </>
            )}
          </button>
          <ul className="space-y-2">
            {photos.map((p, i) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-md bg-cream-deep/60 px-3 py-2 text-sm"
              >
                <span className="truncate">Foto {i + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={uploadingPhoto}
                  onClick={() => void removePhoto(p.id)}
                >
                  Remover
                </Button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <Label htmlFor="yt">YouTube video ID (opcional)</Label>
          <Input
            id="yt"
            value={ytId}
            onChange={(e) => setYtId(e.target.value)}
            placeholder="dQw4w9WgXcQ"
          />
          <Input
            className="mt-2"
            value={ytTitle}
            onChange={(e) => setYtTitle(e.target.value)}
            placeholder="Título da música"
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {ok ? (
          <p className="text-sm text-wine">Salvo. PDFs regenerados se havia extras.</p>
        ) : null}

        <Button
          className="w-full bg-wine text-cream hover:bg-wine-deep"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? "Salvando…" : "Salvar alterações"}
        </Button>

        <Button asChild variant="outline" className="w-full">
          <Link href={`/p/${order.public_id}`} target="_blank">
            Ver página pública
          </Link>
        </Button>
      </div>

      {name1 && name2 && date && message && photoUrls.length > 0 ? (
        <div className="mt-10 overflow-hidden rounded-xl border border-wine/15">
          <CouplePageView
            preview
            data={{
              name1,
              name2,
              startedAt: new Date(`${date}T${time || "00:00"}:00-03:00`).toISOString(),
              message,
              photos: photoUrls,
              youtubeVideoId: ytId || null,
              youtubeTitle: ytTitle || null,
            }}
          />
        </div>
      ) : null}
    </main>
  );
}
