"use client";

import { useState } from "react";
import { formatCoupleNames } from "@/lib/counter";
import { OpenGate } from "./OpenGate";
import { PhotoCarousel } from "./PhotoCarousel";
import { RelationshipCounter } from "./RelationshipCounter";
import { HiddenYouTubePlayer } from "./HiddenYouTubePlayer";

export type CouplePageData = {
  name1: string;
  name2: string;
  startedAt: string;
  message: string;
  photos: { src: string; alt?: string }[];
  youtubeVideoId?: string | null;
  youtubeTitle?: string | null;
};

type Props = {
  data: CouplePageData;
  /** Se true, pula o gate (útil no preview do wizard) */
  preview?: boolean;
};

export function CouplePageView({ data, preview = false }: Props) {
  const [opened, setOpened] = useState(preview);
  const names = formatCoupleNames(data.name1, data.name2);

  if (!opened) {
    return (
      <div className="min-h-full bg-background">
        <OpenGate names={names} onOpen={() => setOpened(true)} />
      </div>
    );
  }

  return (
    <div className="relative min-h-full bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#fffaf5_0%,_#f7f0e8_50%,_#ebe0d2_100%)]"
      />
      <article className="relative z-10 mx-auto flex w-full max-w-lg flex-col gap-8 px-5 py-10 sm:py-14">
        <header className="text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-wine/60">
            Nosso Tempo
          </p>
          <h1 className="font-heading mt-3 text-3xl font-semibold text-wine-deep sm:text-4xl">
            {names}
          </h1>
        </header>

        <PhotoCarousel photos={data.photos} className="rounded-xl shadow-md" />

        <RelationshipCounter startedAt={data.startedAt} />

        <blockquote className="border-l-2 border-wine/40 pl-4 text-base leading-relaxed text-foreground/90 whitespace-pre-wrap">
          {data.message}
        </blockquote>

        {data.youtubeVideoId ? (
          <HiddenYouTubePlayer
            videoId={data.youtubeVideoId}
            title={data.youtubeTitle}
          />
        ) : null}
      </article>
    </div>
  );
}
