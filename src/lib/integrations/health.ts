/**
 * KaziFlow — Integration Hub health service
 * ------------------------------------------------------------------
 * Runs an adapter-driven health check for a connection, persists a snapshot to
 * integration_health_checks, updates the connection's healthStatus, and
 * aggregates a dashboard view across the organization.
 */
import { db } from "@/db";
import {
  integrations,
  integrationHealthChecks,
  integrationActivityLogs,
} from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import type { ServerContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { emitTimelineEvent } from "@/lib/timeline";
import { requirePermission, notFound } from "./core";
import { toConnectionView } from "./connections";
import { getAdapter } from "./adapters";
import type { IntegrationHealthStatus } from "@/db/schema";
import type { TestResult } from "./adapters/types";

export interface HealthSnapshot {
  integrationId: string;
  status: IntegrationHealthStatus;
  message: string;
  latencyMs?: number;
  detail?: Record<string, unknown>;
  checkedAt: Date;
}

export async function runHealthCheck(
  ctx: ServerContext,
  integrationId: string
): Promise<HealthSnapshot> {
  requirePermission(ctx, "integrations.view");
  const row = await db.query.integrations.findFirst({
    where: and(
      eq(integrations.id, integrationId),
      eq(integrations.organizationId, ctx.organizationId)
    ),
  });
  if (!row) notFound("Integration not found");

  const view = await toConnectionView(row);
  const adapter = getAdapter(row.provider);
  const start = Date.now();
  let result: TestResult = {
    ok: false,
    status: "unknown",
    message: "Health check not performed.",
  };
  try {
    if (!adapter) {
      result = {
        ok: false,
        status: "down",
        message: "No adapter registered for this provider.",
      };
    } else {
      result = await adapter.testConnection(view);
    }
  } catch (err) {
    result = {
      ok: false,
      status: "down",
      message: `Health check error: ${(err as Error).message}`,
    };
  }
  const latencyMs = Date.now() - start;

  await db.insert(integrationHealthChecks).values({
    integrationId: row.id,
    organizationId: ctx.organizationId,
    status: result.status as IntegrationHealthStatus,
    latencyMs,
    detail: { message: result.message, ...(result.detail || {}) },
  });

  await db
    .update(integrations)
    .set({
      healthStatus: result.status as IntegrationHealthStatus,
      lastCheckedAt: new Date(),
      errorMessage: result.ok ? null : result.message,
      status: result.ok ? (row.status === "disconnected" ? row.status : "connected") : "error",
      updatedAt: new Date(),
    })
    .where(eq(integrations.id, row.id));

  if (result.status === "degraded" || result.status === "down") {
    await emitTimelineEvent({
      userId: ctx.userId ?? null,
      organizationId: ctx.organizationId,
      eventType: "integration.health.degraded",
      title: `Integration health degraded: ${row.provider}`,
      description: result.message,
      resourceType: "integration",
      resourceId: row.id,
    });
  }

  return {
    integrationId: row.id,
    status: result.status,
    message: result.message,
    latencyMs,
    detail: result.detail,
    checkedAt: new Date(),
  };
}

export interface HealthDashboardEntry {
  id: string;
  provider: string;
  name: string;
  category: string;
  status: string;
  healthStatus: IntegrationHealthStatus;
  enabled: boolean;
  lastCheckedAt: Date | null;
  lastSyncAt: Date | null;
  errorMessage: string | null;
  latencyMs: number | null;
}

export interface HealthDashboard {
  total: number;
  connected: number;
  byStatus: Record<string, number>;
  entries: HealthDashboardEntry[];
}

export async function getHealthDashboard(
  ctx: ServerContext
): Promise<HealthDashboard> {
  requirePermission(ctx, "integrations.view");
  const rows = await db.query.integrations.findMany({
    where: eq(integrations.organizationId, ctx.organizationId),
    orderBy: [desc(integrations.healthStatus), desc(integrations.createdAt)],
  });

  const lastCheck = await db
    .select({
      integrationId: integrationHealthChecks.integrationId,
      latencyMs: integrationHealthChecks.latencyMs,
    })
    .from(integrationHealthChecks)
    .where(eq(integrationHealthChecks.organizationId, ctx.organizationId))
    .orderBy(desc(integrationHealthChecks.checkedAt))
    .limit(1000);

  const latencyByIntegration = new Map<string, number | null>();
  for (const l of lastCheck) latencyByIntegration.set(l.integrationId, l.latencyMs ?? null);

  const entries: HealthDashboardEntry[] = rows.map((r) => ({
    id: r.id,
    provider: r.provider,
    name: r.name,
    category: r.category,
    status: r.status,
    healthStatus: r.healthStatus,
    enabled: r.enabled,
    lastCheckedAt: r.lastCheckedAt,
    lastSyncAt: r.lastSyncAt,
    errorMessage: r.errorMessage,
    latencyMs: latencyByIntegration.get(r.id) ?? null,
  }));

  const byStatus: Record<string, number> = {};
  let connected = 0;
  for (const e of entries) {
    byStatus[e.healthStatus] = (byStatus[e.healthStatus] || 0) + 1;
    if (e.healthStatus === "healthy") connected++;
  }

  return { total: entries.length, connected, byStatus, entries };
}

/** Record a health-degraded activity log (used by webhook/event processors). */
export async function logHealthActivity(
  ctx: ServerContext,
  integrationId: string,
  message: string
): Promise<void> {
  await db.insert(integrationActivityLogs).values({
    integrationId,
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    provider: "",
    action: "health.degraded",
    status: "error",
    message,
  });
  await logAuditSafe(ctx, {
    action: "integration.health.degraded",
    category: "integrations",
    resourceType: "integration",
    resourceId: integrationId,
    description: message,
  });
}
