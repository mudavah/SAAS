import { db } from "@/db";
import {
  integrations,
  integrationHealthChecks,
  integrationActivityLogs,
  aiInsights,
} from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import type { ServerContext } from "@/lib/session";
import { requirePermission } from "./core";
import { logAuditSafe } from "@/lib/audit";
import { emitTimelineEvent } from "@/lib/timeline";

export interface IntegrationInsight {
  type: string;
  title: string;
  description: string;
  priority: string;
  data: Record<string, unknown>;
}

export async function getIntegrationInsights(
  ctx: ServerContext
): Promise<IntegrationInsight[]> {
  requirePermission(ctx, "integrations.view");
  const rows = await db
    .select({
      type: aiInsights.type,
      title: aiInsights.title,
      description: aiInsights.description,
      priority: aiInsights.priority,
      data: aiInsights.data,
    })
    .from(aiInsights)
    .where(eq(aiInsights.organizationId, ctx.organizationId))
    .orderBy(desc(aiInsights.createdAt))
    .limit(50);
  return rows.map((r) => ({ ...r, data: r.data ?? {} }));
}

export async function generateIntegrationInsights(
  ctx: ServerContext
): Promise<void> {
  requirePermission(ctx, "integrations.view");

  const orgId = ctx.organizationId;

  const [totalResult, healthyResult, degradedResult, downResult] =
    await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(integrations)
        .where(eq(integrations.organizationId, orgId)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(integrations)
        .where(
          and(
            eq(integrations.organizationId, orgId),
            eq(integrations.healthStatus, "healthy")
          )
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(integrations)
        .where(
          and(
            eq(integrations.organizationId, orgId),
            eq(integrations.healthStatus, "degraded")
          )
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(integrations)
        .where(
          and(
            eq(integrations.organizationId, orgId),
            eq(integrations.healthStatus, "down")
          )
        ),
    ]);

  const total = Number(totalResult[0]?.count || 0);
  const healthy = Number(healthyResult[0]?.count || 0);
  const degraded = Number(degradedResult[0]?.count || 0);
  const down = Number(downResult[0]?.count || 0);

  const insights: {
    type: string;
    title: string;
    description: string;
    priority: string;
    data: Record<string, unknown>;
  }[] = [];

  if (total === 0) {
    insights.push({
      type: "integration_adoption",
      title: "No integrations connected",
      description:
        "Connect your first integration to start automating workflows and reducing manual work.",
      priority: "high",
      data: { totalIntegrations: 0 },
    });
  } else {
    if (down > 0) {
      insights.push({
        type: "integration_health",
        title: `${down} integration${down > 1 ? "s" : ""} down`,
        description: `You have ${down} integration${down > 1 ? "s" : ""} currently down and needing immediate attention.`,
        priority: "high",
        data: { down, total, healthy, degraded },
      });
    }

    if (degraded > 0 && down === 0) {
      insights.push({
        type: "integration_health",
        title: `${degraded} integration${degraded > 1 ? "s" : ""} degraded`,
        description: `Review ${degraded} integration${degraded > 1 ? "s" : ""} with degraded health status to prevent downtime.`,
        priority: "normal",
        data: { degraded, total, healthy },
      });
    }

    if (healthy > 0 && degraded === 0 && down === 0) {
      insights.push({
        type: "integration_health",
        title: "All integrations healthy",
        description: `All ${healthy} connected integration${healthy > 1 ? "s are" : " is"} healthy and performing well.`,
        priority: "low",
        data: { healthy, total },
      });
    }
  }

  const recentActivity = await db
    .select({ count: sql<number>`count(*)` })
    .from(integrationActivityLogs)
    .where(eq(integrationActivityLogs.organizationId, orgId));

  const activityCount = Number(recentActivity[0]?.count || 0);

  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const weekActivity = await db
    .select({ count: sql<number>`count(*)` })
    .from(integrationActivityLogs)
    .where(
      and(
        eq(integrationActivityLogs.organizationId, orgId),
        sql`${integrationActivityLogs.createdAt} >= ${lastWeek}`
      )
    );
  const weekActivityCount = Number(weekActivity[0]?.count || 0);

  insights.push({
    type: "integration_usage",
    title: "Integration activity summary",
    description: `Total activity logs: ${activityCount}. This week: ${weekActivityCount}. Total integrations: ${total}.`,
    priority: "low",
    data: {
      activityCount,
      weekActivityCount,
      totalIntegrations: total,
      healthy,
      degraded,
      down,
    },
  });

  const categories = await db
    .select({
      category: integrations.category,
      count: sql<number>`count(*)`,
    })
    .from(integrations)
    .where(eq(integrations.organizationId, orgId))
    .groupBy(integrations.category);

  insights.push({
    type: "integration_categories",
    title: "Integration category breakdown",
    description: `You have integrations across ${categories.length} categor${categories.length === 1 ? "y" : "ies"}: ${categories.map((c) => `${c.category} (${c.count})`).join(", ")}.`,
    priority: "low",
    data: { categories: categories.map((c) => ({ category: c.category, count: c.count })), total },
  });

  for (const insight of insights) {
    await db.insert(aiInsights).values({
      userId: ctx.userId!,
      organizationId: orgId,
      type: insight.type,
      title: insight.title,
      description: insight.description,
      priority: insight.priority,
      data: insight.data,
    });
  }

  await logAuditSafe(ctx, {
    action: "integration.ai.insights.generated",
    category: "integrations",
    resourceType: "ai_insight",
    description: `Generated ${insights.length} integration insights`,
    newValues: { insightsGenerated: insights.length },
  });

  await emitTimelineEvent({
    userId: ctx.userId ?? null,
    organizationId: orgId,
    eventType: "integration.ai.insights.generated",
    title: "Integration insights generated",
    description: `Generated ${insights.length} AI insights for integrations.`,
    resourceType: "ai_insight",
  });
}
