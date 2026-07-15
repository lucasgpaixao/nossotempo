"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { track } from "@vercel/analytics";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CouplePageView } from "@/components/couple-page/CouplePageView";
import { formatBRL } from "@/lib/format";
import { MESSAGE_TEMPLATES } from "@/lib/message-templates";
import type { Pricing } from "@/lib/pricing";
import { cn } from "@/lib/utils";

const MAX_PHOTOS = 6;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const STEPS = [
  "Nomes",
  "Data",
  "Fotos",
  "Mensagem",
  "Música",
  "Preview",
  "Pagar",
] as const;

type LocalPhoto = { file: File; previewUrl: string };

type YtItem = {
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
};

export default function CriarWizard({ pricing }: { pricing: Pricing }) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name1, setName1] = useState("");
  const [name2, setName2] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [terms, setTerms] = useState(false);

  const [ytQuery, setYtQuery] = useState("");
  const [ytResults, setYtResults] = useState<YtItem[]>([]);
  const [ytSearching, setYtSearching] = useState(false);
  const [ytSelected, setYtSelected] = useState<{
    videoId: string;
    title: string;
    thumbnail: string;
  } | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    track("wizard_start");
  }, []);

  // Revoga os object URLs das fotos ao desmontar, pra não vazar memória.
  useEffect(() => {
    return () => {
      for (const p of photos) URL.revokeObjectURL(p.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ytQuery.trim().length < 2) {
      setYtResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setYtSearching(true);
      try {
        const res = await fetch(
          `/api/youtube/search?q=${encodeURIComponent(ytQuery)}`,
        );
        const j = await res.json();
        setYtResults(j.items ?? []);
      } catch {
        setYtResults([]);
      } finally {
        setYtSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [ytQuery]);

  async function selectVideo(item: YtItem) {
    const res = await fetch("/api/youtube/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId: item.videoId }),
    });
    const j = await res.json();
    if (!res.ok || !j.ok) {
      setError(j.reason ?? "Vídeo não pode ser embutido");
      return;
    }
    setYtSelected({
      videoId: item.videoId,
      title: j.title ?? item.title,
      thumbnail: j.thumbnail ?? item.thumbnail,
    });
  }

  function clearMusic() {
    setYtSelected(null);
  }

  function addPhotos(files: File[]) {
    const remaining = MAX_PHOTOS - photos.length;
    const candidates = files.slice(0, remaining);
    const skipped = files.length - candidates.length;

    const accepted: LocalPhoto[] = [];
    const rejected: string[] = [];
    for (const file of candidates) {
      if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
        rejected.push(`${file.name}: use JPG, PNG ou WebP`);
        continue;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        rejected.push(`${file.name}: maior que 5 MB`);
        continue;
      }
      accepted.push({ file, previewUrl: URL.createObjectURL(file) });
    }

    if (accepted.length) setPhotos((p) => [...p, ...accepted]);

    if (skipped > 0 || rejected.length) {
      const parts = [];
      if (skipped > 0) parts.push(`só cabem mais ${remaining} foto(s)`);
      if (rejected.length) parts.push(rejected.join("; "));
      setError(parts.join(" · "));
    } else {
      setError(null);
    }
  }

  function removePhoto(index: number) {
    setPhotos((p) => {
      const target = p[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return p.filter((_, i) => i !== index);
    });
  }

  function validateStep(): string | null {
    if (step === 0) {
      if (!name1.trim() || !name2.trim()) return "Preencha os dois nomes.";
    }
    if (step === 1) {
      if (!date) return "Informe a data.";
    }
    if (step === 2) {
      if (photos.length < 1) return "Envie pelo menos 1 foto.";
    }
    if (step === 3) {
      if (!message.trim()) return "Escreva uma mensagem.";
      if (message.length > 500) return "Mensagem até 500 caracteres.";
    }
    if (step === 6) {
      if (!email.trim()) return "Informe seu e-mail.";
      if (!terms) return "Aceite os Termos e a Privacidade.";
    }
    return null;
  }

  function next() {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  }

  async function submit() {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("name1", name1);
      fd.set("name2", name2);
      fd.set("startedDate", date);
      if (time) fd.set("startedTime", time);
      fd.set("message", message);
      fd.set("buyerEmail", email);
      fd.set("termsAccepted", "true");
      if (ytSelected) {
        fd.set("youtubeVideoId", ytSelected.videoId);
        fd.set("youtubeTitle", ytSelected.title);
        fd.set("youtubeThumbnail", ytSelected.thumbnail);
      }
      for (const p of photos) fd.append("photos", p.file);

      const res = await fetch("/api/checkout/core", {
        method: "POST",
        body: fd,
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(j.error ?? "Falha ao iniciar pagamento");
      }
      if (!j.checkoutUrl) throw new Error("Checkout sem URL de pagamento");
      track("checkout_core");
      window.location.href = j.checkoutUrl as string;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro no checkout");
      setSubmitting(false);
    }
  }

  const previewData = useMemo(() => {
    const started = date
      ? new Date(`${date}T${time || "00:00"}:00-03:00`).toISOString()
      : new Date().toISOString();
    return {
      name1: name1 || "Nome 1",
      name2: name2 || "Nome 2",
      startedAt: started,
      message: message || "Sua mensagem aparece aqui.",
      photos: photos.map((p) => ({ src: p.previewUrl, alt: "Foto" })),
      youtubeVideoId: ytSelected?.videoId,
      youtubeTitle: ytSelected?.title,
    };
  }, [name1, name2, date, time, message, photos, ytSelected]);

  return (
    <main className="min-h-full flex-1 bg-background">
      <div className="mx-auto w-full max-w-lg px-5 py-6">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="font-heading text-lg font-semibold text-wine">
            Nosso Tempo
          </Link>
        </div>

        <div className="mb-8">
          <div className="mb-2 flex justify-between text-xs text-muted-foreground">
            <span>
              Etapa {step + 1} de {STEPS.length}
            </span>
            <span>{STEPS[step]}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-cream-deep">
            <div
              className="h-full rounded-full bg-wine transition-all"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {error ? (
          <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {step === 0 && (
          <div className="space-y-4">
            <h1 className="font-heading text-2xl font-semibold text-wine-deep">
              Nomes do casal
            </h1>
            <div className="space-y-2">
              <Label htmlFor="name1">Nome 1</Label>
              <Input
                id="name1"
                value={name1}
                onChange={(e) => {
                  setName1(e.target.value);
                  setError(null);
                }}
                placeholder="Ex.: Ana"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name2">Nome 2</Label>
              <Input
                id="name2"
                value={name2}
                onChange={(e) => {
                  setName2(e.target.value);
                  setError(null);
                }}
                placeholder="Ex.: Bruno"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h1 className="font-heading text-2xl font-semibold text-wine-deep">
              Quando começou?
            </h1>
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Hora (opcional)</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h1 className="font-heading text-2xl font-semibold text-wine-deep">
              Fotos (1 a {MAX_PHOTOS})
            </h1>
            <p className="text-sm text-muted-foreground">
              Envie de 1 a {MAX_PHOTOS} fotos em JPG, PNG ou WebP. Pode
              selecionar várias de uma vez.
            </p>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              disabled={photos.length >= MAX_PHOTOS}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) addPhotos(files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={photos.length >= MAX_PHOTOS}
              onClick={() => photoInputRef.current?.click()}
              className={cn(
                "flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
                photos.length >= MAX_PHOTOS
                  ? "cursor-not-allowed border-wine/15 bg-cream-deep/40 text-muted-foreground"
                  : "border-wine/45 bg-wine/5 text-wine-deep hover:border-wine hover:bg-wine/10",
              )}
            >
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
            </button>
            <ul className="space-y-2">
              {photos.map((p, i) => (
                <li
                  key={p.previewUrl}
                  className="flex items-center justify-between rounded-md bg-cream-deep/60 px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2 truncate">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.previewUrl}
                      alt=""
                      className="size-8 rounded object-cover"
                    />
                    Foto {i + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removePhoto(i)}
                  >
                    Remover
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h1 className="font-heading text-2xl font-semibold text-wine-deep">
              Mensagem
            </h1>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Sem inspiração? Comece com um modelo e edite à vontade:
              </p>
              <div className="flex flex-wrap gap-2">
                {MESSAGE_TEMPLATES.map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => {
                      setMessage(t.text);
                      setError(null);
                    }}
                    className="rounded-full border border-wine/30 bg-wine/5 px-3 py-1 text-xs font-medium text-wine-deep transition-colors hover:border-wine hover:bg-wine/10"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <Textarea
              value={message}
              maxLength={500}
              rows={6}
              onChange={(e) => {
                setMessage(e.target.value);
                setError(null);
              }}
              placeholder="Escreva o que quiser eternizar…"
            />
            <p className="text-right text-xs text-muted-foreground">
              {message.length}/500
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h1 className="font-heading text-2xl font-semibold text-wine-deep">
              Música (opcional)
            </h1>
            <Input
              value={ytQuery}
              onChange={(e) => setYtQuery(e.target.value)}
              placeholder="Buscar no YouTube…"
            />
            {ytSelected ? (
              <div className="flex items-center gap-3 rounded-md border border-wine/20 bg-cream p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {ytSelected.thumbnail ? (
                  <img
                    src={ytSelected.thumbnail}
                    alt=""
                    className="h-12 w-20 rounded object-cover"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{ytSelected.title}</p>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-wine"
                    onClick={clearMusic}
                  >
                    Remover
                  </Button>
                </div>
              </div>
            ) : null}
            {ytSearching ? (
              <p className="text-sm text-muted-foreground">Buscando…</p>
            ) : (
              <ul className="space-y-2">
                {ytResults.map((item) => (
                  <li key={item.videoId}>
                    <button
                      type="button"
                      onClick={() => void selectVideo(item)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md border border-transparent p-2 text-left hover:border-wine/30 hover:bg-cream",
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.thumbnail}
                        alt=""
                        className="h-12 w-20 rounded object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.channelTitle}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h1 className="font-heading text-2xl font-semibold text-wine-deep">
              Preview
            </h1>
            <p className="text-sm text-muted-foreground">
              Assim ficará a página (música só após “abrir”).
            </p>
            <div className="overflow-hidden rounded-xl border border-wine/15">
              <CouplePageView data={previewData} preview />
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <h1 className="font-heading text-2xl font-semibold text-wine-deep">
              Quase lá
            </h1>
            <div className="space-y-2">
              <Label htmlFor="email">Seu e-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="para receber o link e o QR"
              />
            </div>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
              />
              <span>
                Li e aceito os{" "}
                <Link href="/termos" className="underline text-wine">
                  Termos
                </Link>{" "}
                e a{" "}
                <Link href="/privacidade" className="underline text-wine">
                  Privacidade
                </Link>
                .
              </span>
            </label>
            <p className="text-sm text-muted-foreground">
              Pagamento via Pix ou cartão. Total:{" "}
              <span className="font-medium text-wine-deep">
                {formatBRL(pricing.priceCoreCents)}
              </span>
              .
            </p>
            <Button
              size="lg"
              className="w-full bg-wine text-cream hover:bg-wine-deep"
              disabled={submitting || !email || !terms}
              onClick={() => void submit()}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Enviando…
                </>
              ) : (
                "Pagar"
              )}
            </Button>
          </div>
        )}

        <div className="mt-8 flex justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={step === 0}
            onClick={() => {
              setError(null);
              setStep((s) => Math.max(0, s - 1));
            }}
          >
            Voltar
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              className="bg-wine text-cream hover:bg-wine-deep"
              onClick={next}
            >
              Continuar
            </Button>
          ) : null}
        </div>
      </div>
    </main>
  );
}
