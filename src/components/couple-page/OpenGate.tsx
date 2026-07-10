"use client";

import { Button } from "@/components/ui/button";

type Props = {
  names: string;
  onOpen: () => void;
};

export function OpenGate({ names, onOpen }: Props) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <p className="font-heading text-sm uppercase tracking-[0.2em] text-wine/70">
        Uma história para abrir
      </p>
      <h1 className="font-heading mt-4 text-3xl font-semibold text-wine-deep sm:text-4xl">
        {names}
      </h1>
      <p className="mt-3 max-w-sm text-muted-foreground">
        Toque para abrir nossa história
      </p>
      <Button
        size="lg"
        className="mt-8 bg-wine px-8 text-cream hover:bg-wine-deep"
        onClick={onOpen}
      >
        Abrir nossa história
      </Button>
    </div>
  );
}
