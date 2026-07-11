"use client";

import { useMemo } from "react";
import { PhotoCarousel } from "@/components/couple-page/PhotoCarousel";
import { RelationshipCounter } from "@/components/couple-page/RelationshipCounter";

const DEMO_PHOTOS = [
  {
    src: "/landing/demo-1.png",
    alt: "Casal abraçado em uma ponte ao entardecer",
  },
  {
    src: "/landing/demo-2.png",
    alt: "Casal caminhando de mãos dadas em rua iluminada",
  },
  {
    src: "/landing/demo-3.png",
    alt: "Casal sorrindo juntos em um jantar aconchegante",
  },
];

/** Demo interativa: contador + carrossel (sem música/autoplay). */
export function HeroDemo() {
  const startedAt = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 2);
    d.setMonth(d.getMonth() - 3);
    d.setDate(14);
    return d.toISOString();
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-wine/15 bg-card/80 shadow-[0_20px_60px_-30px_rgba(74,20,37,0.45)] backdrop-blur-sm">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#fffaf5_0%,_transparent_70%)]"
      />
      <div className="relative space-y-5 p-4 sm:p-5">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.28em] text-wine/55">
            Exemplo
          </p>
          <p className="font-heading mt-1 text-xl font-semibold text-wine-deep sm:text-2xl">
            Ana &amp; Pedro
          </p>
        </div>
        <PhotoCarousel photos={DEMO_PHOTOS} className="rounded-xl" />
        <RelationshipCounter startedAt={startedAt} />
        <p className="border-l-2 border-wine/35 pl-3 text-sm leading-relaxed text-foreground/80">
          Cada segundo juntos vira memória. Esta é a página que o presente
          abre.
        </p>
      </div>
    </div>
  );
}
