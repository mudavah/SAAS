/**
 * KaziFlow — Workflow automation engine
 * ------------------------------------------------------------------
 * Orchestrates a single workflow run: evaluates top-level + per-action
 * conditions, executes each action in order, records a full audit trail, and
 * updates the workflow's run counters. Also exposes `dispatchBusinessEvent`,
 * the central event bus existing module routes call so any business event can
 * trigger automations (notifications, timeline events, business actions).
 */
import { db } from "@/db";
import {
  automationWorkflows,
  automationRuns,
  organizations,
} from "@/db/schema";
import { and, eq, asc, desc, sql } from "drizzle-orm";
import type { ServerContext } from "@/lib/session";
import { executeAction } from "./actions";
import { evaluateGroup } from "./conditions";
import type {
  Workflow,
  AutomationEvent,
  RunContext,
  ActionResult,
  WorkflowAction,
} from "./types";
import { logAuditSafe } from "@/lib/audit";
import { emitTimelineEvent } from "@/lib/timeline";
import { logger } from "@/lib/logger";

/**
 * Load a workflow with its actions, all org-scoped.
 */
export async function loadWorkflow(
  organizationId: string,
  workflowId: string
): Promise<Workflow | null> {
  const wf = await db.query.automationWorkflows.findFirst({
    where: and(
      eq(automationWorkflows.id, workflowId),
      eq(automationWorkflows.organizationId, organizationId)
    ),
    with: { actions: { orderBy: (a: any) => [asc(a.order)] } },
  });
  return (wf as unknown as Workflow) ?? null;
}

function buildRunContext(event: AutomationEvent): RunContext {
  return {
    event,
    data: {
      ...event.payload,
      event: {
        type: event.type,
        organizationId: event.organizationId,
        userId: event.userId ?? null,
      },
    },
  };
}

/**
 * Execute a workflow for a given event. Returns the run record + per-action
 * results. Never throws for action failures (captured in results); throws only
 * on fatal infra errors.
 */
export async function runWorkflow(
  ctx: ServerContext,
  workflow: Workflow,
  event: AutomationEvent
): Promise<{ runId: string; status: string; results: ActionResult[] }> {
  const runCtx = buildRunContext(event);

  const topLevelPass = evaluateGroup(
    workflow.conditions as any,
    runCtx.data
  );

  const [run] = await db
    .insert(automationRuns)
    .values({
      workflowId: workflow.id,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      triggerType: workflow.triggerType,
      triggerEvent: event.payload,
      status: topLevelPass ? "running" : "skipped",
    })
    .returning();

  if (!topLevelPass) {
    await db
      .update(automationWorkflows)
      .set({ runCount: sql`${automationWorkflows.runCount} + 1`, lastRunAt: new Date(), lastRunStatus: "skipped", updatedAt: new Date() })
      .where(eq(automationWorkflows.id, workflow.id));
    return { runId: run.id, status: "skipped", results: [] };
  }

  const results: ActionResult[] = [];
  let succeeded = 0;
  let failed = 0;

  for (const action of workflow.actions) {
    const actionConditionsPass = evaluateGroup(
      action.conditions as any,
      runCtx.data
    );
    if (!actionConditionsPass) {
      results.push({
        actionId: action.id,
        type: action.type,
        order: action.order,
        status: "skipped",
        input: { skipped: "conditions not met" },
        output: {},
      });
      continue;
    }
    const res = await executeAction(
      ctx,
      action as WorkflowAction,
      runCtx,
      run.id
    );
    results.push(res);
    if (res.status === "success") succeeded++;
    else failed++;
  }

  const finalStatus = failed === 0 ? "success" : succeeded > 0 ? "partial" : "failed";

  await db
    .update(automationRuns)
    .set({
      status: finalStatus as any,
      finishedAt: new Date(),
      actionsTotal: workflow.actions.length,
      actionsSucceeded: succeeded,
      actionsFailed: failed,
    })
    .where(eq(automationRuns.id, run.id));

  await db
    .update(automationWorkflows)
    .set({
      runCount: sql`${automationWorkflows.runCount} + 1`,
      lastRunAt: new Date(),
      lastRunStatus: finalStatus as any,
      updatedAt: new Date(),
    })
    .where(eq(automationWorkflows.id, workflow.id));

  await emitTimelineEvent({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    eventType: finalStatus === "failed" ? "automation.workflow.failed" : "automation.workflow.run",
    title: `Automation "${workflow.name}" ${finalStatus}`,
    description: `${succeeded} succeeded, ${failed} failed`,
    resourceType: "automation_workflow",
    resourceId: workflow.id,
    metadata: { runId: run.id, status: finalStatus },
  });

  return { runId: run.id, status: finalStatus, results };
}

