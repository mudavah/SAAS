/**
 * KaziFlow — AI Task Recommendations
 * ------------------------------------------------------------------
 * Surfaces prioritized task suggestions from business signals: overdue
 * invoices, low stock, stale leads, and upcoming high-value deals. Each
 * recommendation is stored in `ai_task_recommendations` (open/accepted/dismissed).
 */
import { db } from "@/db";
import {
  invoices,
  inventoryStock,
  inventoryProducts,
  crmLeads,
  crmDeals,
  aiTaskRecommendations,
} from "@/db/schema";
import { and, eq, sql, desc } from "drizzle-orm";
import type { ServerContext } from "@/lib/session";
import { callOpenAI } from "./copilot";

export interface TaskRecommendation {
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  category: string;
  resourceType?: string;
  resourceId?: string;
  dueInDays?: number;
}

export async function generateTaskRecommendations(
  organizationId: string,
  userId: string
): Promise<typeof aiTaskRecommendations.$inferSelect[]> {
  const recs: TaskRecommendation[] = [];

  // 1) Overdue invoices → follow-up tasks
  const overdue = await db
    .select({ count: sql<number>`count(*)`, amount: sql<number>`coalesce(sum(${invoices.total}),0)` })
    .from(invoices)
    .where(and(eq(invoices.organizationId, organizationId), eq(invoices.status, "overdue")));
  if (Number(overdue[0]?.count ?? 0) > 0) {
    recs.push({
      title: `Follow up on ${overdue[0]!.count} overdue invoice(s)`,
      description: `KES ${Number(overdue[0]!.amount).toLocaleString()} is overdue. Send reminders to improve cash flow.`,
      priority: Number(overdue[0]!.count) > 5 ? "high" : "medium",
      category: "collect_payment",
      dueInDays: 1,
    });
  }

  // 2) Low stock → reorder tasks
  const low = await db
    .select({ count: sql<number>`count(*)` })
    .from(inventoryStock)
    .innerJoin(inventoryProducts, eq(inventoryStock.productId, inventoryProducts.id))
    .where(and(eq(inventoryProducts.organizationId, organizationId), sql`coalesce(${inventoryStock.quantity},0) <= ${inventoryProducts.reorderPoint}`));
  if (Number(low[0]?.count ?? 0) > 0) {
    recs.push({
      title: `Reorder ${low[0]!.count} low-stock product(s)`,
      description: "Stock is at or below reorder point. Raise purchase orders to avoid stockouts.",
      priority: Number(low[0]!.count) > 10 ? "high" : "medium",
      category: "reorder",
      dueInDays: 2,
    });
  }

  // 3) Stale leads → re-engage
  const stale = await db
    .select({ count: sql<number>`count(*)` })
    .from(crmLeads)
    .where(and(eq(crmLeads.organizationId, organizationId), eq(crmLeads.status, "new")));
  if (Number(stale[0]?.count ?? 0) > 0) {
    recs.push({
      title: `Re-engage ${stale[0]!.count} new lead(s)`,
      description: "These leads are still unqualified. A quick call can lift conversion.",
      priority: "low",
      category: "outreach",
      resourceType: "crm_lead",
      dueInDays: 3,
    });
  }

  // 4) Upcoming high-value deals → prepare proposal
  const bigDeals = await db
    .select({ count: sql<number>`count(*)` })
    .from(crmDeals)
    .where(and(eq(crmDeals.organizationId, organizationId), eq(crmDeals.status, "open")));
  if (Number(bigDeals[0]?.count ?? 0) > 0) {
    recs.push({
      title: `Prepare proposals for ${bigDeals[0]!.count} open deal(s)`,
      description: "Move open deals forward with tailored proposals and follow-ups.",
      priority: "medium",
      category: "review",
      resourceType: "crm_deal",
      dueInDays: 4,
    });
  }

  const inserted: typeof aiTaskRecommendations.$inferSelect[] = [];
  for (const r of recs) {
    const dueDate = r.dueInDays ? new Date(Date.now() + r.dueInDays * 86_400_000) : null;
    const [row] = await db
      .insert(aiTaskRecommendations)
      .values({
        organizationId,
        userId,
        title: r.title,
        description: r.description,
        priority: r.priority,
        category: r.category,
        resourceType: r.resourceType ?? null,
        resourceId: r.resourceId ?? null,
        dueDate,
        status: "open",
        metadata: { source: "ai" },
      })
      .returning();
    inserted.push(row);
  }

  await emitTimelineSafe(organizationId, userId, inserted.length);
  return inserted;
}

async function emitTimelineSafe(organizationId: string, userId: string, count: number) {
  if (count === 0) return;
  try {
    const { emitTimelineEvent } = await import("@/lib/timeline");
    await emitTimelineEvent({
      organizationId,
      userId,
      eventType: "ai.task.recommended",
      title: `${count} AI task recommendation(s) generated`,
      description: "AI prioritised tasks from business signals.",
    });
  } catch {
    /* best-effort */
  }
}

/** Optional narrative summarising the recommendations. */
export async function taskNarrative(recs: TaskRecommendation[]): Promise<string> {
  if (recs.length === 0) return "No urgent tasks recommended right now.";
  try {
    return await callOpenAI(
      "You are a concise productivity coach for a Kenyan SME.",
      `Summarise these recommended tasks in one sentence: ${recs.map((r) => r.title).join("; ")}`,
      []
    );
  } catch {
    return `${recs.length} task(s) recommended. Focus on payments and stock first.`;
  }
}
