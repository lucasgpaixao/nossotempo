import { Body, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";

type PhysicalOrderEmailProps = {
  name1: string;
  name2: string;
};

const wine = "#6b1e36";
const wineDeep = "#4a1425";
const cream = "#f7f0e8";

export function PhysicalOrderEmail({ name1, name2 }: PhysicalOrderEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Recebemos seu pedido de polaroids + carta impressas</Preview>
      <Body style={{ backgroundColor: cream, fontFamily: "Georgia, serif" }}>
        <Container style={{ padding: "32px", color: "#2a1520" }}>
          <Text
            style={{
              letterSpacing: "3px",
              color: wine,
              fontSize: "12px",
              textAlign: "center",
              textTransform: "uppercase",
            }}
          >
            Nosso Tempo
          </Text>
          <Heading
            as="h1"
            style={{ textAlign: "center", color: wineDeep, fontSize: "24px" }}
          >
            Recebemos seu pedido!
          </Heading>
          <Text style={{ textAlign: "center" }}>
            As polaroids e a carta personalizada de {name1} & {name2} serão
            impressas com carinho e enviadas pelo correio para o endereço
            informado no pagamento.
          </Text>
          <Text style={{ textAlign: "center" }}>
            Assim que o envio for feito, entraremos em contato se precisarmos
            confirmar alguma informação.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
