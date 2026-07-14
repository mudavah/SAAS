/**
 * KaziFlow — Enterprise Branches service
 * ------------------------------------------------------------------
 * CRUD for multi-branch organizations. Every query is scoped by
 * organizationId; mutations require `enterprise.branches.manage` (or
 * `enterprise.view` for reads) and are audited + emitted to the timeline.
 */
import { db } from "@/db";
import {
  enterpriseBranches,
  branchMembers,
  type EnterpriseBranch,
  type BranchType,
  type BranchStatus,
} from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import type { ServerContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { emitTimelineEvent } from "@/lib/timeline";
import { EnterpriseError, requirePermission, notFound } from "./core";

export interface CreateBranchInput {
  name: string;
  code: string;
  type?: BranchType;
  status?: BranchStatus;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  managerId?: string;
  timezone?: string;
  currency?: string;
  taxId?: string;
  settings?: Record<string, unknown>;
  isDefault?: boolean;
}

export interface UpdateBranchInput {
  name?: string;
  code?: string;
  type?: BranchType;
  status?: BranchStatus;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  managerId?: string | null;
  timezone?: string;
  currency?: string;
  taxId?: string;
  settings?: Record<string, unknown>;
  isDefault?: boolean;
}

export async function createBranch(
  ctx: ServerContext,
  data: CreateBranchInput
): Promise<EnterpriseBranch> {
  requirePermission(ctx, "enterprise.branches.manage");
  if (!data.name || !data.code) {
    throw new EnterpriseError("name and code are required", 400);
  }

  const existing = await db.query.enterpriseBranches.findFirst({
    where: and(
      eq(enterpriseBranches.organizationId, ctx.organizationId),
      eq(enterpriseBranches.code, data.code)
    ),
    columns: { id: true },
  });
  if (existing) {
    throw new EnterpriseError("A branch with this code already exists", 409);
  }

  const [branch] = await db
    .insert(enterpriseBranches)
    .values({
      organizationId: ctx.organizationId,
      userId: ctx.userId!,
      name: data.name,
      code: data.code,
      type: data.type ?? "retail",
      status: data.status ?? "active",
      address: data.address ?? null,
      city: data.city ?? null,
      country: data.country ?? "Kenya",
      phone: data.phone ?? null,
      email: data.email ?? null,
      managerId: data.managerId ?? null,
      timezone: data.timezone ?? "Africa/Nairobi",
      currency: data.currency ?? "KES",
      taxId: data.taxId ?? null,
      settings: data.settings ?? {},
      isDefault: data.isDefault ?? false,
    })
    .returning();

  await logAuditSafe(ctx, {
    action: "enterprise.branch.create",
    category: "enterprise",
    resourceType: "enterprise_branch",
    resourceId: branch.id,
    description: `Created branch ${branch.name} (${branch.code})`,
    newValues: { name: branch.name, code: branch.code, type: branch.type },
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "enterprise.branch.created",
    title: `Branch ${branch.name} created`,
    description: branch.code,
    resourceType: "enterprise_branch",
    resourceId: branch.id,
  });

  return branch;
}

export async function getBranch(
  ctx: ServerContext,
  branchId: string
): Promise<EnterpriseBranch> {
  requirePermission(ctx, "enterprise.view");
  const branch = await db.query.enterpriseBranches.findFirst({
    where: and(
      eq(enterpriseBranches.id, branchId),
      eq(enterpriseBranches.organizationId, ctx.organizationId)
    ),
  });
  if (!branch) notFound("Branch not found");
  return branch;
}

export interface ListBranchesOptions {
  status?: BranchStatus;
  type?: BranchType;
  includeInactive?: boolean;
}

export async function listBranches(
  ctx: ServerContext,
  opts: ListBranchesOptions = {}
): Promise<EnterpriseBranch[]> {
  requirePermission(ctx, "enterprise.view");
  const conditions = [
    eq(enterpriseBranches.organizationId, ctx.organizationId),
    opts.status ? eq(enterpriseBranches.status, opts.status) : undefined,
    opts.type ? eq(enterpriseBranches.type, opts.type) : undefined,
    opts.includeInactive ? undefined : undefined,
  ].filter(Boolean) as ReturnType<typeof eq>[];

  return db.query.enterpriseBranches.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    orderBy: [desc(enterpriseBranches.isDefault), desc(enterpriseBranches.createdAt)],
  });
}

