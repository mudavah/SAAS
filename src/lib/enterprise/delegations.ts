/**
 * KaziFlow — Delegated Administration
 * ------------------------------------------------------------------
 * Allows an organization owner/admin to grant limited administrative powers to
 * another member (org-wide or scoped to a single branch) for a bounded period.
 * Delegations are additive to the existing RBAC system: an active delegation
 * contributes its permission set when evaluating access for the delegate.
 */
import { db } from "@/db";
import {
  enterpriseDelegations,
  enterpriseBranches,
  users,
  organizations,
} from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import type { ServerContext } from "@/lib/session";
import { requirePermission } from "./core";
import { logAuditSafe } from "@/lib/audit";

const VALID_PERMISSIONS = [
  "enterprise.view",
  "enterprise.branches.manage",
  "enterprise.members.manage",
  "enterprise.pricing.manage",
  "enterprise.transfers.manage",
  "enterprise.sales.manage",
  "enterprise.procurement.manage",
  "enterprise.reports.view",
  "enterprise.approvals.manage",
  "enterprise.approvals.approve",
  "enterprise.settings.manage",
] as const;

export interface DelegationInput {
  delegateId: string;
  scope: "organization" | "branch";
  branchId?: string;
  permissions: string[];
  expiresAt?: Date | null;
}

function isActive(d: {
  status: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
}): boolean {
  if (d.status !== "active") return false;
  if (d.revokedAt) return false;
  if (d.expiresAt && d.expiresAt.getTime() <= Date.now()) return false;
  return true;
}

/** List active + historical delegations for the organization. */
export async function listDelegations(ctx: ServerContext) {
  requirePermission(ctx, "enterprise.delegations.manage");
  const rows = await db.query.enterpriseDelegations.findMany({
    where: eq(enterpriseDelegations.organizationId, ctx.organizationId),
    orderBy: (t) => [desc(t.createdAt)],
    with: {
      delegate: { columns: { id: true, name: true, email: true, image: true } },
      granter: { columns: { id: true, name: true, email: true } },
    },
  });
  return rows.map((d) => ({ ...d, active: isActive(d) }));
}

/** Create a delegated administration grant. */
export async function createDelegation(ctx: ServerContext, input: DelegationInput) {
  requirePermission(ctx, "enterprise.delegations.manage");
  const organizationId = ctx.organizationId;

  if (!input.delegateId) throw new Error("A delegate member is required.");
  const permissions = input.permissions.filter((p) =>
    (VALID_PERMISSIONS as readonly string[]).includes(p)
  );
  if (permissions.length === 0) throw new Error("At least one permission must be granted.");

  if (input.scope === "branch") {
    if (!input.branchId) throw new Error("Branch scope requires a branchId.");
    const branch = await db.query.enterpriseBranches.findFirst({
      where: and(
        eq(enterpriseBranches.id, input.branchId),
        eq(enterpriseBranches.organizationId, organizationId)
      ),
    });
    if (!branch) throw new Error("Branch not found.");
  }

  const [row] = await db
    .insert(enterpriseDelegations)
    .values({
      organizationId,
      granterId: ctx.userId!,
      delegateId: input.delegateId,
      scope: input.scope,
      branchId: input.scope === "branch" ? input.branchId! : null,
      permissions,
      expiresAt: input.expiresAt ?? null,
      status: "active",
    })
    .returning();

  await logAuditSafe(ctx, {
    action: "enterprise_delegation.create",
    category: "enterprise",
    resourceType: "enterprise_delegation",
    resourceId: row.id,
    description: `Granted delegated admin to member ${input.delegateId}`,
    newValues: { scope: input.scope, permissions, expiresAt: input.expiresAt },
  });

  return row;
}

/** Revoke a delegation. */
export async function revokeDelegation(ctx: ServerContext, id: string) {
  requirePermission(ctx, "enterprise.delegations.manage");
  const [row] = await db
    .update(enterpriseDelegations)
    .set({ status: "revoked", revokedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(enterpriseDelegations.id, id),
        eq(enterpriseDelegations.organizationId, ctx.organizationId)
      )
    )
    .returning();
  if (row) {
    await logAuditSafe(ctx, {
      action: "enterprise_delegation.revoke",
      category: "enterprise",
      resourceType: "enterprise_delegation",
      resourceId: row.id,
      description: "Revoked delegated admin grant",
    });
  }
  return row;
}

/**
 * Resolve the effective extra permissions a user holds via active delegations
 * within an organization. Returns a de-duplicated permission list (may be empty).
 */
export async function resolveDelegatedPermissions(
  organizationId: string,
  userId: string
): Promise<string[]> {
  const rows = await db.query.enterpriseDelegations.findMany({
    where: and(
      eq(enterpriseDelegations.organizationId, organizationId),
      eq(enterpriseDelegations.delegateId, userId),
      eq(enterpriseDelegations.status, "active")
    ),
  });
  const perms = new Set<string>();
  for (const d of rows) {
    if (!isActive(d)) continue;
    for (const p of d.permissions) perms.add(p);
  }
  return Array.from(perms);
}

/** Enterprise audit log viewer (reads the shared audit_logs table). */
export async function listEnterpriseAudit(ctx: ServerContext, opts: {
  category?: string;
  action?: string;
  resourceType?: string;
  limit?: number;
  offset?: number;
} = {}) {
  requirePermission(ctx, "enterprise.audit.view");
  const { auditLogs } = await import("@/db/schema");
  const where = and(
    eq(auditLogs.organizationId, ctx.organizationId),
    opts.category ? eq(auditLogs.category as any, opts.category) : undefined
  );
  const rows = await db.query.auditLogs.findMany({
    where,
    orderBy: (t) => [desc(t.createdAt)],
    limit: Math.min(100, opts.limit ?? 50),
    offset: opts.offset ?? 0,
    with: { user: { columns: { id: true, name: true, email: true } } },
  });
  return rows;
}
