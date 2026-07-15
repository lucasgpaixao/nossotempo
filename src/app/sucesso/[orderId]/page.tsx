import Link from "next/link";
import { notFound } from "next/navigation";
import { LogoIcon } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { appUrl } from "@/lib/app-url";
import { formatBRL, getPricing } from "@/lib/pricing";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isPubliclyVisible, type Order } from "@/lib/types";

type Props = {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ pending?: string }>;
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
          Assim que a Cakto confirmar, esta página libera o link e o QR.
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

  // O UUID do pedido circula por terceiros (query `sck` do checkout Cakto),
  // então esta página não pode expor nada sensível: o link de edição
  // (edit_token) e o e-mail do comprador vão somente no e-mail de entrega.
  const pageUrl = `${appUrl()}/p/${o.public_id}`;

  return (
    <main className="relative mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col px-6 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_#fffaf5_0%,_#f7f0e8_50%,_#ebe0d2_100%)]"
      />

      <p className="flex items-center justify-center gap-1.5 text-center text-xs uppercase tracking-[0.25em] text-wine/55">
        <LogoIcon size={16} />
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
        </div>

        <p className="text-xs text-muted-foreground">
          Enviamos os detalhes — incluindo o link para editar por 7 dias —
          para o e-mail usado na compra.
        </p>
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Obrigado! Core {formatBRL(pricing.priceCoreCents)}
        {o.mp_payment_upsell_id
          ? ` · Polaroids ${formatBRL(pricing.priceUpsellCents)}`
          : ""}
        {o.mp_payment_downsell_id
          ? ` · Carta ${formatBRL(pricing.priceDownsellCents)}`
          : ""}
      </p>

      <p className="mt-10 text-center text-sm">
        <Link href="/" className="text-wine underline">
          Voltar ao início
        </Link>
      </p>
    </main>
  );
}
