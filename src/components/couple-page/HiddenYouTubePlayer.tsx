"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (e: { target: YTPlayer }) => void;
            onStateChange?: (e: { data: number; target: YTPlayer }) => void;
          };
        },
      ) => YTPlayer;
      PlayerState: { ENDED: number; PLAYING: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  destroy: () => void;
};

type Props = {
  videoId: string;
  title?: string | null;
  className?: string;
};

function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();

  return new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.getElementById("yt-iframe-api")) {
      const tag = document.createElement("script");
      tag.id = "yt-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });
}

export function HiddenYouTubePlayer({ videoId, title, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [muted, setMuted] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        await loadYouTubeApi();
        if (cancelled || !hostRef.current || !window.YT) return;

        playerRef.current = new window.YT.Player(hostRef.current, {
          videoId,
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            loop: 1,
            playlist: videoId,
          },
          events: {
            onReady: (e) => {
              if (cancelled) return;
              e.target.playVideo();
              setReady(true);
            },
            onStateChange: (e) => {
              // loop fallback
              if (e.data === window.YT?.PlayerState.ENDED) {
                e.target.playVideo();
              }
            },
          },
        });
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    setup();

    return () => {
      cancelled = true;
      try {
        playerRef.current?.pauseVideo();
        playerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
  }, [videoId]);

  // Pausa em segundo plano / aba oculta; retoma se a página voltar ao foco.
  useEffect(() => {
    function onVisibility() {
      const p = playerRef.current;
      if (!p) return;
      try {
        if (document.hidden) p.pauseVideo();
        else p.playVideo();
      } catch {
        /* ignore */
      }
    }
    function onPageHide() {
      try {
        playerRef.current?.pauseVideo();
      } catch {
        /* ignore */
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  function toggleMute() {
    const p = playerRef.current;
    if (!p) return;
    if (p.isMuted()) {
      p.unMute();
      setMuted(false);
    } else {
      p.mute();
      setMuted(true);
    }
  }

  if (failed) return null;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0">
        <div ref={hostRef} />
      </div>
      {ready && (
        <>
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? "Ativar som" : "Silenciar"}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-wine text-cream transition hover:bg-wine-deep"
          >
            {muted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
          {title ? (
            <p className="truncate text-sm text-muted-foreground">{title}</p>
          ) : null}
        </>
      )}
    </div>
  );
}
