import QRCode from "qrcode";
import CryptoJS from "crypto-js";

// Use environment variable for encryption key
const ENCRYPTION_KEY = process.env.QR_ENCRYPTION_KEY || "default-qr-encryption-key";

// QR Code configuration
const QR_OPTIONS = {
  errorCorrectionLevel: 'M' as const,
  type: 'image/png' as const,
  quality: 0.92,
  margin: 1,
  color: {
    dark: '#000000',
    light: '#FFFFFF'
  },
  width: 256,
};

// Generate encrypted QR code for ticket
export async function generateQRCode(
  ticketId: string,
  eventId: string,
  userId: string,
  version: number = 1
) {
  try {
    // Create payload with essential ticket information
    const payload = {
      ticketId,
      eventId,
      userId,
      timestamp: Date.now(),
      version,
      // Add HMAC for additional security
      hmac: generateHMAC(ticketId, eventId, userId, version),
    };

    // Encrypt the payload
    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(payload),
      ENCRYPTION_KEY
    ).toString();

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(encrypted, QR_OPTIONS);

    return {
      encrypted,
      qrCodeDataUrl,
      qrVersion: version,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("QR Code generation error:", error);
    throw new Error("Failed to generate QR code");
  }
}

// Validate QR code data
export function validateQRCode(qrData: string, currentVersion: number) {
  try {
    // Decrypt the QR data
    const bytes = CryptoJS.AES.decrypt(qrData, ENCRYPTION_KEY);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedText) {
      return { valid: false, reason: "Invalid QR data" };
    }

    const payload = JSON.parse(decryptedText);

    // Validate payload structure
    if (!payload.ticketId || !payload.eventId || !payload.userId || !payload.version) {
      return { valid: false, reason: "Invalid payload structure" };
    }

    // Check version
    if (payload.version !== currentVersion) {
      return { valid: false, reason: "QR version mismatch" };
    }

    // Verify HMAC
    const expectedHmac = generateHMAC(
      payload.ticketId,
      payload.eventId,
      payload.userId,
      payload.version
    );

    if (payload.hmac !== expectedHmac) {
      return { valid: false, reason: "HMAC verification failed" };
    }

    // Check timestamp (QR codes expire after 24 hours for security)
    const qrAge = Date.now() - payload.timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (qrAge > maxAge) {
      return { valid: false, reason: "QR code expired" };
    }

    return {
      valid: true,
      payload: {
        ticketId: payload.ticketId,
        eventId: payload.eventId,
        userId: payload.userId,
        timestamp: payload.timestamp,
        version: payload.version,
      },
    };
  } catch (error) {
    console.error("QR validation error:", error);
    return { valid: false, reason: "Invalid QR data format" };
  }
}

// Generate HMAC for additional security
function generateHMAC(ticketId: string, eventId: string, userId: string, version: number) {
  const data = `${ticketId}:${eventId}:${userId}:${version}`;
  return CryptoJS.HmacSHA256(data, ENCRYPTION_KEY).toString();
}

// Regenerate QR code with new version (for transfers)
export async function regenerateQRCode(
  ticketId: string,
  eventId: string,
  userId: string,
  newVersion: number
) {
  return generateQRCode(ticketId, eventId, userId, newVersion);
}

// Extract QR data without full validation (for debugging)
export function extractQRData(qrData: string) {
  try {
    const bytes = CryptoJS.AES.decrypt(qrData, ENCRYPTION_KEY);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedText);
  } catch (error) {
    return null;
  }
}
