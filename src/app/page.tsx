import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CtaPrice } from "@/components/landing/CtaPrice";
import { Faq } from "@/components/landing/Faq";
import { HeroDemo } from "@/components/landing/HeroDemo";
import { PromoBanner } from "@/components/landing/PromoBanner";
import { Steps } from "@/components/landing/Steps";
import { formatBRL, getSiteSettings } from "@/lib/pricing";

export default async function HomePage() {
  const settings = await getSiteSettings();
  const price = formatBRL(settings.priceCoreCents);

  return (
    <main className="relative flex min-h-full flex-1 flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#fffaf5_0%,_#f7f0e8_45%,_#ebe0d2_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-40 h-72 w-72 rounded-full bg-wine/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 bottom-40 h-64 w-64 rounded-full bg-wine-deep/10 blur-3xl"
      />

      {settings.bannerEnabled && settings.bannerText ? (
        <PromoBanner
          text={settings.bannerText}
          targetAt={settings.bannerTargetAt}
        />
      ) : null}

      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <p className="font-heading text-xl font-semibold tracking-tight text-wine">
          Nosso Tempo
        </p>
        <Button asChild variant="outline" className="border-wine/30 text-wine">
          <Link href="/criar">Criar página</Link>
        </Button>
      </header>

      <section className="relative z-10 mx-auto grid w-full max-w-5xl flex-1 items-center gap-12 px-6 pb-16 pt-4 lg:grid-cols-2 lg:gap-16 lg:pb-24 lg:pt-8">
        <div>
          <p className="font-heading text-5xl font-semibold leading-[1.05] tracking-tight text-wine-deep sm:text-6xl md:text-7xl">
            Nosso Tempo
          </p>
          <h1 className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Um presente digital para eternizar a história de vocês — fotos,
            mensagem, música e um QR Code para abrir a surpresa.
          </h1>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button
              asChild
              size="lg"
              className="bg-wine text-cream hover:bg-wine-deep"
            >
              <Link href="/criar">Criar agora — {price}</Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              Pagamento único · vitalício
            </p>
          </div>
        </div>
        <HeroDemo />
      </section>

      <div className="relative z-10">
        <Steps />
        <Faq />
        <CtaPrice priceCoreCents={settings.priceCoreCents} />

        <footer className="border-t border-wine/10 px-6 py-10">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-heading text-lg font-semibold text-wine">
                Nosso Tempo
              </p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Presente digital com página eterna, QR e extras para imprimir.
              </p>
            </div>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:items-end">
              <div className="flex flex-wrap gap-4">
                <Link href="/privacidade" className="hover:text-wine">
                  Privacidade
                </Link>
                <Link href="/termos" className="hover:text-wine">
                  Termos
                </Link>
              </div>
              {settings.supportEmail ? (
                <a
                  href={`mailto:${settings.supportEmail}`}
                  className="hover:text-wine"
                >
                  {settings.supportEmail}
                </a>
              ) : null}
              {settings.supportWhatsapp ? (
                <a
                  href={`https://wa.me/${settings.supportWhatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-wine"
                >
                  WhatsApp
                </a>
              ) : null}
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
