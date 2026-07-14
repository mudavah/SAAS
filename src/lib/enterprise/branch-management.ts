/**
 * KaziFlow — Enterprise & Multi-Branch Management data layer
 * ------------------------------------------------------------------
 * Read-side queries for the Enterprise dashboard (branches, inter-branch
 * transfers, inter-branch sales, centralized procurement, approvals and
 * settings). Every query is scoped by `organizationId`. These functions are
 * shared by the `/api/enterprise/*` routes and the server-rendered overview
 * page so exactly one implementation backs both.
 */
import { db } from "@/db";
import {
  enterpriseBranches,
  interBranchTransfers,
  interBranchSales,
  branchMembers,
  branchPricing,
  branchTaxSettings,
  branchPerformanceSnapshots,
  branchApprovalRequests,
  enterpriseSettings,
  procurementPurchaseOrders,
  inventorySuppliers,
} from "@/db/schema";
import { and, desc, eq, sql, count, sum, inArray } from "drizzle-orm";

function num(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : 0;
}

export interface EnterpriseOverview {
  kpis: {
    totalBranches: number;
    totalTransfers: number;
    totalInterBranchSales: number;
    totalRevenue: number;
  };
  recentTransfers: any[];
  recentSales: any[];
}

export async function getEnterpriseOverview(
  organizationId: string
): Promise<EnterpriseOverview> {
  const [branchRow, transferRow, saleRow, revenueRow] = await Promise.all([
    db
      .select({ count: count() })
      .from(enterpriseBranches)
      .where(eq(enterpriseBranches.organizationId, organizationId)),
    db
      .select({ count: count() })
      .from(interBranchTransfers)
      .where(eq(interBranchTransfers.organizationId, organizationId)),
    db
      .select({ count: count() })
      .from(interBranchSales)
      .where(eq(interBranchSales.organizationId, organizationId)),
    db
      .select({ total: sum(interBranchSales.total) })
      .from(interBranchSales)
      .where(
        and(
          eq(interBranchSales.organizationId, organizationId),
          sql`${interBranchSales.status} NOT IN ('cancelled', 'draft')`
        )
      ),
  ]);

  const [recentTransfers, recentSales] = await Promise.all([
    db.query.interBranchTransfers.findMany({
      where: eq(interBranchTransfers.organizationId, organizationId),
      orderBy: (t: any) => [desc(t.createdAt)],
      limit: 5,
      with: { fromBranch: true, toBranch: true },
    }),
    db.query.interBranchSales.findMany({
      where: eq(interBranchSales.organizationId, organizationId),
      orderBy: (s: any) => [desc(s.createdAt)],
      limit: 5,
      with: { fromBranch: true, toBranch: true },
    }),
  ]);

  return {
    kpis: {
      totalBranches: num(branchRow[0]?.count),
      totalTransfers: num(transferRow[0]?.count),
      totalInterBranchSales: num(saleRow[0]?.count),
      totalRevenue: num(revenueRow[0]?.total),
    },
    recentTransfers: recentTransfers as any[],
    recentSales: recentSales as any[],
  };
}

export async function getBranches(organizationId: string) {
  return (await db.query.enterpriseBranches.findMany({
    where: eq(enterpriseBranches.organizationId, organizationId),
    orderBy: (b: any) => [b.name],
    with: { manager: true },
  })) as any[];
}

export async function getBranchDetail(organizationId: string, branchId: string) {
  const branch = (await db.query.enterpriseBranches.findFirst({
    where: and(
      eq(enterpriseBranches.organizationId, organizationId),
      eq(enterpriseBranches.id, branchId)
    ),
    with: { manager: true },
  })) as any;

  if (!branch) return null;

  const [members, pricing, taxSettings, performance, approvalRequests] =
    await Promise.all([
      db.query.branchMembers.findMany({
        where: eq(branchMembers.branchId, branchId),
        with: { user: true },
        orderBy: (m: any) => [desc(m.isPrimary)],
      }),
      db.query.branchPricing.findMany({
        where: eq(branchPricing.branchId, branchId),
        with: { product: true },
        limit: 50,
      }),
      db.query.branchTaxSettings.findMany({
        where: eq(branchTaxSettings.branchId, branchId),
      }),
      db.query.branchPerformanceSnapshots.findMany({
        where: eq(branchPerformanceSnapshots.branchId, branchId),
        orderBy: (p: any) => [desc(p.periodStart)],
        limit: 12,
      }),
      db.query.branchApprovalRequests.findMany({
        where: eq(branchApprovalRequests.branchId, branchId),
        orderBy: (a: any) => [desc(a.createdAt)],
        limit: 20,
      }),
    ]);

  return {
    branch,
    members: members as any[],
    pricing: pricing as any[],
    taxSettings: taxSettings as any[],
    performance: performance as any[],
    approvalRequests: approvalRequests as any[],
  };
}

export async function getTransfers(organizationId: string) {
  return (await db.query.interBranchTransfers.findMany({
    where: eq(interBranchTransfers.organizationId, organizationId),
    orderBy: (t: any) => [desc(t.createdAt)],
    limit: 100,
    with: { fromBranch: true, toBranch: true, items: true },
  })) as any[];
}

