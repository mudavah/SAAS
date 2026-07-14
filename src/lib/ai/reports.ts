/**
 * KaziFlow — AI Financial Reports
 * ------------------------------------------------------------------
 * Generates structured financial reports (financial summary, P&L, cash flow,
 * tax readiness) from org-scoped aggregates, enriched with an LLM narrative
 * when available. Results persist in `ai_reports`.
 */
import { db } from "@/db";
import { invoices, payments, expenses, aiReports } from "@/db/schema";
import { and, eq, sql, gte } from "drizzle-orm";
import type { ServerContext } from "@/lib/session";
import { emitTimelineEvent } from "@/lib/timeline";
import { callOpenAI } from "./copilot";

export type AiReportType = "financial_summary" | "profit_loss" | "cash_flow" | "tax_readiness" | "custom";

function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfYear(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), 0, 1);
}

async function aggregates(orgId: string, since: Date) {
  const [rev] = await db
    .select({ total: sql<number>`coalesce(sum(${payments.amount}),0)` })
    .from(payments)
    .where(and(eq(payments.organizationId, orgId), eq(payments.status, "completed"), gte(payments.createdAt, since)));
  const [exp] = await db
    .select({ total: sql<number>`coalesce(sum(${expenses.amount}),0)` })
    .from(expenses)
    .where(and(eq(expenses.organizationId, orgId), gte(expenses.createdAt, since)));
  const [inv] = await db
    .select({
      billed: sql<number>`coalesce(sum(${invoices.total}),0)`,
      outstanding: sql<number>`coalesce(sum(${invoices.total}),0) filter (where ${invoices.status} not in ('paid','cancelled'))`,
      overdue: sql<number>`count(*) filter (where ${invoices.status} = 'overdue')`,
    })
    .from(invoices)
    .where(eq(invoices.organizationId, orgId));
  return {
    revenue: Number(rev?.total ?? 0),
    expenses: Number(exp?.total ?? 0),
    billed: Number(inv?.billed ?? 0),
    outstanding: Number(inv?.outstanding ?? 0),
    overdueCount: Number(inv?.overdue ?? 0),
    net: Number(rev?.total ?? 0) - Number(exp?.total ?? 0),
  };
}

export async function generateAiReport(
  ctx: ServerContext,
  type: AiReportType
): Promise<typeof aiReports.$inferSelect> {
  const since = type === "financial_summary" || type === "cash_flow" ? startOfYear() : startOfMonth();
  const agg = await aggregates(ctx.organizationId, since);

  const content: Record<string, unknown> = {
    period: type,
    revenue: agg.revenue,
    expenses: agg.expenses,
    net: agg.net,
    billed: agg.billed,
    outstanding: agg.outstanding,
    overdueInvoices: agg.overdueCount,
    generatedAt: new Date().toISOString(),
  };

  let title = "";
  let narrative = "";
  if (type === "profit_loss") {
    title = "Profit & Loss Summary";
    narrative = `Revenue KES ${agg.revenue.toLocaleString()}, expenses KES ${agg.expenses.toLocaleString()}, net KES ${agg.net.toLocaleString()}.`;
  } else if (type === "cash_flow") {
    title = "Cash Flow Summary";
    narrative = `Net cash flow KES ${agg.net.toLocaleString()} (inflows KES ${agg.revenue.toLocaleString()}, outflows KES ${agg.expenses.toLocaleString()}).`;
  } else if (type === "tax_readiness") {
    title = "Tax Readiness Report";
    narrative = `${agg.overdueCount} overdue invoice(s) and KES ${agg.outstanding.toLocaleString()} outstanding — reconcile before filing.`;
  } else {
    title = "Financial Summary";
    narrative = `Billed KES ${agg.billed.toLocaleString()}, received KES ${agg.revenue.toLocaleString()}, expenses KES ${agg.expenses.toLocaleString()}.`;
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      narrative = await callOpenAI(
        "You are a concise financial analyst for a Kenyan SME. 2 sentences max.",
        `Write a ${type} narrative. Facts: ${narrative}`,
        []
      );
    } catch {
      /* keep rule-based narrative */
    }
  }

  const [report] = await db
    .insert(aiReports)
    .values({
      organizationId: ctx.organizationId,
      userId: ctx.userId!,
      type: type as any,
      title,
      content,
      narrative,
      model: process.env.OPENAI_API_KEY ? "openai" : "rules",
      periodStart: since,
      periodEnd: new Date(),
    })
    .returning();

  await emitTimelineEvent({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    eventType: "ai.report.generated",
    title: `AI report: ${title}`,
    description: type,
    resourceType: "ai_report",
    resourceId: report.id,
  });

  return report;
}
