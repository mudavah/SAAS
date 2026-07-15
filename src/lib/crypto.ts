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
  "tin",
  "pin",
] as const;

// ── Web Crypto (runtime-agnostic) field encryption ────────────────────────────
/**
 * `encryptField` / `decryptField` use the WHATWG Web Crypto API
 * (`crypto.subtle`) with AES-256-GCM. Unlike the Node-only `crypto` module
 * helpers above, these work in Edge runtimes (middleware, edge routes) as well
 * as Node 18+. The key is derived from `APP_ENCRYPTION_KEY` via SHA-256.
 *
 * Wire format: `enc2::<base64(iv | authTag | ciphertext)>`. The `enc2::` prefix
 * distinguishes it from the legacy Node `enc::` format, and lets us detect
 * plaintext values (which decrypt to themselves for backwards compatibility).
 */
const WEB_PREFIX = "enc2::";
const WEB_ALGO = "AES-GCM";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function getSubtle(): SubtleCrypto | null {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  return (c?.subtle as SubtleCrypto) ?? null;
}

async function deriveWebKey(): Promise<CryptoKey | null> {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw) return null;
  const subtle = getSubtle();
  if (!subtle) return null;
  const enc = new TextEncoder();
  const hash = await subtle.digest("SHA-256", enc.encode(raw));
  return subtle.importKey("raw", hash, { name: WEB_ALGO }, false, [
    "encrypt",
    "decrypt",
  ]);
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  return btoa(String.fromCharCode(...bytes));
}

function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(base64, "base64"));
  }
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

/** Encrypt a single sensitive field. Returns the input unchanged when no key is set. */
export async function encryptField(
  plain: string | undefined | null
): Promise<string | undefined | null> {
  if (plain == null) return plain;
  const key = await deriveWebKey();
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      console.warn("[crypto] APP_ENCRYPTION_KEY is not set; field stored in plaintext.");
    }
    return plain;
  }
  const subtle = getSubtle()!;
  const enc = new TextEncoder();
  const iv = (globalThis as { crypto: Crypto }).crypto.getRandomValues(
    new Uint8Array(IV_BYTES)
  );
  const ct = await subtle.encrypt(
    { name: WEB_ALGO, iv },
    key,
    enc.encode(plain)
  );
  const buf = new Uint8Array(ct);
  const ciphertextLen = buf.byteLength - TAG_BYTES;
  const out = new Uint8Array(IV_BYTES + TAG_BYTES + ciphertextLen);
  const ciphertext = buf.subarray(0, ciphertextLen);
  const tag = buf.subarray(ciphertextLen);
  out.set(iv, 0);
  out.set(tag, IV_BYTES);
  out.set(ciphertext, IV_BYTES + TAG_BYTES);
  return WEB_PREFIX + uint8ArrayToBase64(out);
}

/** Decrypt a single field produced by `encryptField`. Plaintext passes through. */
export async function decryptField(
  value: string | undefined | null
): Promise<string | undefined | null> {
  if (value == null || !value.startsWith(WEB_PREFIX)) return value;
  const key = await deriveWebKey();
  if (!key) {
    console.warn("[crypto] APP_ENCRYPTION_KEY missing; cannot decrypt field.");
    return value;
  }
  const subtle = getSubtle()!;
  const bytes = base64ToUint8Array(value.slice(WEB_PREFIX.length));
  const iv = bytes.subarray(0, IV_BYTES);
  const ivBuffer = new ArrayBuffer(iv.byteLength);
  new Uint8Array(ivBuffer).set(iv);
  const tag = bytes.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = bytes.subarray(IV_BYTES + TAG_BYTES);
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext, 0);
  combined.set(tag, ciphertext.length);
  const pt = await subtle.decrypt(
    { name: WEB_ALGO, iv: ivBuffer, additionalData: undefined, tagLength: 128 },
    key,
    combined as any
  );
  return new TextDecoder().decode(pt);
}

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

export function simpleChecksum(value: unknown): string {
  const raw = typeof value === "string" ? value : JSON.stringify(value ?? "");
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = (h << 5) - h + raw.charCodeAt(i);
    h |= 0;
  }
  return String(h);
}
