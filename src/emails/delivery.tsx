import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type DeliveryEmailProps = {
  name1: string;
  name2: string;
  pageUrl: string;
  editUrl: string | null;
  qrCid: string | null;
  supportEmail: string | null;
  supportWhatsapp: string | null;
};

const wine = "#6b1e36";
const wineDeep = "#4a1425";
const cream = "#f7f0e8";
const textMuted = "#6b4a55";

export function DeliveryEmail({
  name1,
  name2,
  pageUrl,
  editUrl,
  qrCid,
  supportEmail,
  supportWhatsapp,
}: DeliveryEmailProps) {
  const names = `${name1} & ${name2}`;
  const supportBits: { label: string; href: string }[] = [];
  if (supportEmail) {
    supportBits.push({ label: supportEmail, href: `mailto:${supportEmail}` });
  }
  if (supportWhatsapp) {
    const wa = supportWhatsapp.replace(/\D/g, "");
    supportBits.push({ label: "WhatsApp", href: `https://wa.me/${wa}` });
  }

  return (
    <Html>
      <Head />
      <Preview>Presente liberado — {names}</Preview>
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
            style={{
              textAlign: "center",
              color: wineDeep,
              fontSize: "28px",
              margin: "8px 0 24px",
            }}
          >
            Presente liberado
          </Heading>
          <Text style={{ textAlign: "center" }}>{names}</Text>

          {qrCid ? (
            <Img
              src={`cid:${qrCid}`}
              alt="QR Code"
              width={180}
              height={180}
              style={{
                display: "block",
                margin: "16px auto",
                border: `2px solid ${wine}`,
                padding: "8px",
                backgroundColor: "#fff",
              }}
            />
          ) : null}

          <Section style={{ textAlign: "center" }}>
            <Link href={pageUrl} style={{ color: wine }}>
              Abrir página do casal
            </Link>
          </Section>
          <Text
            style={{
              textAlign: "center",
              fontSize: "13px",
              color: textMuted,
              wordBreak: "break-all",
            }}
          >
            {pageUrl}
          </Text>

          {editUrl ? (
            <Text
              style={{
                textAlign: "center",
                marginTop: "24px",
                fontSize: "14px",
              }}
            >
              Editar por 7 dias:
              <br />
              <Link href={editUrl} style={{ color: wine }}>
                {editUrl}
              </Link>
            </Text>
          ) : null}

          {supportBits.length ? (
            <>
              <Hr style={{ borderColor: "#e4d5c4", marginTop: "32px" }} />
              <Text
                style={{
                  textAlign: "center",
                  fontSize: "12px",
                  color: textMuted,
                }}
              >
                Suporte:{" "}
                {supportBits.map((b, i) => (
                  <span key={b.href}>
                    {i > 0 ? " · " : ""}
                    <Link href={b.href} style={{ color: textMuted }}>
                      {b.label}
                    </Link>
                  </span>
                ))}
              </Text>
            </>
          ) : null}
        </Container>
      </Body>
    </Html>
  );
}
