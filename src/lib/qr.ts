import QRCode from "qrcode";

/**
 * Generates a base64 Data URL for a given URL or text string.
 */
export async function generateQrDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 260,
      margin: 2,
      color: {
        dark: "#0f766e", // teal-700
        light: "#ffffff",
      },
    });
  } catch (err) {
    console.error("QR Code generation error:", err);
    return "";
  }
}
