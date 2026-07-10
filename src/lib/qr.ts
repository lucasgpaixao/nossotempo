import QRCode from "qrcode";

/** Gera PNG do QR (alta correção de erro) apontando para a URL da página. */
export async function generateQrPng(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: "png",
    errorCorrectionLevel: "H",
    margin: 2,
    width: 512,
    color: {
      dark: "#4a1425",
      light: "#ffffff",
    },
  });
}
