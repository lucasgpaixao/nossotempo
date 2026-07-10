import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

const wine = "#6b1e36";
const wineDeep = "#4a1425";
const cream = "#f7f0e8";

const styles = StyleSheet.create({
  page: {
    backgroundColor: cream,
    paddingTop: 64,
    paddingBottom: 48,
    paddingHorizontal: 56,
    fontFamily: "Helvetica",
  },
  brand: {
    fontSize: 10,
    color: wine,
    letterSpacing: 3,
    textAlign: "center",
    marginBottom: 28,
  },
  title: {
    fontSize: 24,
    color: wineDeep,
    textAlign: "center",
    marginBottom: 32,
  },
  message: {
    fontSize: 13,
    lineHeight: 1.7,
    color: "#2a1520",
    textAlign: "left",
  },
  footer: {
    marginTop: 40,
    alignItems: "center",
  },
  frame: {
    borderWidth: 2,
    borderColor: wine,
    padding: 16,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  qr: {
    width: 120,
    height: 120,
  },
  names: {
    marginTop: 10,
    fontSize: 12,
    color: wineDeep,
  },
  hint: {
    marginTop: 4,
    fontSize: 9,
    color: "#6b4a55",
  },
});

export type LetterPdfProps = {
  name1: string;
  name2: string;
  message: string;
  qrDataUrl: string;
  pageUrl: string;
};

export function LetterPdf({
  name1,
  name2,
  message,
  qrDataUrl,
  pageUrl,
}: LetterPdfProps) {
  const names = `${name1} & ${name2}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>NOSSO TEMPO</Text>
        <Text style={styles.title}>{names}</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.footer}>
          <View style={styles.frame}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={qrDataUrl} style={styles.qr} />
            <Text style={styles.names}>{names}</Text>
            <Text style={styles.hint}>Escaneie o QR · {pageUrl}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
