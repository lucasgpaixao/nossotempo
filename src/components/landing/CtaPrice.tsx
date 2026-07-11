import { buttonVariants } from "@/components/ui/button";
import { formatBRL } from "@/lib/pricing";
import { cn } from "@/lib/utils";

type Props = {
  priceCoreCents: number;
};

export function CtaPrice({ priceCoreCents }: Props) {
  const price = formatBRL(priceCoreCents);

  return (
    <section className="relative mx-auto w-full max-w-5xl px-6 py-16 sm:py-20">
      <div className="relative overflow-hidden rounded-2xl border border-wine/15 bg-wine px-6 py-12 text-center text-cream sm:px-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cream/10 blur-2xl"
        />
        <h2 className="font-heading relative text-3xl font-semibold sm:text-4xl">
          Pronto para eternizar?
        </h2>
        <p className="relative mx-auto mt-3 max-w-md text-cream/80">
          Página vitalícia com fotos, mensagem, música opcional e QR para
          presentear.
        </p>
        <div className="relative mt-8 flex flex-col items-center gap-3">
          <a
            href="/criar"
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-cream text-wine-deep hover:bg-cream-deep",
            )}
          >
            Criar agora — {price}
          </a>
          <p className="text-sm text-cream/65">Pagamento único · Pix ou cartão</p>
        </div>
      </div>
    </section>
  );
}
