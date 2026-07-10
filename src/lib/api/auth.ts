/**
 * KaziFlow Public API — authentication & authorization
 * ------------------------------------------------------------------
 * Verifies API keys (sent as `Authorization: Bearer kf_...` or `X-API-Key`),
 * resolves the owning organization and granted scopes, and checks scopes
 * (which are a subset of RBAC permission keys). Rate limiting lives in
 * ./rate-limit.ts. Usage is tracked in the `api_usage` table.
 */
import bcrypt from "bcryptjs";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import type { PermissionKey } from "@/lib/rbac/permissions";

const KEY_PREFIX_LENGTH = 12;

export interface ApiPrincipal {
  apiKeyId: string;
  organizationId: string;
  name: string;
  scopes: string[];
}

/** Generate a new API secret. Format: kf_<env>_<random>. */
export function generateApiSecret(env: "live" | "test" = "live"): {
  secret: string;
  prefix: string;
} {
  const random = crypto
    .getRandomValues(new Uint8Array(24))
    .reduce((acc, b) => acc + b.toString(16).padStart(2, "0"), "")
    .slice(0, 32);
  const secret = `kf_${env}_${random}`;
  return { secret, prefix: secret.slice(0, KEY_PREFIX_LENGTH) };
}

export async function hashApiSecret(secret: string): Promise<string> {
  return bcrypt.hash(secret, 10);
}

export function extractApiCredentials(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return auth.slice(7).trim();
  }
  const header = req.headers.get("x-api-key");
  return header?.trim() || null;
}

/** Resolve a raw API secret to a principal, validating status & expiry. */
export async function verifyApiKey(
  secret: string
): Promise<{ principal: ApiPrincipal; key: typeof apiKeys.$inferSelect } | null> {
  const prefix = secret.slice(0, KEY_PREFIX_LENGTH);
  const key = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.keyPrefix, prefix),
  });
  if (!key) return null;

  const valid = await bcrypt.compare(secret, key.secretHash);
  if (!valid) return null;

  if (key.status !== "active") return null;
  if (key.expiresAt && key.expiresAt.getTime() < Date.now()) return null;

  return {
    principal: {
      apiKeyId: key.id,
      organizationId: key.organizationId,
      name: key.name,
      scopes: key.scopes ?? [],
    },
    key,
  };
}

/**
 * Check whether a principal's scopes satisfy a required permission.
 * A literal "*" scope grants everything.
 */
export function principalHasScope(
  principal: ApiPrincipal,
  required: PermissionKey
): boolean {
  if (principal.scopes.includes("*")) return true;
  return principal.scopes.includes(required);
}

/** Touch last_used_at without blocking the request. */
export async function markApiKeyUsed(apiKeyId: string): Promise<void> {
  try {
    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, apiKeyId));
  } catch {
    // best-effort
  }
}

export const API_KEY_PREFIX_LENGTH = KEY_PREFIX_LENGTH;

// Re-export for callers that build scope checks.
export { and, gt };