/**
 * Central event bus. Find all ACTIVE event-triggered workflows for this org
 * whose trigger event matches, and run them. Best-effort: one workflow failure
 * is isolated from the others.
 */
export async function dispatchBusinessEvent(event: AutomationEvent): Promise<void> {
  try {
    const workflows = await db.query.automationWorkflows.findMany({
      where: and(
        eq(automationWorkflows.organizationId, event.organizationId),
        eq(automationWorkflows.status, "active"),
        eq(automationWorkflows.triggerType, "event")
      ),
      with: { actions: { orderBy: (a: any) => [asc(a.order)] } },
    });

    const matches = workflows.filter((w) => {
      const cfg = (w.triggerConfig as any) || {};
      if (cfg.event && cfg.event !== event.type) return false;
      // optional event filters
      if (cfg.eventFilters) {
        const data = buildRunContext(event).data;
        return evaluateGroup(cfg.eventFilters, data);
      }
      return true;
    });

    for (const wf of matches) {
      try {
        // Build a minimal ServerContext-like object. We don't have a session
        // here, so we use the event's actor (userId) plus the org. The action
        // executors only need organizationId / userId / roleType for scoping;
        // we resolve a viewer context that still writes org-scoped rows.
        const ctx = await buildEventContext(event);
        await runWorkflow(ctx, wf as unknown as Workflow, event);
      } catch (err) {
        logger.error("Automation ${wf.id} failed:", { error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined });
      }
    }
  } catch (err) {
    logger.error("dispatchBusinessEvent error:", { error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined });
  }
}

/**
 * Build a ServerContext for an automation run triggered by an event (no live
 * HTTP session). Uses the event actor when present; permissions default to a
 * broad set so automation actions can write org-scoped rows.
 */
async function buildEventContext(event: AutomationEvent): Promise<ServerContext> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, event.organizationId),
    columns: { id: true, name: true, slug: true, plan: true, ownerId: true },
  });
  return {
    userId: event.userId ?? org?.ownerId ?? null,
    organizationId: event.organizationId,
    organization: org as any,
    roleType: "owner",
    memberId: null,
    permissions: new Set(["ai.access", "automation.execute", "invoices.create", "tasks.create", "notifications.manage", "timeline.view"] as any),
    authMethod: "session",
    plan: org?.plan,
  } as unknown as ServerContext;
}

/** List workflows for an org, newest first. */
export async function listWorkflows(
  organizationId: string,
  opts: { status?: string } = {}
) {
  const conditions = [eq(automationWorkflows.organizationId, organizationId)];
  if (opts.status) conditions.push(eq(automationWorkflows.status, opts.status as any));
  return db.query.automationWorkflows.findMany({
    where: and(...conditions),
    with: { actions: { orderBy: (a: any) => [asc(a.order)] } },
    orderBy: (w: any) => [desc(w.createdAt)],
  });
}

/** List recent runs for an org or workflow. */
export async function listRuns(
  organizationId: string,
  opts: { workflowId?: string; limit?: number } = {}
) {
  const conditions = [eq(automationRuns.organizationId, organizationId)];
  if (opts.workflowId) conditions.push(eq(automationRuns.workflowId, opts.workflowId));
  return db.query.automationRuns.findMany({
    where: and(...conditions),
    with: { logs: { orderBy: (l: any) => [asc(l.order)] } },
    orderBy: (r: any) => [desc(r.createdAt)],
    limit: opts.limit ?? 50,
  });
}
