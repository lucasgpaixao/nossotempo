"use client";

import { useMemo } from "react";
import { PhotoCarousel } from "@/components/couple-page/PhotoCarousel";
import { RelationshipCounter } from "@/components/couple-page/RelationshipCounter";

const DEMO_PHOTOS = [
  {
    src:
      "data:image/svg+xml," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#6b1e36"/><stop offset="1" stop-color="#ebe0d2"/></linearGradient></defs><rect width="800" height="1000" fill="url(#g)"/><text x="400" y="520" text-anchor="middle" fill="#f7f0e8" font-family="Georgia, serif" font-size="42">Momento 1</text></svg>`,
      ),
    alt: "Demo foto 1",
  },
  {
    src:
      "data:image/svg+xml," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000"><defs><linearGradient id="g" x1="1" y1="0" x2="0" y2="1"><stop stop-color="#4a1425"/><stop offset="1" stop-color="#f7f0e8"/></linearGradient></defs><rect width="800" height="1000" fill="url(#g)"/><text x="400" y="520" text-anchor="middle" fill="#f7f0e8" font-family="Georgia, serif" font-size="42">Momento 2</text></svg>`,
      ),
    alt: "Demo foto 2",
  },
  {
    src:
      "data:image/svg+xml," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000"><defs><linearGradient id="g" x1="0.5" y1="0" x2="0.5" y2="1"><stop stop-color="#8a3a52"/><stop offset="1" stop-color="#ebe0d2"/></linearGradient></defs><rect width="800" height="1000" fill="url(#g)"/><text x="400" y="520" text-anchor="middle" fill="#f7f0e8" font-family="Georgia, serif" font-size="42">Momento 3</text></svg>`,
      ),
    alt: "Demo foto 3",
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
