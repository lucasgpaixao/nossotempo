import { Suspense } from "react";
import CriarWizard from "./wizard";

export default function CriarPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-full flex-1 items-center justify-center bg-background">
          <p className="text-muted-foreground">Preparando seu presente…</p>
        </main>
      }
    >
      <CriarWizard />
    </Suspense>
  );
}
