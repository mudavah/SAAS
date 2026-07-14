/**
 * KaziFlow — Enterprise & Multi-Branch core helpers
 * ------------------------------------------------------------------
 * Shared error type, RBAC guard, and sequential document-number generation
 * used by the enterprise service modules. Kept internal (not re-exported) so
 * the public surface is only the domain functions declared in the submodules.
 */
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { and, count, eq, gte, lt } from "drizzle-orm";
import type { ServerContext } from "@/lib/session";
import { hasPermission, type PermissionKey } from "@/lib/rbac";
import type { SQL } from "drizzle-orm";

/** Carries an HTTP-style status so route handlers can map it directly. */
export class EnterpriseError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "EnterpriseError";
    this.status = status;
  }
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Resolve a short uppercase org code from the organization slug. */
async function resolveOrgCode(organizationId: string): Promise<string> {
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

/**
 * Generate a document number of the form:
 *   {PREFIX}-{ORG_CODE}-{YYYYMMDD}-{SEQ}
 * SEQ is the count of the same-prefix documents created by the organization
 * today, plus one, zero-padded to 4 digits.
 */
export async function generateNumber(
  prefix: string,
  table: { organizationId: SQL | unknown; createdAt?: unknown } | any,
  dateColumn: any,
  organizationId: string
): Promise<string> {
  const orgCode = await resolveOrgCode(organizationId);
  const now = new Date();
  const ymd = `${now.getUTCFullYear()}${pad2(now.getUTCMonth() + 1)}${pad2(now.getUTCDate())}`;
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const [row] = await db
    .select({ c: count() })
    .from(table)
    .where(
      and(
        eq(table.organizationId, organizationId),
        gte(dateColumn, start),
        lt(dateColumn, end)
      )
    );

  const seq = (Number(row?.c || 0) + 1).toString().padStart(4, "0");
  return `${prefix}-${orgCode}-${ymd}-${seq}`;
}

/** Throw a 403 unless the context holds the required permission. */
export function requirePermission(ctx: ServerContext, key: PermissionKey): void {
  if (!hasPermission(ctx.permissions as any, key)) {
    throw new EnterpriseError(`Forbidden: requires '${key}'`, 403);
  }
}

/** Throw a 404 EnterpriseError with the given message. */
export function notFound(message: string): never {
  throw new EnterpriseError(message, 404);
}
