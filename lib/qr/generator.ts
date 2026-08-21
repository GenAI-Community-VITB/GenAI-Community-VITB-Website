import QRCode from "qrcode";
import crypto from "crypto";

/**
 * Generates a secure, cryptographically random opaque token for event check-in.
 * Does NOT contain student email, phone, transaction ID or sensitive personal data.
 */
export function generateSecureQRToken(): string {
  const randomBytes = crypto.randomBytes(24).toString("hex").toUpperCase();
  return `GENAI_QR_${randomBytes}`;
}

/**
 * Renders a QR code as a PNG Buffer from the opaque token.
 */
export async function generateQRCodeBuffer(token: string): Promise<Buffer> {
  const buffer = await QRCode.toBuffer(token, {
    errorCorrectionLevel: "H",
    type: "png",
    margin: 2,
    width: 400,
    color: {
      dark: "#080808",
      light: "#ffffff",
    },
  });
  return buffer;
}

/**
 * Renders a QR code as a base64 Data URL string from the opaque token.
 */
export async function generateQRCodeDataUrl(token: string): Promise<string> {
  const dataUrl = await QRCode.toDataURL(token, {
    errorCorrectionLevel: "H",
    type: "image/png",
    margin: 2,
    width: 400,
    color: {
      dark: "#080808",
      light: "#ffffff",
    },
  });
  return dataUrl;
}

/**
 * Generates an Entry Pass QR Code buffer from parameters.
 */
export async function generateEntryPassQRCodeBuffer(params: {
  qrToken: string;
  registrationNumber?: string;
  fullName?: string;
  vitRegNumber?: string;
}): Promise<Buffer> {
  return generateQRCodeBuffer(params.qrToken);
}
