import Link from "next/link";
import { notFound } from "next/navigation";
import { DownsellOffer } from "@/components/checkout/DownsellOffer";
import { UpsellOffer } from "@/components/checkout/UpsellOffer";
import { Button } from "@/components/ui/button";
import { appUrl } from "@/lib/app-url";
import { formatBRL, getPricing } from "@/lib/pricing";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isPubliclyVisible, type Order } from "@/lib/types";

type Props = {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ pending?: string; offer?: string }>;
};

export default async function SucessoPage({ params, searchParams }: Props) {
  const { orderId } = await params;
  const sp = await searchParams;

  const { data: order } = await supabaseAdmin()
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) notFound();
  const o = order as Order;
  const pricing = await getPricing();

  const pending =
    sp.pending === "1" ||
    o.status === "pending_payment" ||
    o.status === "draft";

  if (pending && !isPubliclyVisible(o.status)) {
    return (
      <main className="mx-auto flex min-h-full max-w-lg flex-1 flex-col justify-center px-6 py-16 text-center">
        <h1 className="font-heading text-3xl font-semibold text-wine-deep">
          Pagamento em análise
        </h1>
        <p className="mt-3 text-muted-foreground">
          Assim que o Mercado Pago confirmar, esta página libera o link e o QR.
          Atualize em alguns instantes.
        </p>
        <Button asChild className="mt-8 bg-wine text-cream hover:bg-wine-deep">
          <Link href={`/sucesso/${orderId}`}>Atualizar</Link>
        </Button>
      </main>
    );
  }

  if (!isPubliclyVisible(o.status)) notFound();

  let qrUrl: string | null = null;
  if (o.qr_storage_path) {
    const { data } = await supabaseAdmin()
      .storage.from("order-assets")
      .createSignedUrl(o.qr_storage_path, 60 * 60);
    qrUrl = data?.signedUrl ?? null;
  }

  const pageUrl = `${appUrl()}/p/${o.public_id}`;
  const editUrl = o.edit_token
    ? `${appUrl()}/editar/${o.edit_token}`
    : null;

  const wantsDownsell = sp.offer === "downsell";
  const done =
    sp.offer === "done" ||
    o.status === "completed" ||
    o.status === "upsell_paid" ||
    o.status === "downsell_paid";

  const showUpsell =
    !done &&
    !wantsDownsell &&
    !o.mp_payment_upsell_id &&
    !o.mp_payment_downsell_id &&
    (o.status === "core_paid" || o.status === "upsell_offered");

  const showDownsell =
    !done &&
    wantsDownsell &&
    !o.mp_payment_upsell_id &&
    !o.mp_payment_downsell_id;

  return (
    <main className="relative mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col px-6 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_#fffaf5_0%,_#f7f0e8_50%,_#ebe0d2_100%)]"
      />

      <p className="text-center text-xs uppercase tracking-[0.25em] text-wine/55">
        Nosso Tempo
      </p>
      <h1 className="font-heading mt-3 text-center text-3xl font-semibold text-wine-deep">
        Presente liberado
      </h1>
      <p className="mt-2 text-center text-muted-foreground">
        {o.name1} &amp; {o.name2}
      </p>

      <div className="mt-8 space-y-6 rounded-xl border border-wine/15 bg-card/90 p-6 text-center shadow-sm">
        {qrUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrUrl}
            alt="QR Code da página"
            className="mx-auto h-48 w-48 rounded-lg border border-wine/20 bg-white p-2"
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            QR sendo gerado… atualize em instantes.
          </p>
        )}

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Link da página</p>
          <a
            href={pageUrl}
            className="break-all text-sm font-medium text-wine underline"
            target="_blank"
            rel="noreferrer"
          >
            {pageUrl}
          </a>
        </div>

        <div className="flex flex-col gap-2">
          <Button asChild className="bg-wine text-cream hover:bg-wine-deep">
            <a href={pageUrl} target="_blank" rel="noreferrer">
              Abrir página
            </a>
          </Button>
          {editUrl ? (
            <Button asChild variant="outline">
              <a href={editUrl}>Editar por 7 dias</a>
            </Button>
          ) : null}
        </div>

        {o.buyer_email ? (
          <p className="text-xs text-muted-foreground">
            Enviamos (ou enviaremos) os detalhes para {o.buyer_email}.
          </p>
        ) : null}
      </div>

      <div className="mt-8">
        {showUpsell ? (
          <UpsellOffer
            orderId={o.id}
            priceCents={pricing.priceUpsellCents}
          />
        ) : null}
        {showDownsell ? (
          <DownsellOffer
            orderId={o.id}
            priceCents={pricing.priceDownsellCents}
          />
        ) : null}
        {done ? (
          <p className="text-center text-sm text-muted-foreground">
            Obrigado! Core {formatBRL(pricing.priceCoreCents)}
            {o.mp_payment_upsell_id
              ? ` · Polaroids ${formatBRL(pricing.priceUpsellCents)}`
              : ""}
            {o.mp_payment_downsell_id
              ? ` · Carta ${formatBRL(pricing.priceDownsellCents)}`
              : ""}
            . PDFs extras entram na próxima etapa.
          </p>
        ) : null}
      </div>

      <p className="mt-10 text-center text-sm">
        <Link href="/" className="text-wine underline">
          Voltar ao início
        </Link>
      </p>
    </main>
  );
}
