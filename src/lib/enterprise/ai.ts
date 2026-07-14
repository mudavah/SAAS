/**
 * KaziFlow — Enterprise AI Insights service
 * ------------------------------------------------------------------
 * Generates and stores branch-level AI insights as `aiInsights` rows with
 * type "enterprise_branch". Predictions are derived from the latest branch
 * performance snapshots (rule-based, no external model required) so the
 * service is self-contained. Requires `enterprise.ai.access`.
 */
import { db } from "@/db";
import {
  enterpriseBranches,
  branchPerformanceSnapshots,
  aiInsights,
  type AiInsight,
} from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import type { ServerContext } from "@/lib/session";
import { requirePermission, notFound } from "./core";

function toNum(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function latestSnapshot(ctx: ServerContext, branchId: string) {
  return db.query.branchPerformanceSnapshots.findFirst({
    where: and(
      eq(branchPerformanceSnapshots.branchId, branchId),
      eq(branchPerformanceSnapshots.organizationId, ctx.organizationId)
    ),
    orderBy: [desc(branchPerformanceSnapshots.periodEnd)],
  });
}

function priorityForMargin(margin: number): "low" | "normal" | "high" {
  if (margin < 0) return "high";
  if (margin < 10) return "normal";
  return "low";
}

export interface BranchInsight {
  id: string;
  title: string;
  description: string;
  priority: string;
  branchId: string;
  createdAt: string;
}

export async function generateBranchInsights(
  ctx: ServerContext,
  branchId?: string
): Promise<BranchInsight[]> {
  requirePermission(ctx, "enterprise.ai.access");
  if (!ctx.userId) throw new Error("Missing user context");

  const branchFilter = branchId
    ? and(
        eq(enterpriseBranches.id, branchId),
        eq(enterpriseBranches.organizationId, ctx.organizationId)
      )
    : eq(enterpriseBranches.organizationId, ctx.organizationId);

  const branches = await db.query.enterpriseBranches.findMany({
    where: branchFilter,
  });
  if (branchId && branches.length === 0) notFound("Branch not found");

  const created: AiInsight[] = [];
  for (const branch of branches) {
    const snap = await latestSnapshot(ctx, branch.id);
    const revenue = toNum(snap?.revenue);
    const expenses = toNum(snap?.expenses);
    const profit = toNum(snap?.profit);
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const priority = priorityForMargin(margin);

    const [insight] = await db
      .insert(aiInsights)
      .values({
        userId: ctx.userId,
        organizationId: ctx.organizationId,
        type: "enterprise_branch",
        title: `Performance insight: ${branch.name}`,
        description:
          `Revenue ${revenue.toFixed(2)}, expenses ${expenses.toFixed(2)}, ` +
          `net profit ${profit.toFixed(2)} (${margin.toFixed(1)}% margin).`,
        priority,
        data: {
          branchId: branch.id,
          branchName: branch.name,
          revenue,
          expenses,
          profit,
          margin,
          salesCount: toNum(snap?.salesCount),
          inventoryValue: toNum(snap?.inventoryValue),
        },
      })
      .returning();
    created.push(insight);
  }

  return created.map((i) => ({
    id: i.id,
    title: i.title,
    description: i.description,
    priority: i.priority,
    branchId: (i.data as any)?.branchId ?? "",
    createdAt: i.createdAt.toISOString(),
  }));
}

export async function getBranchInsights(
  ctx: ServerContext,
  branchId?: string
): Promise<BranchInsight[]> {
  requirePermission(ctx, "enterprise.ai.access");

  const rows = await db
    .select({
      id: aiInsights.id,
      title: aiInsights.title,
      description: aiInsights.description,
      priority: aiInsights.priority,
      data: aiInsights.data,
      createdAt: aiInsights.createdAt,
    })
    .from(aiInsights)
    .where(
      and(
        eq(aiInsights.organizationId, ctx.organizationId),
        eq(aiInsights.type, "enterprise_branch")
      )
    )
    .orderBy(desc(aiInsights.createdAt))
    .limit(100);

  return rows
    .filter((r) => !branchId || (r.data as any)?.branchId === branchId)
    .map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      priority: String(r.priority),
      branchId: (r.data as any)?.branchId ?? "",
      createdAt: (r.createdAt as Date).toISOString(),
    }));
}

export interface PerformancePrediction {
  branchId: string;
  branchName: string;
  period: string;
  predictedRevenue: number;
  predictedExpenses: number;
  predictedProfit: number;
  predictedMargin: number;
  confidence: number;
  basis: string;
}

export async function getAiPerformancePrediction(
  ctx: ServerContext,
  branchId: string
): Promise<PerformancePrediction> {
  requirePermission(ctx, "enterprise.ai.access");
  const branch = await db.query.enterpriseBranches.findFirst({
    where: and(
      eq(enterpriseBranches.id, branchId),
      eq(enterpriseBranches.organizationId, ctx.organizationId)
    ),
    columns: { id: true, name: true },
  });
  if (!branch) notFound("Branch not found");

  const snap = await latestSnapshot(ctx, branchId);
  const revenue = toNum(snap?.revenue);
  const expenses = toNum(snap?.expenses);
  const profit = toNum(snap?.profit);

  // Simple next-period projection: hold the last period's margin, apply a
  // modest 1.05 growth factor to revenue (defensive, no external call).
  const margin = revenue > 0 ? profit / revenue : 0;
  const growth = 1.05;
  const predictedRevenue = Math.round(revenue * growth * 100) / 100;
  const predictedProfit = Math.round(predictedRevenue * margin * 100) / 100;
  const predictedExpenses = Math.round((predictedRevenue - predictedProfit) * 100) / 100;
  const predictedMargin = predictedRevenue > 0 ? (predictedProfit / predictedRevenue) * 100 : 0;

  await db.insert(aiInsights).values({
    userId: ctx.userId!,
    organizationId: ctx.organizationId,
    type: "enterprise_branch",
    title: `Performance prediction: ${branch.name}`,
    description:
      `Projected next-period revenue ${predictedRevenue.toFixed(2)} ` +
      `(margin ${predictedMargin.toFixed(1)}%).`,
    priority: priorityForMargin(predictedMargin),
    data: {
      branchId: branch.id,
      kind: "prediction",
      predictedRevenue,
      predictedExpenses,
      predictedProfit,
      predictedMargin,
    },
  });

  return {
    branchId: branch.id,
    branchName: branch.name,
    period: "next",
    predictedRevenue,
    predictedExpenses,
    predictedProfit,
    predictedMargin: Math.round(predictedMargin * 100) / 100,
    confidence: 0.6,
    basis: "last_period_margin_with_growth_factor",
  };
}