export async function getSales(organizationId: string) {
  return (await db.query.interBranchSales.findMany({
    where: eq(interBranchSales.organizationId, organizationId),
    orderBy: (s: any) => [desc(s.createdAt)],
    limit: 100,
    with: { fromBranch: true, toBranch: true },
  })) as any[];
}

export interface ProcurementOverview {
  totalOrders: number;
  totalValue: number;
  pendingOrders: number;
  cancelledOrders: number;
  byStatus: { status: string; count: number; value: number }[];
  recentOrders: any[];
}

export async function getProcurementOverview(
  organizationId: string
): Promise<ProcurementOverview> {
  const [orderRow, valueRow, pendingRow, cancelledRow] = await Promise.all([
    db
      .select({ count: count() })
      .from(procurementPurchaseOrders)
      .where(eq(procurementPurchaseOrders.organizationId, organizationId)),
    db
      .select({ total: sum(procurementPurchaseOrders.total) })
      .from(procurementPurchaseOrders)
      .where(eq(procurementPurchaseOrders.organizationId, organizationId)),
    db
      .select({ count: count() })
      .from(procurementPurchaseOrders)
      .where(
        and(
          eq(procurementPurchaseOrders.organizationId, organizationId),
          sql`${procurementPurchaseOrders.status} IN ('draft', 'sent', 'confirmed', 'partial')`
        )
      ),
    db
      .select({ count: count() })
      .from(procurementPurchaseOrders)
      .where(
        and(
          eq(procurementPurchaseOrders.organizationId, organizationId),
          eq(procurementPurchaseOrders.status, "cancelled")
        )
      ),
  ]);

  const byStatusRows = await db
    .select({
      status: procurementPurchaseOrders.status,
      count: count(),
      value: sum(procurementPurchaseOrders.total),
    })
    .from(procurementPurchaseOrders)
    .where(eq(procurementPurchaseOrders.organizationId, organizationId))
    .groupBy(procurementPurchaseOrders.status);

  const recentOrders = await db.query.procurementPurchaseOrders.findMany({
    where: eq(procurementPurchaseOrders.organizationId, organizationId),
    orderBy: (p: any) => [desc(p.createdAt)],
    limit: 25,
    with: { supplier: true },
  });

  return {
    totalOrders: num(orderRow[0]?.count),
    totalValue: num(valueRow[0]?.total),
    pendingOrders: num(pendingRow[0]?.count),
    cancelledOrders: num(cancelledRow[0]?.count),
    byStatus: byStatusRows.map((r) => ({
      status: String(r.status),
      count: num(r.count),
      value: num(r.value),
    })),
    recentOrders: recentOrders as any[],
  };
}

export async function getApprovals(organizationId: string) {
  return (await db.query.branchApprovalRequests.findMany({
    where: eq(branchApprovalRequests.organizationId, organizationId),
    orderBy: (a: any) => [desc(a.createdAt)],
    limit: 100,
    with: { branch: true },
  })) as any[];
}

export async function getEnterpriseSettingsRow(organizationId: string) {
  const row = (await db.query.enterpriseSettings.findFirst({
    where: eq(enterpriseSettings.organizationId, organizationId),
  })) as any;
  return (
    row || {
      organizationId,
      consolidatedReporting: true,
      crossBranchInventoryVisibility: true,
      centralizedProcurement: false,
      branchApprovalRequired: false,
    }
  );
}

const SETTINGS_KEYS = [
  "consolidatedReporting",
  "crossBranchInventoryVisibility",
  "centralizedProcurement",
  "branchApprovalRequired",
] as const;

export async function upsertEnterpriseSettings(
  organizationId: string,
  patch: Record<string, unknown>
) {
  const values: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of SETTINGS_KEYS) {
    if (key in patch) values[key] = Boolean(patch[key]);
  }

  const existing = await db.query.enterpriseSettings.findFirst({
    where: eq(enterpriseSettings.organizationId, organizationId),
  });

  if (existing) {
    const [updated] = await db
      .update(enterpriseSettings)
      .set(values)
      .where(eq(enterpriseSettings.organizationId, organizationId))
      .returning();
    return updated as any;
  }

  const [inserted] = await db
    .insert(enterpriseSettings)
    .values({ organizationId, ...values } as any)
    .returning();
  return inserted as any;
}

export async function decideApprovalRequest(
  organizationId: string,
  requestId: string,
  decision: "approve" | "reject",
  userId: string
) {
  const request = (await db.query.branchApprovalRequests.findFirst({
    where: and(
      eq(branchApprovalRequests.organizationId, organizationId),
      eq(branchApprovalRequests.id, requestId)
    ),
  })) as any;

  if (!request) return null;

  const [updated] = await db
    .update(branchApprovalRequests)
    .set({
      status: decision === "approve" ? "approved" : "rejected",
      decidedBy: userId,
      decidedAt: new Date(),
    })
    .where(eq(branchApprovalRequests.id, requestId))
    .returning();
  return updated as any;
}
