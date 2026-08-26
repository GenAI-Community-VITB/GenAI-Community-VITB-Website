import crypto from "crypto";

interface IdempotencyRecord {
  timestamp: number;
  responsePayload: any;
  status: number;
}

const idempotencyStore = new Map<string, IdempotencyRecord>();

// Evict keys older than 15 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of idempotencyStore.entries()) {
      if (now - record.timestamp > 15 * 60 * 1000) {
        idempotencyStore.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

/**
 * Computes a unique hash for a registration request payload.
 */
export function generateRegistrationFingerprint(params: {
  eventId: string;
  personalEmail: string;
  transactionId: string;
  vitRegistrationNumber: string;
}): string {
  const raw = `${params.eventId.trim()}:${params.personalEmail.trim().toLowerCase()}:${params.transactionId.trim()}:${params.vitRegistrationNumber.trim().toUpperCase()}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Checks if a payload was already processed recently (within 15 minutes).
 */
export function checkIdempotency(fingerprint: string): IdempotencyRecord | null {
  const record = idempotencyStore.get(fingerprint);
  if (!record) return null;

  const now = Date.now();
  if (now - record.timestamp > 15 * 60 * 1000) {
    idempotencyStore.delete(fingerprint);
    return null;
  }

  return record;
}

/**
 * Stores the response payload for a processed idempotency fingerprint.
 */
export function saveIdempotencyRecord(
  fingerprint: string,
  responsePayload: any,
  status: number = 200
): void {
  idempotencyStore.set(fingerprint, {
    timestamp: Date.now(),
    responsePayload,
    status,
  });
}
