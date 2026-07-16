/**
 * KaziFlow — AI usage analytics & cost monitoring
 * ------------------------------------------------------------------
 * Tracks token consumption and estimated cost per AI request so admins can
 * monitor spend, and powers the AI usage analytics view. All writes are
 * additive (increment columns on the org's monthly usage record) and fail-open
 * so a metrics hiccup never blocks a generation.
 *
 * Pricing is expressed in USD cents per 1K tokens and is conservative/
 * configurable via env (defaults match common OpenAI small-model pricing).
 */
import { db } from "@/db";
import { usageRecords } from "@/db/schema";
import { and, eq, sql, desc } from "drizzle-orm";

interface ModelPricing {
  promptCentsPer1k: number;
  completionCentsPer1k: number;
}

const DEFAULT_PRICING: Record<string, ModelPricing> = {
  "gpt-4o-mini": { promptCentsPer1k: 0.015, completionCentsPer1k: 0.06 },
  "gpt-4o": { promptCentsPer1k: 0.5, completionCentsPer1k: 1.5 },
  "gpt-3.5-turbo": { promptCentsPer1k: 0.015, completionCentsPer1k: 0.045 },
};

export function getModelPricing(model: string): ModelPricing {
  return (
    DEFAULT_PRICING[model] ??
    DEFAULT_PRICING[process.env.OPENAI_MODEL || "gpt-4o-mini"] ??
    DEFAULT_PRICING["gpt-4o-mini"]
  );
}

export function estimateCostCents(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const p = getModelPricing(model);
  const cost =
    (promptTokens / 1000) * p.promptCentsPer1k +
    (completionTokens / 1000) * p.completionCentsPer1k;
  return Math.round(cost * 100) / 100;
}

export interface RecordAiUsageInput {
  organizationId: string;
  userId: string;
  month: string; // YYYY-MM
  model: string;
  promptTokens: number;
  completionTokens: number;
  costCents: number;
  cached?: boolean;
}

/** Increment the org's monthly AI usage metrics. Fail-open. */
export async function recordAiUsage(input: RecordAiUsageInput): Promise<void> {
  try {
    const existing = await db.query.usageRecords.findFirst({
      where: and(
        eq(usageRecords.organizationId, input.organizationId),
        eq(usageRecords.month, input.month)
      ),
    });

    if (existing) {
      await db
        .update(usageRecords)
        .set({
          aiRequests: sql`${usageRecords.aiRequests} + 1`,
          aiPromptTokens: sql`COALESCE(${usageRecords.aiPromptTokens}, 0) + ${input.promptTokens}`,
          aiCompletionTokens:
            sql`COALESCE(${usageRecords.aiCompletionTokens}, 0) + ${input.completionTokens}`,
          aiCostCents:
            sql`COALESCE(${usageRecords.aiCostCents}, 0) + ${Math.round(input.costCents)}`,
          aiModel: input.model,
        })
        .where(eq(usageRecords.id, existing.id));
    } else {
      await db.insert(usageRecords).values({
        organizationId: input.organizationId,
        userId: input.userId,
        month: input.month,
        aiRequests: input.cached ? 0 : 1,
        aiPromptTokens: input.cached ? 0 : input.promptTokens,
        aiCompletionTokens: input.cached ? 0 : input.completionTokens,
        aiCostCents: input.cached ? 0 : Math.round(input.costCents),
        aiModel: input.model,
      });
    }
  } catch (err) {
    // Never let metrics break a generation.
    console.warn("[ai-usage] failed to record usage", err);
  }
}

export interface AiUsageAnalytics {
  month: string;
  aiRequests: number;
  promptTokens: number;
  completionTokens: number;
  costCents: number;
  model: string | null;
}

/** Aggregate AI usage for an organization across the trailing N months. */
export async function getAiUsageAnalytics(
  organizationId: string,
  months = 6
): Promise<AiUsageAnalytics[]> {
  const rows = await db
    .select({
      month: usageRecords.month,
      aiRequests: usageRecords.aiRequests,
      promptTokens: sql<number>`COALESCE(${usageRecords.aiPromptTokens}, 0)`,
      completionTokens: sql<number>`COALESCE(${usageRecords.aiCompletionTokens}, 0)`,
      costCents: sql<number>`COALESCE(${usageRecords.aiCostCents}, 0)`,
      model: usageRecords.aiModel,
    })
    .from(usageRecords)
    .where(eq(usageRecords.organizationId, organizationId))
    .orderBy(desc(usageRecords.month))
    .limit(months);

  return rows.map((r) => ({
    month: r.month,
    aiRequests: r.aiRequests ?? 0,
    promptTokens: Number(r.promptTokens ?? 0),
    completionTokens: Number(r.completionTokens ?? 0),
    costCents: Number(r.costCents ?? 0),
    model: r.model,
  }));
}

export function formatCostCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
