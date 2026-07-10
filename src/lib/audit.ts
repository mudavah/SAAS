/**
 * KaziFlow — audit logging
 * ------------------------------------------------------------------
 * Centralized, append-only audit trail. Every security- and business-critical
 * action should call `createAuditLog` (or `logAudit` with a context). Records
 * are immutable and organization-scoped. Never update/delete audit rows.
 */
import { db } from "@/db";
import { auditLogs, type AuditCategory } from "@/db/schema";
import type { ServerContext } from "@/lib/session";

export interface AuditLogInput {
  action: string;
  category: AuditCategory;
  organizationId?: string | null;
  userId?: string | null;
  resourceType?: string;
  resourceId?: string;
  description?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/** Write an audit record. Throws on failure so callers can decide to roll back. */
export async function createAuditLog(input: AuditLogInput): Promise<void> {
  await db.insert(auditLogs).values({
    action: input.action,
    category: input.category,
    organizationId: input.organizationId ?? null,
    userId: input.userId ?? null,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    description: input.description,
    oldValues: input.oldValues,
    newValues: input.newValues,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: input.metadata,
  });
}

/** Write an audit record from a request context, filling actor + request meta. */
export async function logAudit(
  ctx: ServerContext,
  input: Omit<AuditLogInput, "organizationId" | "userId" | "ipAddress" | "userAgent">
): Promise<void> {
  await createAuditLog({
    ...input,
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    ipAddress: ctx.ip,
    userAgent: ctx.userAgent,
  });
}

/** Fire-and-forget variant that swallows errors (best-effort logging). */
export async function logAuditSafe(
  ctx: ServerContext,
  input: Omit<AuditLogInput, "organizationId" | "userId" | "ipAddress" | "userAgent">
): Promise<void> {
  try {
    await logAudit(ctx, input);
  } catch (err) {
    console.error("Audit log failed:", err);
  }
}
