"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CouplePageView } from "@/components/couple-page/CouplePageView";
import { cn } from "@/lib/utils";

const STEPS = [
  "Nomes",
  "Data",
  "Fotos",
  "Mensagem",
  "Música",
  "Preview",
  "Pagar",
] as const;

type Draft = {
  id: string;
  public_id: string;
  name1: string | null;
  name2: string | null;
  started_at: string | null;
  message: string | null;
  youtube_video_id: string | null;
  youtube_title: string | null;
  youtube_thumbnail: string | null;
  buyer_email: string | null;
};

type Photo = { id: string; storage_path: string; sort_order: number };

type YtItem = {
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
};

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

export default function CriarWizard() {
  const router = useRouter();
  const search = useSearchParams();
  const draftParam = search.get("draft");
  const payFailed = search.get("pay") === "failed";

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name1, setName1] = useState("");
  const [name2, setName2] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const patchDraft = useCallback(
    async (body: Record<string, unknown>) => {
      if (!draft) return;
      setSaving(true);
      try {
        const res = await fetch(`/api/drafts/${draft.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? "Falha ao salvar");
        }
        const j = await res.json();
        setDraft(j.draft);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao salvar");
      } finally {
        setSaving(false);
      }
    },
    [draft],
  );

  const debouncedPatch = useCallback(
    (body: Record<string, unknown>) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void patchDraft(body);
      }, 400);
    },
    [patchDraft],
  );

  useEffect(() => {
    if (payFailed) {
      setStep(6);
      setError(
        "Pagamento não concluído. Você pode tentar de novo quando quiser.",
      );
    }
  }, [payFailed]);

  const payCore = useCallback(async () => {
    if (!draft) return;
    if (!email || !terms) {
      setError("Informe o e-mail e aceite os termos.");
      return;
    }
    setSaving(true);
    setError(null);
    setCheckoutUrl(null);
    try {
      const patchRes = await fetch(`/api/drafts/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyerEmail: email, termsAccepted: true }),
      });
      if (!patchRes.ok) {
        const j = await patchRes.json().catch(() => ({}));
        throw new Error(j.error ?? "Falha ao salvar e-mail");
      }

      const res = await fetch("/api/checkout/core", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId: draft.id,
          buyerEmail: email,
          termsAccepted: true,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(j.error ?? "Falha ao iniciar pagamento");
      }
      if (!j.initPoint) throw new Error("Checkout sem URL de pagamento");
      // Guarda o link e deixa o usuário abrir com clique real (evita tela /crawlers
      // do anti-bot do MP em alguns navegadores / webviews).
      setCheckoutUrl(j.initPoint as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro no checkout");
    } finally {
      setSaving(false);
    }
  }, [draft, email, terms]);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      setLoading(true);
      setError(null);
      try {
        if (draftParam) {
          const res = await fetch(`/api/drafts/${draftParam}`);
          if (!res.ok) throw new Error("Rascunho não encontrado");
          const j = await res.json();
          if (cancelled) return;
          setDraft(j.draft);
          setPhotos(j.photos ?? []);
          setName1(j.draft.name1 ?? "");
          setName2(j.draft.name2 ?? "");
          const st = splitStartedAt(j.draft.started_at);
          setDate(st.date);
          setTime(st.time === "00:00" ? "" : st.time);
          setMessage(j.draft.message ?? "");
          setEmail(j.draft.buyer_email ?? "");
          if (j.draft.youtube_video_id) {
            setYtSelected({
              videoId: j.draft.youtube_video_id,
              title: j.draft.youtube_title ?? "",
              thumbnail: j.draft.youtube_thumbnail ?? "",
            });
          }
        } else {
          const res = await fetch("/api/drafts", { method: "POST" });
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            throw new Error(j.error ?? "Não foi possível criar o rascunho");
          }
          const j = await res.json();
          if (cancelled) return;
          setDraft(j.draft);
          router.replace(`/criar?draft=${j.draft.id}`);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erro ao iniciar");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftParam]);

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
    await patchDraft({
      youtubeVideoId: item.videoId,
      youtubeTitle: j.title ?? item.title,
      youtubeThumbnail: j.thumbnail ?? item.thumbnail,
    });
  }

  async function clearMusic() {
    setYtSelected(null);
    await patchDraft({
      youtubeVideoId: null,
      youtubeTitle: null,
      youtubeThumbnail: null,
    });
  }

  async function uploadPhoto(file: File) {
    if (!draft) return;
    setUploadingPhoto(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch(`/api/drafts/${draft.id}/photos`, {
        method: "POST",
        body: fd,
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error ?? "Falha no upload");
        return;
      }
      setPhotos((p) => [...p, j.photo]);
    } catch {
      setError("Falha ao enviar a foto. Tente de novo.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function removePhoto(photoId: string) {
    if (!draft) return;
    const res = await fetch(
      `/api/drafts/${draft.id}/photos?photoId=${photoId}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      setError("Não foi possível remover a foto");
      return;
    }
    setPhotos((p) => p.filter((x) => x.id !== photoId));
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

  async function next() {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError(null);

    if (step === 0) await patchDraft({ name1, name2 });
    if (step === 1) {
      await patchDraft({
        startedDate: date,
        startedTime: time || null,
      });
    }
    if (step === 3) await patchDraft({ message });

    if (step < STEPS.length - 1) setStep((s) => s + 1);
  }

  const previewData = useMemo(() => {
    const started =
      draft?.started_at ??
      (date
        ? new Date(`${date}T${time || "00:00"}:00-03:00`).toISOString()
        : new Date().toISOString());
    return {
      name1: name1 || "Nome 1",
      name2: name2 || "Nome 2",
      startedAt: started,
      message: message || "Sua mensagem aparece aqui.",
      photos: photos.map((p) => ({
        src: `/api/drafts/${draft?.id}/photos/signed?path=${encodeURIComponent(p.storage_path)}`,
        alt: "Foto",
      })),
      youtubeVideoId: ytSelected?.videoId,
      youtubeTitle: ytSelected?.title,
    };
  }, [draft, name1, name2, date, time, message, photos, ytSelected]);

  if (loading) {
    return (
      <main className="flex min-h-full flex-1 items-center justify-center bg-background">
        <p className="text-muted-foreground">Preparando seu presente…</p>
      </main>
    );
  }

  return (
    <main className="min-h-full flex-1 bg-background">
      <div className="mx-auto w-full max-w-lg px-5 py-6">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="font-heading text-lg font-semibold text-wine">
            Nosso Tempo
          </Link>
          <span className="text-xs text-muted-foreground">
            {saving ? "Salvando…" : "Rascunho salvo"}
          </span>
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
                  debouncedPatch({ name1: e.target.value, name2 });
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
                  debouncedPatch({ name1, name2: e.target.value });
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
              Fotos (1 a 3)
            </h1>
            <p className="text-sm text-muted-foreground">
              Envie de 1 a 3 fotos em JPG, PNG ou WebP.
            </p>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={photos.length >= 3 || uploadingPhoto}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadPhoto(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={photos.length >= 3 || uploadingPhoto}
              onClick={() => photoInputRef.current?.click()}
              className={cn(
                "flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
                photos.length >= 3 || uploadingPhoto
                  ? "cursor-not-allowed border-wine/15 bg-cream-deep/40 text-muted-foreground"
                  : "border-wine/45 bg-wine/5 text-wine-deep hover:border-wine hover:bg-wine/10",
              )}
            >
              {uploadingPhoto ? (
                <>
                  <Loader2
                    className="size-8 animate-spin text-wine"
                    aria-hidden
                  />
                  <span className="text-sm font-medium text-wine-deep">
                    Enviando foto…
                  </span>
                </>
              ) : (
                <>
                  <span className="flex size-12 items-center justify-center rounded-full bg-wine text-cream shadow-sm">
                    <ImagePlus className="size-6" aria-hidden />
                  </span>
                  <span className="text-base font-semibold">
                    {photos.length >= 3
                      ? "Limite de 3 fotos atingido"
                      : "Escolher foto"}
                  </span>
                  {photos.length < 3 ? (
                    <span className="text-sm text-muted-foreground">
                      Toque aqui para selecionar uma imagem
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
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h1 className="font-heading text-2xl font-semibold text-wine-deep">
              Mensagem
            </h1>
            <Textarea
              value={message}
              maxLength={500}
              rows={6}
              onChange={(e) => {
                setMessage(e.target.value);
                setError(null);
                debouncedPatch({ message: e.target.value });
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
                    onClick={() => void clearMusic()}
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
              Pagamento via Mercado Pago (Pix ou cartão).
            </p>
            {checkoutUrl ? (
              <div className="space-y-3 rounded-xl border border-wine/20 bg-wine/5 p-4">
                <p className="text-sm font-medium text-wine-deep">
                  Checkout pronto. Abra o Mercado Pago para pagar:
                </p>
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "w-full bg-wine text-cream hover:bg-wine-deep",
                  )}
                >
                  Abrir Mercado Pago
                </a>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Use o <strong className="font-medium text-foreground">Chrome</strong>{" "}
                  (janela anônima). Se aparecer só o logo cinza, feche abas do
                  Mercado Pago, limpe cookies dele e abra este link de novo.
                </p>
              </div>
            ) : (
              <Button
                size="lg"
                className="w-full bg-wine text-cream hover:bg-wine-deep"
                disabled={saving || !email || !terms}
                onClick={() => void payCore()}
              >
                {saving ? "Preparando checkout…" : "Pagar com Mercado Pago"}
              </Button>
            )}
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
              disabled={saving || uploadingPhoto}
              onClick={() => void next()}
            >
              Continuar
            </Button>
          ) : null}
        </div>
      </div>
    </main>
  );
}
