/**
 * KaziFlow — Enterprise Branch Pricing service
 * ------------------------------------------------------------------
 * Per-branch pricing rules (adjustments, min/max bounds) for products and
 * categories. All operations are scoped by organizationId + branchId.
 */
import { db } from "@/db";
import {
  enterpriseBranches,
  branchPricing,
  type BranchPricing,
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

export interface SetBranchPricingInput {
  productId?: string | null;
  categoryId?: string | null;
  priceAdjustmentType?: string;
  priceAdjustmentValue?: number | string;
  minPrice?: number | string | null;
  maxPrice?: number | string | null;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  isActive?: boolean;
}

export async function setBranchPricing(
  ctx: ServerContext,
  branchId: string,
  data: SetBranchPricingInput
): Promise<BranchPricing> {
  requirePermission(ctx, "enterprise.pricing.manage");
  await assertBranch(ctx, branchId);
  if (!data.productId && !data.categoryId) {
    throw new EnterpriseError("Either productId or categoryId is required", 400);
  }

  const matches = await db.query.branchPricing.findFirst({
    where: and(
      eq(branchPricing.branchId, branchId),
      eq(branchPricing.organizationId, ctx.organizationId),
      data.productId
        ? eq(branchPricing.productId, data.productId)
        : eq(branchPricing.categoryId, data.categoryId!)
    ),
    columns: { id: true },
  });

  if (matches) {
    const [updated] = await db
      .update(branchPricing)
      .set({
        priceAdjustmentType: data.priceAdjustmentType ?? "percentage",
        priceAdjustmentValue: String(data.priceAdjustmentValue ?? 0),
        minPrice: data.minPrice !== undefined ? String(data.minPrice) : null,
        maxPrice: data.maxPrice !== undefined ? String(data.maxPrice) : null,
        effectiveFrom: data.effectiveFrom !== undefined ? data.effectiveFrom : null,
        effectiveTo: data.effectiveTo !== undefined ? data.effectiveTo : null,
        isActive: data.isActive ?? true,
        updatedAt: new Date(),
      })
      .where(eq(branchPricing.id, matches.id))
      .returning();

    await logAuditSafe(ctx, {
      action: "enterprise.pricing.update",
      category: "enterprise",
      resourceType: "branch_pricing",
      resourceId: updated.id,
      description: `Updated pricing for branch ${branchId}`,
    });
    return updated;
  }

  const [created] = await db
    .insert(branchPricing)
    .values({
      organizationId: ctx.organizationId,
      branchId,
      productId: data.productId ?? null,
      categoryId: data.categoryId ?? null,
      priceAdjustmentType: data.priceAdjustmentType ?? "percentage",
      priceAdjustmentValue: String(data.priceAdjustmentValue ?? 0),
      minPrice: data.minPrice !== undefined ? String(data.minPrice) : null,
      maxPrice: data.maxPrice !== undefined ? String(data.maxPrice) : null,
      effectiveFrom: data.effectiveFrom ?? null,
      effectiveTo: data.effectiveTo ?? null,
      isActive: data.isActive ?? true,
    })
    .returning();

  await logAuditSafe(ctx, {
    action: "enterprise.pricing.create",
    category: "enterprise",
    resourceType: "branch_pricing",
    resourceId: created.id,
    description: `Created pricing rule for branch ${branchId}`,
  });
  return created;
}

export async function getBranchPricing(
  ctx: ServerContext,
  pricingId: string
): Promise<BranchPricing> {
  requirePermission(ctx, "enterprise.view");
  const row = await db.query.branchPricing.findFirst({
    where: and(
      eq(branchPricing.id, pricingId),
      eq(branchPricing.organizationId, ctx.organizationId)
    ),
  });
  if (!row) notFound("Branch pricing not found");
  return row;
}

export interface ListBranchPricingOptions {
  productId?: string;
  categoryId?: string;
  activeOnly?: boolean;
}

export async function listBranchPricing(
  ctx: ServerContext,
  branchId: string,
  opts: ListBranchPricingOptions = {}
): Promise<BranchPricing[]> {
  requirePermission(ctx, "enterprise.view");
  await assertBranch(ctx, branchId);

  const conditions = [
    eq(branchPricing.branchId, branchId),
    eq(branchPricing.organizationId, ctx.organizationId),
    opts.productId ? eq(branchPricing.productId, opts.productId) : undefined,
    opts.categoryId ? eq(branchPricing.categoryId, opts.categoryId) : undefined,
    opts.activeOnly ? eq(branchPricing.isActive, true) : undefined,
  ].filter(Boolean) as ReturnType<typeof eq>[];

  return db.query.branchPricing.findMany({
    where: and(...conditions),
    orderBy: [desc(branchPricing.createdAt)],
  });
}

export async function deleteBranchPricing(
  ctx: ServerContext,
  pricingId: string
): Promise<{ id: string; deleted: true }> {
  requirePermission(ctx, "enterprise.pricing.manage");
  const row = await db.query.branchPricing.findFirst({
    where: and(
      eq(branchPricing.id, pricingId),
      eq(branchPricing.organizationId, ctx.organizationId)
    ),
    columns: { id: true, branchId: true },
  });
  if (!row) notFound("Branch pricing not found");

  await db
    .delete(branchPricing)
    .where(
      and(
        eq(branchPricing.id, pricingId),
        eq(branchPricing.organizationId, ctx.organizationId)
      )
    );

  await logAuditSafe(ctx, {
    action: "enterprise.pricing.delete",
    category: "enterprise",
    resourceType: "branch_pricing",
    resourceId: pricingId,
    description: `Deleted pricing rule for branch ${row.branchId}`,
  });

  return { id: pricingId, deleted: true };
}
