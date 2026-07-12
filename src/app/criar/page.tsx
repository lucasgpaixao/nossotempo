import { Suspense } from "react";
import { getPricing } from "@/lib/pricing";
import CriarWizard from "./wizard";

export default async function CriarPage() {
  const pricing = await getPricing();
  return (
    <Suspense
      fallback={
        <main className="flex min-h-full flex-1 items-center justify-center bg-background">
          <p className="text-muted-foreground">Preparando seu presente…</p>
        </main>
      }
    >
      <CriarWizard pricing={pricing} />
    </Suspense>
  );
}
