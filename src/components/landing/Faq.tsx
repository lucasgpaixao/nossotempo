import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = [
  {
    q: "A página fica no ar para sempre?",
    a: "Sim. Depois do pagamento, o link secreto permanece ativo — sem mensalidade.",
  },
  {
    q: "Funciona no celular?",
    a: "Sim. A página e o QR foram pensados para abrir bem no celular, que é onde a surpresa acontece.",
  },
  {
    q: "Quanto tempo leva para receber?",
    a: "Assim que o pagamento for aprovado, o link e o QR ficam disponíveis na página de sucesso e no e-mail.",
  },
  {
    q: "A música é obrigatória?",
    a: "Não. Você pode buscar uma música no YouTube ou pular essa etapa. A mensagem e pelo menos uma foto são obrigatórias.",
  },
  {
    q: "Posso pedir reembolso?",
    a: "Após a aprovação do pagamento, não há reembolso — exceto falha técnica nossa (reenviamos o presente ou estornamos).",
  },
  {
    q: "Dá para editar depois de pagar?",
    a: "Sim. Você recebe um link mágico de edição válido por 7 dias para ajustar nomes, fotos, mensagem e música.",
  },
] as const;

export function Faq() {
  return (
    <section className="mx-auto w-full max-w-2xl px-6 py-16 sm:py-20">
      <h2 className="font-heading text-center text-3xl font-semibold text-wine-deep sm:text-4xl">
        Perguntas frequentes
      </h2>
      <Accordion type="single" collapsible className="mt-10 w-full">
        {FAQ.map((item, i) => (
          <AccordionItem key={item.q} value={`item-${i}`}>
            <AccordionTrigger className="text-left text-wine-deep hover:no-underline">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
