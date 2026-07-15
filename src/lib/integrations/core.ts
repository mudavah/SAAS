/**
 * KaziFlow — Integration Hub core helpers
 * ------------------------------------------------------------------
 * Shared error type, RBAC guard, and secret encrypt/decrypt helpers scoped to
 * integration config/credentials. Kept internal to the module (not re-exported
 * from the public index except IntegrationError). Mirrors enterprise/core.ts.
 */
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { ServerContext } from "@/lib/session";
import { hasPermission, type PermissionKey } from "@/lib/rbac";
import { encryptSecret, decryptSecret, SECRET_FIELDS } from "@/lib/crypto";
import { getCatalogEntry } from "./catalog";

/** Carries an HTTP-style status so route handlers can map it directly. */
export class IntegrationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "IntegrationError";
    this.status = status;
  }
}

/** Throw a 403 unless the context holds the required permission. */
export function requirePermission(ctx: ServerContext, key: PermissionKey): void {
  if (!hasPermission(ctx.permissions as any, key)) {
    throw new IntegrationError(`Forbidden: requires '${key}'`, 403);
  }
}

/** Throw a 404 IntegrationError with the given message. */
export function notFound(message: string): never {
  throw new IntegrationError(message, 404);
}

// ── Secret encryption for integration credentials ─────────────────────────────
// The catalog declares which fields are secrets; we encrypt exactly those
// fields within `config`/`credentials` using the existing AES-256-GCM helper
// (enc:: prefix). Plaintext passes through when APP_ENCRYPTION_KEY is unset.

export function encryptIntegrationSecrets(
  provider: string,
  config: Record<string, unknown>,
  credentials: Record<string, unknown>
): { config: Record<string, unknown>; credentials: Record<string, unknown> } {
  const entry = getCatalogSecretFields(provider);
  const configOut = { ...config };
  const credOut = { ...credentials };
  for (const field of entry.configSecrets) {
    const v = configOut[field];
    if (typeof v === "string") configOut[field] = encryptSecret(v) ?? v;
  }
  for (const field of entry.credSecrets) {
    const v = credOut[field];
    if (typeof v === "string") credOut[field] = encryptSecret(v) ?? v;
  }
  return { config: configOut, credentials: credOut };
}

export function decryptIntegrationSecrets(
  provider: string,
  config: Record<string, unknown> | null | undefined,
  credentials: Record<string, unknown> | null | undefined
): { config: Record<string, unknown>; credentials: Record<string, unknown> } {
  if (!config && !credentials) {
    return { config: config ?? {}, credentials: credentials ?? {} };
  }
  const entry = getCatalogSecretFields(provider);
  const configOut = { ...(config ?? {}) };
  const credOut = { ...(credentials ?? {}) };
  for (const field of entry.configSecrets) {
    const v = configOut[field];
    if (typeof v === "string") configOut[field] = decryptSecret(v) ?? v;
  }
  for (const field of entry.credSecrets) {
    const v = credOut[field];
    if (typeof v === "string") credOut[field] = decryptSecret(v) ?? v;
  }
  return { config: configOut, credentials: credOut };
}

// Cache resolved secret-field lists per provider.
const secretFieldCache: Record<string, { configSecrets: string[]; credSecrets: string[] }> = {};

function getCatalogSecretFields(provider: string): {
  configSecrets: string[];
  credSecrets: string[];
} {
  if (secretFieldCache[provider]) return secretFieldCache[provider];
  const entry = getCatalogEntry(provider);
  const configSecrets = entry?.secretFields.filter((f) => f.type === "password" && !SECRET_FIELDS.includes(f.key as any)).map((f) => f.key) ?? [];
  const credSecrets = entry?.secretFields.filter((f) => SECRET_FIELDS.includes(f.key as any)).map((f) => f.key) ?? [];
  const resolved = { configSecrets, credSecrets };
  secretFieldCache[provider] = resolved;
  return resolved;
}

/** Best-effort org code for generating human-readable connection identifiers. */
export async function resolveOrgCode(organizationId: string): Promise<string> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
    columns: { slug: true },
  });
  const code = (org?.slug || "ORG")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
  return code || "ORG";
}
