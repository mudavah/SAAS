/**
 * KaziFlow — Integration Hub activity & event queue
 * ------------------------------------------------------------------
 * Per-operation activity logs plus an outbound/inbound event queue with retry.
 * Events are enqueued (e.g. by dispatch) and processed (best-effort) by the
 * queue worker, which calls the adapter's `send`/`sync` where applicable and
 * records the outcome. Offline, processing degrades to a simulated result.
 */
import { db } from "@/db";
import {
  integrations,
  integrationActivityLogs,
  integrationEvents,
} from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import type { ServerContext } from "@/lib/session";
import { requirePermission, notFound } from "./core";
import { toConnectionView } from "./connections";
import { getAdapter } from "./adapters";
import type { IntegrationEventStatus } from "@/db/schema";

export interface ActivityLogInput {
  action: string;
  status: "success" | "error" | "info";
  message?: string;
  detail?: Record<string, unknown>;
}

export async function logActivity(
  ctx: ServerContext,
  integrationId: string,
  input: ActivityLogInput,
  latencyMs?: number
): Promise<void> {
  const integration = await db.query.integrations.findFirst({
    where: and(
      eq(integrations.id, integrationId),
      eq(integrations.organizationId, ctx.organizationId)
    ),
  });
  if (!integration) notFound("Integration not found");
  await db.insert(integrationActivityLogs).values({
    integrationId,
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    provider: integration.provider,
    action: input.action,
    status: input.status,
    message: input.message,
    detail: input.detail ?? {},
    latencyMs: latencyMs ?? null,
  });
}

export async function listActivity(
  ctx: ServerContext,
  opts: { integrationId?: string; limit?: number } = {}
): Promise<any[]> {
  requirePermission(ctx, "integrations.logs.view");
  const conditions = [eq(integrationActivityLogs.organizationId, ctx.organizationId)];
  if (opts.integrationId) {
    conditions.push(eq(integrationActivityLogs.integrationId, opts.integrationId));
  }
  return db.query.integrationActivityLogs.findMany({
    where: and(...conditions),
    orderBy: [desc(integrationActivityLogs.createdAt)],
    limit: Math.min(opts.limit ?? 50, 200),
  });
}

export interface EnqueueEventInput {
  direction?: "outbound" | "inbound";
  type: string;
  payload: Record<string, unknown>;
  maxAttempts?: number;
  processAt?: Date;
}

export async function enqueueEvent(
  ctx: ServerContext | { organizationId: string; userId?: string | null },
  integrationId: string,
  input: EnqueueEventInput
): Promise<string> {
  const [row] = await db
    .insert(integrationEvents)
    .values({
      integrationId,
      organizationId: ctx.organizationId,
      direction: input.direction ?? "outbound",
      type: input.type,
      status: "pending",
      payload: input.payload,
      maxAttempts: input.maxAttempts ?? 5,
      nextRetryAt: input.processAt ?? new Date(),
    })
    .returning();
  return row.id;
}

/**
 * Process a single pending/retrying event: resolves the connection, calls the
 * adapter, and records the outcome. Returns the new status.
 */
export async function processEvent(eventId: string): Promise<IntegrationEventStatus> {
  const event = await db.query.integrationEvents.findFirst({
    where: eq(integrationEvents.id, eventId),
  });
  if (!event) return "dead";
  if (event.status === "success" || event.status === "dead") return event.status;

  const integration = await db.query.integrations.findFirst({
    where: eq(integrations.id, event.integrationId),
  });
  if (!integration) {
    await markEvent(eventId, "dead", "Integration deleted", null);
    return "dead";
  }

  await db
    .update(integrationEvents)
    .set({ status: "processing", attempts: event.attempts + 1 })
    .where(eq(integrationEvents.id, eventId));

  try {
    const view = await toConnectionView(integration);
    const adapter = getAdapter(integration.provider);
    let outcome: { ok: boolean; message: string; externalId?: string } = {
      ok: true,
      message: "Processed",
    };
    if (adapter && event.type === "send" && adapter.send && view.enabled) {
      const p = event.payload as any;
      outcome = await adapter.send(view, {
        to: p.to,
        subject: p.subject,
        body: p.body,
        template: p.template,
        meta: p.meta,
      });
    } else if (adapter && adapter.sync && view.enabled) {
      const r = await adapter.sync(view, event.payload ?? undefined);
      outcome = { ok: r.ok, message: r.message };
    }

    if (outcome.ok) {
      await markEvent(eventId, "success", outcome.message, {
        externalId: outcome.externalId,
      });
      await db
        .update(integrations)
        .set({ lastSyncAt: new Date(), updatedAt: new Date() })
        .where(eq(integrations.id, integration.id));
      return "success";
    }
    return await retryOrFail(event, outcome.message);
  } catch (err) {
    return await retryOrFail(event, (err as Error).message);
  }
}

async function retryOrFail(
  event: { id: string; attempts: number; maxAttempts: number },
  error: string
): Promise<IntegrationEventStatus> {
  if (event.attempts >= event.maxAttempts) {
    await markEvent(event.id, "dead", error, null);
    return "dead";
  }
  const backoffMs = Math.min(1000 * 2 ** event.attempts, 30 * 60 * 1000);
  await db
    .update(integrationEvents)
    .set({
      status: "retrying",
      error,
      nextRetryAt: new Date(Date.now() + backoffMs),
    })
    .where(eq(integrationEvents.id, event.id));
  return "retrying";
}

async function markEvent(
  id: string,
  status: IntegrationEventStatus,
  error: string | null,
  response: Record<string, unknown> | null
) {
  await db
    .update(integrationEvents)
    .set({
      status,
      error,
      response: response ?? undefined,
      processedAt: status === "success" ? new Date() : null,
    })
    .where(eq(integrationEvents.id, id));
}

/** Drain due events for an organization (best-effort worker). */
export async function processDueEvents(organizationId: string): Promise<number> {
  const due = await db.query.integrationEvents.findMany({
    where: and(
      eq(integrationEvents.organizationId, organizationId),
      eq(integrationEvents.status, "pending")
    ),
    limit: 50,
  });
  let processed = 0;
  for (const e of due) {
    const status = await processEvent(e.id);
    if (status === "success" || status === "dead") processed++;
  }
  return processed;
}
