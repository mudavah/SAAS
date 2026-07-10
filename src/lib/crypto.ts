import crypto from "crypto";

/**
 * Encrypts sensitive provider secrets (API keys, passkeys, webhook secrets)
 * at rest in the database. Uses AES-256-GCM. Values are stored with an
 * `enc::` prefix so plaintext (legacy) values decrypt as-is.
 *
 * Set `APP_ENCRYPTION_KEY` (any string; hashed to 32 bytes) in production.
 * Without it, secrets are stored in plaintext and a warning is logged.
 */
const ALGO = "aes-256-gcm";
const PREFIX = "enc::";

function getKey(): Buffer | null {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw) return null;
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptSecret(plain: string | undefined | null): string | undefined | null {
  if (plain == null) return plain;
  const key = getKey();
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      console.warn("[crypto] APP_ENCRYPTION_KEY is not set; provider secrets stored in plaintext.");
    }
    return plain;
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptSecret(value: string | undefined | null): string | undefined | null {
  if (value == null || !value.startsWith(PREFIX)) return value;
  const key = getKey();
  if (!key) {
    console.warn("[crypto] APP_ENCRYPTION_KEY missing; cannot decrypt secret.");
    return value;
  }
  const buf = Buffer.from(value.slice(PREFIX.length), "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

export const SECRET_FIELDS = [
  "apiKey",
  "apiSecret",
  "passkey",
  "webhookSecret",
  "securityCredential",
] as const;

export function encryptConfigSecrets<T extends object>(config: T): T {
  const out = { ...config };
  for (const field of SECRET_FIELDS) {
    const v = (out as Record<string, unknown>)[field];
    if (typeof v === "string") {
      (out as Record<string, unknown>)[field] = encryptSecret(v);
    }
  }
  return out;
}

export function decryptConfigSecrets<T extends object>(config: T | null | undefined): T | null | undefined {
  if (!config) return config;
  const out = { ...config };
  for (const field of SECRET_FIELDS) {
    const v = (out as Record<string, unknown>)[field];
    if (typeof v === "string") {
      (out as Record<string, unknown>)[field] = decryptSecret(v);
    }
  }
  return out as T;
}
