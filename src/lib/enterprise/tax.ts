/**
 * KaziFlow — Enterprise Branch Tax service
 * ------------------------------------------------------------------
 * Per-branch tax settings (VAT, levies, compound rules). Scoped by
 * organizationId + branchId.
 */
import { db } from "@/db";
import {
  enterpriseBranches,
  branchTaxSettings,
  type BranchTaxSetting,
} from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import type { ServerContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { EnterpriseError, requirePermission, notFound } from "./core";

async function assertBranch(ctx: ServerContext, branchId: string): Promise<void> {
  const branch = await db.query.enterpriseBranches.findFirst({
    where: and(
      eq(enterpriseBranches.id, branchId),
      eq(enterpriseBranches.organizationId, ctx.organizationId)
    ),
    columns: { id: true },
  });
  if (!branch) notFound("Branch not found");
}

export interface SetBranchTaxInput {
  taxName: string;
  taxType: string;
  rate: number | string;
  isCompound?: boolean;
  appliesTo?: string;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  isActive?: boolean;
}

export async function setBranchTax(
  ctx: ServerContext,
  branchId: string,
  data: SetBranchTaxInput
): Promise<BranchTaxSetting> {
  requirePermission(ctx, "enterprise.pricing.manage");
  await assertBranch(ctx, branchId);
  if (!data.taxName || !data.taxType) {
    throw new EnterpriseError("taxName and taxType are required", 400);
  }

  const [created] = await db
    .insert(branchTaxSettings)
    .values({
      organizationId: ctx.organizationId,
      branchId,
      taxName: data.taxName,
      taxType: data.taxType,
      rate: String(data.rate),
      isCompound: data.isCompound ?? false,
      appliesTo: data.appliesTo ?? "all",
      effectiveFrom: data.effectiveFrom ?? null,
      effectiveTo: data.effectiveTo ?? null,
      isActive: data.isActive ?? true,
    })
    .returning();

  await logAuditSafe(ctx, {
    action: "enterprise.tax.create",
    category: "enterprise",
    resourceType: "branch_tax_setting",
    resourceId: created.id,
    description: `Created tax setting ${data.taxName} for branch ${branchId}`,
    newValues: { taxName: data.taxName, rate: String(data.rate) },
  });

  return created;
}

export async function getBranchTax(
  ctx: ServerContext,
  taxId: string
): Promise<BranchTaxSetting> {
  requirePermission(ctx, "enterprise.view");
  const row = await db.query.branchTaxSettings.findFirst({
    where: and(
      eq(branchTaxSettings.id, taxId),
      eq(branchTaxSettings.organizationId, ctx.organizationId)
    ),
  });
  if (!row) notFound("Branch tax setting not found");
  return row;
}

export interface ListBranchTaxesOptions {
  appliesTo?: string;
  activeOnly?: boolean;
}

export async function listBranchTaxes(
  ctx: ServerContext,
  branchId: string,
  opts: ListBranchTaxesOptions = {}
): Promise<BranchTaxSetting[]> {
  requirePermission(ctx, "enterprise.view");
  await assertBranch(ctx, branchId);

  const conditions = [
    eq(branchTaxSettings.branchId, branchId),
    eq(branchTaxSettings.organizationId, ctx.organizationId),
    opts.appliesTo ? eq(branchTaxSettings.appliesTo, opts.appliesTo) : undefined,
    opts.activeOnly ? eq(branchTaxSettings.isActive, true) : undefined,
  ].filter(Boolean) as ReturnType<typeof eq>[];

  return db.query.branchTaxSettings.findMany({
    where: and(...conditions),
    orderBy: [desc(branchTaxSettings.createdAt)],
  });
}

export async function deleteBranchTax(
  ctx: ServerContext,
  taxId: string
): Promise<{ id: string; deleted: true }> {
  requirePermission(ctx, "enterprise.pricing.manage");
  const row = await db.query.branchTaxSettings.findFirst({
    where: and(
      eq(branchTaxSettings.id, taxId),
      eq(branchTaxSettings.organizationId, ctx.organizationId)
    ),
    columns: { id: true, branchId: true },
  });
  if (!row) notFound("Branch tax setting not found");

  await db
    .delete(branchTaxSettings)
    .where(
      and(
        eq(branchTaxSettings.id, taxId),
        eq(branchTaxSettings.organizationId, ctx.organizationId)
      )
    );

  await logAuditSafe(ctx, {
    action: "enterprise.tax.delete",
    category: "enterprise",
    resourceType: "branch_tax_setting",
    resourceId: taxId,
    description: `Deleted tax setting for branch ${row.branchId}`,
  });

  return { id: taxId, deleted: true };
}
