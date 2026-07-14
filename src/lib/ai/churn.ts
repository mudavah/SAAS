/**
 * KaziFlow — Customer Churn Prediction
 * ------------------------------------------------------------------
 * Scores clients (and CRM companies) for churn risk using recency, frequency,
 * monetary and overdue signals. Deterministic + testable; results are upserted
 * into `ai_churn_predictions` (one row per customer per org).
 */
import { db } from "@/db";
import { invoices, clients, crmCompanies, crmDeals, aiChurnPredictions } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { callOpenAI } from "./copilot";

export interface ChurnPrediction {
  customerType: string;
  customerId: string;
  customerName: string;
  risk: "low" | "medium" | "high";
  score: number;
  factors: string[];
  recommendedAction: string;
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function scoreFromSignals(opts: {
  recencyDays: number;
  frequency: number;
  overdue: number;
  monetary: number;
}): { score: number; factors: string[] } {
  const factors: string[] = [];
  let score = 0;

  if (opts.recencyDays > 180) {
    score += 40;
    factors.push(`No activity for ${opts.recencyDays} days`);
  } else if (opts.recencyDays > 90) {
    score += 22;
    factors.push(`Inactive for ${opts.recencyDays} days`);
  } else if (opts.recencyDays > 30) {
    score += 10;
    factors.push(`Last activity ${opts.recencyDays} days ago`);
  }

  if (opts.frequency === 0) {
    score += 18;
    factors.push("No recent transactions");
  } else if (opts.frequency < 3) {
    score += 8;
    factors.push("Low purchase frequency");
  }

  if (opts.overdue > 0) {
    score += Math.min(25, opts.overdue * 7);
    factors.push(`${opts.overdue} overdue invoice(s)`);
  }

  if (opts.monetary > 0 && opts.frequency > 0) {
    score -= Math.min(15, Math.log10(opts.monetary + 1) * 2);
    factors.push("Has meaningful spend history");
  }

  return { score: Math.round(clamp(score)), factors };
}

function riskFromScore(score: number): "low" | "medium" | "high" {
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  return "low";
}

function recommend(risk: "low" | "medium" | "high", factors: string[]): string {
  if (risk === "high") return "Call the customer and offer a renewal/incentive before they lapse.";
  if (risk === "medium") return "Schedule a check-in and share a personalised offer.";
  if (factors.some((f) => f.includes("overdue"))) return "Send a friendly payment reminder.";
  return "Maintain the relationship with periodic value updates.";
}

export async function predictClientChurn(organizationId: string): Promise<ChurnPrediction[]> {
  const now = Date.now();
  const rows = await db
    .select({
      clientId: invoices.clientId,
      count: sql<number>`count(*)`,
      overdue: sql<number>`count(*) filter (where ${invoices.status} = 'overdue')`,
      lastDate: sql<string>`max(${invoices.createdAt})`,
      total: sql<number>`coalesce(sum(${invoices.total}),0)`,
    })
    .from(invoices)
    .where(and(eq(invoices.organizationId, organizationId), sql`${invoices.clientId} is not null`))
    .groupBy(invoices.clientId);

  const clientIds = rows.map((r) => r.clientId).filter(Boolean) as string[];
  const clientMap = new Map(
    (await db.query.clients.findMany({ where: eq(clients.organizationId, organizationId) })).map(
      (c) => [c.id, c.name]
    )
  );

  const predictions: ChurnPrediction[] = [];
  for (const r of rows) {
    if (!r.clientId) continue;
    const last = r.lastDate ? new Date(r.lastDate).getTime() : 0;
    const recencyDays = last ? Math.round((now - last) / 86_400_000) : 999;
    const { score, factors } = scoreFromSignals({
      recencyDays,
      frequency: Number(r.count),
      overdue: Number(r.overdue),
      monetary: Number(r.total),
    });
    const risk = riskFromScore(score);
    predictions.push({
      customerType: "client",
      customerId: r.clientId,
      customerName: clientMap.get(r.clientId) ?? "Unknown",
      risk,
      score,
      factors,
      recommendedAction: recommend(risk, factors),
    });
  }

  await upsertPredictions(organizationId, predictions);
  return predictions.sort((a, b) => b.score - a.score);
}

async function upsertPredictions(organizationId: string, predictions: ChurnPrediction[]) {
  for (const p of predictions) {
    await db
      .insert(aiChurnPredictions)
      .values({
        organizationId,
        userId: "00000000-0000-0000-0000-000000000000",
        customerType: p.customerType,
        customerId: p.customerId,
        customerName: p.customerName,
        risk: p.risk,
        score: p.score,
        factors: p.factors,
        recommendedAction: p.recommendedAction,
        predictedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [aiChurnPredictions.organizationId, aiChurnPredictions.customerType, aiChurnPredictions.customerId],
        set: {
          customerName: p.customerName,
          risk: p.risk,
          score: p.score,
          factors: p.factors,
          recommendedAction: p.recommendedAction,
          predictedAt: new Date(),
        },
      });
  }
}

/** Optional narrative for the top at-risk customers. */
export async function churnNarrative(predictions: ChurnPrediction[]): Promise<string> {
  const top = predictions.filter((p) => p.risk !== "low").slice(0, 5);
  if (top.length === 0) return "No elevated churn risk detected.";
  try {
    return await callOpenAI(
      "You are a concise retention analyst for a Kenyan SME.",
      `Summarise churn risk for: ${top.map((p) => `${p.customerName} (${p.risk}, ${p.score})`).join("; ")}`,
      []
    );
  } catch {
    return `${top.length} customer(s) at elevated churn risk. Prioritise outreach.`;
  }
}
