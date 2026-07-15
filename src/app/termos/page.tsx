export default function TermosPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-heading text-3xl font-semibold text-wine-deep">
        Termos de uso
      </h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-foreground/90">
        <p>
          O Nosso Tempo oferece um presente digital: uma página secreta do casal
          com fotos, mensagem, contador e, opcionalmente, música do YouTube,
          além de QR Code para compartilhar.
        </p>
        <p>
          O pagamento é único (vitalício para a página core). Extras opcionais
          (PDF de polaroids e PDF de carta) são cobrados à parte no funil
          pós-pagamento e destinam-se à impressão caseira — não incluem envio
          físico no MVP.
        </p>
        <p>
          <strong>Reembolso:</strong> após a aprovação do pagamento, não há
          reembolso, exceto em caso de falha técnica nossa que impeça a
          entrega do presente (nesse caso reenviamos o acesso ou efetuamos
          estorno).
        </p>
        <p>
          Você pode editar o conteúdo do core por até 7 dias após a compra,
          via link mágico enviado por e-mail. Conteúdo inadequado pode ser
          removido manualmente.
        </p>
        <p>
          Pagamentos são processados pela Cakto. Ao pagar, você declara
          ter lido estes Termos e a Política de Privacidade.
        </p>
      </div>
    </main>
  );
}
