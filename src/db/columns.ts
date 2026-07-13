/**
 * KaziFlow — encrypted text column for Drizzle
 * ------------------------------------------------------------------
 * `encryptedText()` is a Drizzle custom column that transparently encrypts a
 * string field on write (INSERT/UPDATE) and decrypts it on read (SELECT). It
 * uses AES-256-GCM via the Node `crypto` module (the data layer is Node-only),
 * deriving the key from `APP_ENCRYPTION_KEY`.
 *
 * The stored value carries an `enc::` prefix (matching crypto.ts). Plaintext
 * or legacy values are passed through on read, and already-encrypted values
 * are never double-encrypted on write, so the column is safe to adopt on an
 * existing table.
 *
 * This is opt-in: existing schema columns continue to use route-level
 * `encryptConfigSecrets`. Swap a column to `encryptedText()` when you want the
 * database layer to own encryption.
 */
import { customType } from "drizzle-orm/pg-core";
import crypto from "crypto";

const ALGO = "aes-256-gcm";
const PREFIX = "enc::";

function getKey(): Buffer | null {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw) return null;
  return crypto.createHash("sha256").update(raw).digest();
}

function encrypt(plain: string | null): string | null {
  if (plain == null) return plain;
  if (plain.startsWith(PREFIX)) return plain; // idempotent
  const key = getKey();
  if (!key) return plain; // no key → store as-is (warn elsewhere)
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, enc]).toString("base64");
}

function decrypt(value: string | null): string | null {
  if (value == null || !value.startsWith(PREFIX)) return value;
  const key = getKey();
  if (!key) return value; // cannot decrypt without key
  try {
    const buf = Buffer.from(value.slice(PREFIX.length), "base64");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
  } catch {
    return value; // tampered/rotated key — leave as stored
  }
}

export const encryptedText = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return "text";
  },
  toDriver(value: string): string {
    return encrypt(value) ?? value;
  },
  fromDriver(value: string): string {
    return decrypt(value) ?? value;
  },
});
