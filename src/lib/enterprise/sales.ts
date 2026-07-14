/**
 * KaziFlow — Enterprise Inter-Branch Sales service
 * ------------------------------------------------------------------
 * Sales between branches (one branch sells stock to another). Numbers follow
 * IBS-{ORG_CODE}-{YYYYMMDD}-{SEQ}. Lifecycle: draft → pending → approved →
 * completed (or cancelled). All queries scoped by organizationId.
 */
import { db } from "@/db";
import {
  enterpriseBranches,
  interBranchSales,
  interBranchSaleItems,
  type InterBranchSale,
  type InterBranchSaleItem,
  type InterBranchSaleStatus,
} from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import type { ServerContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { emitTimelineEvent } from "@/lib/timeline";
import { EnterpriseError, requirePermission, notFound, generateNumber } from "./core";

const round2 = (n: number) =>
  Math.round((Number(n) + Number.EPSILON) * 100) / 100;

async function assertBranchInOrg(ctx: ServerContext, branchId: string): Promise<void> {
  const branch = await db.query.enterpriseBranches.findFirst({
    where: and(
      eq(enterpriseBranches.id, branchId),
      eq(enterpriseBranches.organizationId, ctx.organizationId)
    ),
    columns: { id: true },
  });
  if (!branch) notFound("Branch not found");
}

async function getSaleOrThrow(
  ctx: ServerContext,
  saleId: string
): Promise<InterBranchSale> {
  const sale = await db.query.interBranchSales.findFirst({
    where: and(
      eq(interBranchSales.id, saleId),
      eq(interBranchSales.organizationId, ctx.organizationId)
    ),
  });
  if (!sale) notFound("Inter-branch sale not found");
  return sale;
}

export interface SaleItemInput {
  productId: string;
  description: string;
  quantity: number | string;
  unitPrice: number | string;
  discount?: number | string;
  taxRate?: number | string;
  sortOrder?: number;
}

export interface CreateInterBranchSaleInput {
  fromBranchId: string;
  toBranchId: string;
  currency?: string;
  taxRate?: number | string;
  notes?: string | null;
  items: SaleItemInput[];
}

export async function createInterBranchSale(
  ctx: ServerContext,
  data: CreateInterBranchSaleInput
): Promise<InterBranchSale> {
  requirePermission(ctx, "enterprise.sales.manage");
  if (!data.fromBranchId || !data.toBranchId) {
    throw new EnterpriseError("fromBranchId and toBranchId are required", 400);
  }
  if (data.fromBranchId === data.toBranchId) {
    throw new EnterpriseError("Source and destination branches must differ", 400);
  }
  if (!data.items?.length) {
    throw new EnterpriseError("At least one item is required", 400);
  }
  await assertBranchInOrg(ctx, data.fromBranchId);
  await assertBranchInOrg(ctx, data.toBranchId);

  const saleNumber = await generateNumber(
    "IBS",
    interBranchSales,
    interBranchSales.createdAt,
    ctx.organizationId
  );

  let subtotal = 0;
  let taxAmount = 0;
  const itemRows = data.items.map((it, idx) => {
    const qty = Number(it.quantity);
    const price = Number(it.unitPrice);
    const discount = Number(it.discount ?? 0);
    const taxRate = Number(it.taxRate ?? data.taxRate ?? 16);
    const lineNet = round2(qty * price - discount);
    const lineTax = round2(lineNet * (taxRate / 100));
    subtotal += lineNet;
    taxAmount += lineTax;
    return {
      organizationId: ctx.organizationId,
      productId: it.productId,
      description: it.description,
      quantity: String(it.quantity),
      unitPrice: String(it.unitPrice),
      discount: String(it.discount ?? 0),
      taxRate: String(taxRate),
      lineTotal: String(round2(lineNet + lineTax)),
      sortOrder: it.sortOrder ?? idx,
    };
  });

  const [sale] = await db
    .insert(interBranchSales)
    .values({
      organizationId: ctx.organizationId,
      userId: ctx.userId!,
      saleNumber,
      fromBranchId: data.fromBranchId,
      toBranchId: data.toBranchId,
      status: "draft",
      currency: data.currency ?? "KES",
      taxRate: String(data.taxRate ?? 16),
      subtotal: String(round2(subtotal)),
      taxAmount: String(round2(taxAmount)),
      total: String(round2(subtotal + taxAmount)),
      notes: data.notes ?? null,
    })
    .returning();

  await db.insert(interBranchSaleItems).values(
    itemRows.map((row) => ({ ...row, saleId: sale.id }))
  );

  await logAuditSafe(ctx, {
    action: "enterprise.sale.create",
    category: "enterprise",
    resourceType: "inter_branch_sale",
    resourceId: sale.id,
    description: `Created inter-branch sale ${sale.saleNumber}`,
    newValues: { total: sale.total, toBranchId: sale.toBranchId },
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "enterprise.sale.created",
    title: `Inter-branch sale ${sale.saleNumber} created`,
    resourceType: "inter_branch_sale",
    resourceId: sale.id,
  });

  return sale;
}

export async function getInterBranchSale(
  ctx: ServerContext,
  saleId: string
): Promise<InterBranchSale & { items: InterBranchSaleItem[] }> {
  requirePermission(ctx, "enterprise.view");
  const sale = await getSaleOrThrow(ctx, saleId);
  const items = await db.query.interBranchSaleItems.findMany({
    where: and(
      eq(interBranchSaleItems.saleId, saleId),
      eq(interBranchSaleItems.organizationId, ctx.organizationId)
    ),
    orderBy: [interBranchSaleItems.sortOrder],
  });
  return { ...sale, items };
}

export interface ListInterBranchSalesOptions {
  fromBranchId?: string;
  toBranchId?: string;
  status?: InterBranchSaleStatus;
}

export async function listInterBranchSales(
  ctx: ServerContext,
  opts: ListInterBranchSalesOptions = {}
): Promise<InterBranchSale[]> {
  requirePermission(ctx, "enterprise.view");
  const conditions = [
    eq(interBranchSales.organizationId, ctx.organizationId),
    opts.fromBranchId ? eq(interBranchSales.fromBranchId, opts.fromBranchId) : undefined,
    opts.toBranchId ? eq(interBranchSales.toBranchId, opts.toBranchId) : undefined,
    opts.status ? eq(interBranchSales.status, opts.status) : undefined,
  ].filter(Boolean) as ReturnType<typeof eq>[];

  return db.query.interBranchSales.findMany({
    where: and(...conditions),
    orderBy: [desc(interBranchSales.createdAt)],
  });
}

export async function approveInterBranchSale(
  ctx: ServerContext,
  saleId: string
): Promise<InterBranchSale> {
  requirePermission(ctx, "enterprise.sales.manage");
  const sale = await getSaleOrThrow(ctx, saleId);
  if (sale.status !== "pending" && sale.status !== "draft") {
    throw new EnterpriseError("Sale is not awaiting approval", 400);
  }

  const [updated] = await db
    .update(interBranchSales)
    .set({
      status: "approved",
      approvedBy: ctx.userId,
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(interBranchSales.id, saleId))
    .returning();

  await logAuditSafe(ctx, {
    action: "enterprise.sale.approve",
    category: "enterprise",
    resourceType: "inter_branch_sale",
    resourceId: saleId,
    description: `Approved inter-branch sale ${updated.saleNumber}`,
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "enterprise.sale.approved",
    title: `Inter-branch sale ${updated.saleNumber} approved`,
    resourceType: "inter_branch_sale",
    resourceId: saleId,
  });

  return updated;
}

export async function completeInterBranchSale(
  ctx: ServerContext,
  saleId: string
): Promise<InterBranchSale> {
  requirePermission(ctx, "enterprise.sales.manage");
  const sale = await getSaleOrThrow(ctx, saleId);
  if (sale.status !== "approved") {
    throw new EnterpriseError("Only approved sales can be completed", 400);
  }

  const [updated] = await db
    .update(interBranchSales)
    .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
    .where(eq(interBranchSales.id, saleId))
    .returning();

  await logAuditSafe(ctx, {
    action: "enterprise.sale.complete",
    category: "enterprise",
    resourceType: "inter_branch_sale",
    resourceId: saleId,
    description: `Completed inter-branch sale ${updated.saleNumber}`,
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "enterprise.sale.completed",
    title: `Inter-branch sale ${updated.saleNumber} completed`,
    resourceType: "inter_branch_sale",
    resourceId: saleId,
  });

  return updated;
}

export async function cancelInterBranchSale(
  ctx: ServerContext,
  saleId: string
): Promise<InterBranchSale> {
  requirePermission(ctx, "enterprise.sales.manage");
  const sale = await getSaleOrThrow(ctx, saleId);
  if (sale.status === "completed") {
    throw new EnterpriseError("Completed sales cannot be cancelled", 400);
  }

  const [updated] = await db
    .update(interBranchSales)
    .set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() })
    .where(eq(interBranchSales.id, saleId))
    .returning();

  await logAuditSafe(ctx, {
    action: "enterprise.sale.cancel",
    category: "enterprise",
    resourceType: "inter_branch_sale",
    resourceId: saleId,
    description: `Cancelled inter-branch sale ${updated.saleNumber}`,
  });

  return updated;
}

export type { InterBranchSaleItem };
