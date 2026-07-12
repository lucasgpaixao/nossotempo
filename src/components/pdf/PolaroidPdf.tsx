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
    padding: 36,
    fontFamily: "Helvetica",
  },
  title: {
    fontSize: 22,
    color: wineDeep,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 11,
    color: wine,
    textAlign: "center",
    marginBottom: 24,
    letterSpacing: 2,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 18,
  },
  polaroid: {
    width: 220,
    backgroundColor: "#fff",
    padding: 10,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: "#e5d5c5",
  },
  photo: {
    width: 200,
    height: 240,
    objectFit: "cover",
  },
  caption: {
    marginTop: 10,
    fontSize: 10,
    color: wineDeep,
    textAlign: "center",
  },
  qrPage: {
    backgroundColor: cream,
    padding: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  frame: {
    borderWidth: 3,
    borderColor: wine,
    padding: 24,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  qr: {
    width: 220,
    height: 220,
  },
  names: {
    marginTop: 16,
    fontSize: 16,
    color: wineDeep,
    textAlign: "center",
  },
  hint: {
    marginTop: 8,
    fontSize: 10,
    color: "#6b4a55",
    textAlign: "center",
  },
});

export type PolaroidPdfProps = {
  name1: string;
  name2: string;
  photoDataUrls: string[];
  qrDataUrl: string;
  pageUrl: string;
};

const PHOTOS_PER_PAGE = 3;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export function PolaroidPdf({
  name1,
  name2,
  photoDataUrls,
  qrDataUrl,
  pageUrl,
}: PolaroidPdfProps) {
  const names = `${name1} & ${name2}`;
  const photoPages = chunk(photoDataUrls.slice(0, 6), PHOTOS_PER_PAGE);

  return (
    <Document>
      {photoPages.map((pagePhotos, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          <Text style={styles.subtitle}>NOSSO TEMPO</Text>
          <Text style={styles.title}>{names}</Text>
          <View style={styles.grid}>
            {pagePhotos.map((src, i) => (
              <View key={i} style={styles.polaroid} wrap={false}>
                {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image */}
                <Image src={src} style={styles.photo} />
                <Text style={styles.caption}>{names}</Text>
              </View>
            ))}
          </View>
        </Page>
      ))}
      <Page size="A4" style={styles.qrPage}>
        <View style={styles.frame}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={qrDataUrl} style={styles.qr} />
          <Text style={styles.names}>{names}</Text>
          <Text style={styles.hint}>Escaneie para abrir a página</Text>
          <Text style={[styles.hint, { marginTop: 4, fontSize: 8 }]}>
            {pageUrl}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
