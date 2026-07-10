const STEPS = [
  {
    n: "01",
    title: "Monte a página",
    body: "Nomes, data, fotos, mensagem e, se quiser, uma música do YouTube.",
  },
  {
    n: "02",
    title: "Pague com Pix ou cartão",
    body: "Checkout seguro pelo Mercado Pago. Sem criar conta do casal.",
  },
  {
    n: "03",
    title: "Entregue o QR",
    body: "Você recebe o link e o QR na hora — imprima, envie ou presenteie.",
  },
] as const;

export function Steps() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-20">
      <h2 className="font-heading text-center text-3xl font-semibold text-wine-deep sm:text-4xl">
        Três passos
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-center text-muted-foreground">
        Do rascunho ao presente em poucos minutos.
      </p>
      <ol className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
        {STEPS.map((step) => (
          <li key={step.n} className="relative">
            <p className="font-heading text-4xl font-semibold text-wine/25">
              {step.n}
            </p>
            <h3 className="font-heading mt-2 text-xl font-semibold text-wine-deep">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {step.body}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