export async function updateBranch(
  ctx: ServerContext,
  branchId: string,
  data: UpdateBranchInput
): Promise<EnterpriseBranch> {
  requirePermission(ctx, "enterprise.branches.manage");
  const branch = await db.query.enterpriseBranches.findFirst({
    where: and(
      eq(enterpriseBranches.id, branchId),
      eq(enterpriseBranches.organizationId, ctx.organizationId)
    ),
  });
  if (!branch) notFound("Branch not found");

  if (data.code && data.code !== branch.code) {
    const clash = await db.query.enterpriseBranches.findFirst({
      where: and(
        eq(enterpriseBranches.organizationId, ctx.organizationId),
        eq(enterpriseBranches.code, data.code)
      ),
      columns: { id: true },
    });
    if (clash) throw new EnterpriseError("A branch with this code already exists", 409);
  }

  const [updated] = await db
    .update(enterpriseBranches)
    .set({
      name: data.name ?? branch.name,
      code: data.code ?? branch.code,
      type: data.type ?? branch.type,
      status: data.status ?? branch.status,
      address: data.address !== undefined ? data.address : branch.address,
      city: data.city !== undefined ? data.city : branch.city,
      country: data.country ?? branch.country,
      phone: data.phone !== undefined ? data.phone : branch.phone,
      email: data.email !== undefined ? data.email : branch.email,
      managerId: data.managerId !== undefined ? data.managerId : branch.managerId,
      timezone: data.timezone ?? branch.timezone,
      currency: data.currency ?? branch.currency,
      taxId: data.taxId !== undefined ? data.taxId : branch.taxId,
      settings: data.settings ?? branch.settings,
      isDefault: data.isDefault ?? branch.isDefault,
      updatedAt: new Date(),
    })
    .where(eq(enterpriseBranches.id, branchId))
    .returning();

  await logAuditSafe(ctx, {
    action: "enterprise.branch.update",
    category: "enterprise",
    resourceType: "enterprise_branch",
    resourceId: branchId,
    description: `Updated branch ${updated.name}`,
    newValues: { name: updated.name, code: updated.code, status: updated.status },
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "enterprise.branch.updated",
    title: `Branch ${updated.name} updated`,
    resourceType: "enterprise_branch",
    resourceId: branchId,
  });

  return updated;
}

export async function deleteBranch(
  ctx: ServerContext,
  branchId: string
): Promise<{ id: string; deleted: true }> {
  requirePermission(ctx, "enterprise.branches.manage");
  const branch = await db.query.enterpriseBranches.findFirst({
    where: and(
      eq(enterpriseBranches.id, branchId),
      eq(enterpriseBranches.organizationId, ctx.organizationId)
    ),
    with: { members: { columns: { id: true } } },
  });
  if (!branch) notFound("Branch not found");
  if (branch.isDefault) {
    throw new EnterpriseError("Cannot delete the default branch", 400);
  }

  await db
    .delete(branchMembers)
    .where(
      and(
        eq(branchMembers.branchId, branchId),
        eq(branchMembers.organizationId, ctx.organizationId)
      )
    );
  await db
    .delete(enterpriseBranches)
    .where(
      and(
        eq(enterpriseBranches.id, branchId),
        eq(enterpriseBranches.organizationId, ctx.organizationId)
      )
    );

  await logAuditSafe(ctx, {
    action: "enterprise.branch.delete",
    category: "enterprise",
    resourceType: "enterprise_branch",
    resourceId: branchId,
    description: `Deleted branch ${branch.name} (${branch.code})`,
  });

  return { id: branchId, deleted: true };
}

export async function setDefaultBranch(
  ctx: ServerContext,
  branchId: string
): Promise<EnterpriseBranch> {
  requirePermission(ctx, "enterprise.branches.manage");
  const branch = await db.query.enterpriseBranches.findFirst({
    where: and(
      eq(enterpriseBranches.id, branchId),
      eq(enterpriseBranches.organizationId, ctx.organizationId)
    ),
  });
  if (!branch) notFound("Branch not found");

  await db
    .update(enterpriseBranches)
    .set({ isDefault: false, updatedAt: new Date() })
    .where(eq(enterpriseBranches.organizationId, ctx.organizationId));

  const [updated] = await db
    .update(enterpriseBranches)
    .set({ isDefault: true, updatedAt: new Date() })
    .where(eq(enterpriseBranches.id, branchId))
    .returning();

  await logAuditSafe(ctx, {
    action: "enterprise.branch.set_default",
    category: "enterprise",
    resourceType: "enterprise_branch",
    resourceId: branchId,
    description: `Set ${updated.name} as default branch`,
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "enterprise.branch.set_default",
    title: `${updated.name} set as default branch`,
    resourceType: "enterprise_branch",
    resourceId: branchId,
  });

  return updated;
}
