import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";

type AddonEmailProps = {
  label: "Polaroids" | "Carta";
  downloadUrl: string;
};

const wine = "#6b1e36";
const wineDeep = "#4a1425";
const cream = "#f7f0e8";

export function AddonEmail({ label, downloadUrl }: AddonEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Seu PDF: {label}</Preview>
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
            Seu PDF: {label}
          </Heading>
          <Text style={{ textAlign: "center" }}>
            Baixe o arquivo para imprimir em casa (link válido por 7 dias).
          </Text>
          <Text style={{ textAlign: "center", marginTop: "24px" }}>
            <Button
              href={downloadUrl}
              style={{
                backgroundColor: wine,
                color: cream,
                padding: "12px 20px",
                textDecoration: "none",
                borderRadius: "6px",
                display: "inline-block",
              }}
            >
              Baixar {label}
            </Button>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
