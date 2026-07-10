"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  photos: { src: string; alt?: string }[];
  intervalMs?: number;
  className?: string;
};

export function PhotoCarousel({
  photos,
  intervalMs = 4500,
  className,
}: Props) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const go = useCallback(
    (dir: 1 | -1) => {
      if (photos.length <= 1) return;
      setIndex((i) => (i + dir + photos.length) % photos.length);
    },
    [photos.length],
  );

  useEffect(() => {
    if (photos.length <= 1) return;
    const id = setInterval(() => go(1), intervalMs);
    return () => clearInterval(id);
  }, [photos.length, intervalMs, go]);

  if (photos.length === 0) {
    return (
      <div
        className={cn(
          "aspect-[4/5] w-full rounded-lg bg-cream-deep",
          className,
        )}
      />
    );
  }

  if (photos.length === 1) {
    return (
      <div className={cn("relative aspect-[4/5] w-full overflow-hidden", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photos[0].src}
          alt={photos[0].alt ?? "Foto"}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={cn("relative aspect-[4/5] w-full overflow-hidden", className)}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(dx) < 40) return;
        go(dx < 0 ? 1 : -1);
      }}
    >
      {photos.map((photo, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={photo.src + i}
          src={photo.src}
          alt={photo.alt ?? `Foto ${i + 1}`}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
            i === index ? "opacity-100" : "opacity-0",
          )}
        />
      ))}
      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
        {photos.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Foto ${i + 1}`}
            onClick={() => setIndex(i)}
            className={cn(
              "h-1.5 w-1.5 rounded-full transition-colors",
              i === index ? "bg-cream" : "bg-cream/40",
            )}
          />
        ))}
      </div>
    </div>
  );
}
