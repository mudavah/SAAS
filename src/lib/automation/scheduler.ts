/**
 * KaziFlow — Scheduled automation runner
 * ------------------------------------------------------------------
 * Runs event-triggered automations on a schedule. The cron matcher supports
 * wildcards, step values, comma lists and exact values for the standard 5-field
 * expression (minute hour day-of-month month day-of-week). No external cron
 * dependency. To avoid double-firing within the same minute, a workflow is
 * only run if it has never run or its last run was before the current minute.
 */
import { db } from "@/db";
import { automationWorkflows } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import type { ServerContext } from "@/lib/session";
import { loadWorkflow, runWorkflow } from "./engine";
import type { Workflow, AutomationEvent } from "./types";

function fieldMatches(field: string, value: number, max: number): boolean {
  if (field === "*") return true;
  // step: */n
  if (field.startsWith("*/")) {
    const step = parseInt(field.slice(2), 10);
    return step > 0 && value % step === 0;
  }
  // list: a,b,c
  if (field.includes(",")) {
    return field.split(",").some((part) => fieldMatches(part.trim(), value, max));
  }
  // range: a-b
  if (field.includes("-")) {
    const [lo, hi] = field.split("-").map((n) => parseInt(n, 10));
    return value >= lo && value <= hi;
  }
  const n = parseInt(field, 10);
  return Number.isFinite(n) && value === n;
}

export function cronMatches(cron: string, date = new Date()): boolean {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [min, hour, dom, month, dow] = parts;
  const minute = date.getMinutes();
  const hr = date.getHours();
  const day = date.getDate();
  const mon = date.getMonth() + 1;
  // JS getDay: 0=Sun..6=Sat. Cron 0=Sun..6=Sat → matches directly.
  const weekday = date.getDay();
  return (
    fieldMatches(min, minute, 59) &&
    fieldMatches(hour, hr, 23) &&
    fieldMatches(dom, day, 31) &&
    fieldMatches(month, mon, 12) &&
    fieldMatches(dow, weekday, 7)
  );
}

/** Compute the next occurrence of a cron expression (max 1 year ahead). */
export function nextRunFromCron(cron: string, from = new Date()): Date | null {
  for (let i = 1; i <= 366 * 24 * 60; i++) {
    const d = new Date(from.getTime() + i * 60_000);
    if (cronMatches(cron, d)) return d;
  }
  return null;
}

/**
 * Runs all ACTIVE schedule-triggered workflows that are due right now. Invoke
 * from a cron endpoint (e.g. /api/automation/scheduled/run) every minute.
 */
export async function runDueScheduledWorkflows(): Promise<{ workflowId: string; status: string }[]> {
  const workflows = await db.query.automationWorkflows.findMany({
    where: and(
      eq(automationWorkflows.status, "active"),
      eq(automationWorkflows.triggerType, "schedule")
    ),
    with: { actions: true },
  });

  const out: { workflowId: string; status: string }[] = [];
  for (const wf of workflows as unknown as Workflow[]) {
    const cfg = (wf.triggerConfig as any) || {};
    const cron = cfg.cron as string | undefined;
    if (!cron || !cronMatches(cron)) continue;

    // Avoid re-firing in the same minute.
    if (wf.lastRunAt && sameMinute(new Date(wf.lastRunAt), new Date())) continue;

    const event: AutomationEvent = {
      type: "schedule",
      organizationId: wf.organizationId,
      userId: wf.userId,
      payload: { workflowId: wf.id, ranAt: new Date().toISOString() },
    };

    // Use a synthetic owner-wide context (schedule runs as the workflow owner).
    const org = await db.query.organizations.findFirst({
      where: eq(automationWorkflows.organizationId, wf.organizationId),
      columns: { id: true, name: true, slug: true, plan: true, ownerId: true },
    });
    const ctx = {
      userId: wf.userId,
      organizationId: wf.organizationId,
      organization: org as any,
      roleType: "owner",
      memberId: null,
      permissions: new Set([] as any),
      authMethod: "session" as const,
    } as unknown as ServerContext;

    try {
      const res = await runWorkflow(ctx, wf, event);
      out.push({ workflowId: wf.id, status: res.status });
    } catch (err) {
      console.error(`Scheduled workflow ${wf.id} failed:`, err);
      out.push({ workflowId: wf.id, status: "failed" });
    }
  }
  return out;
}

function sameMinute(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate() &&
    a.getHours() === b.getHours() &&
    a.getMinutes() === b.getMinutes()
  );
}

/** Manually trigger a scheduled/any workflow via API. */
export async function runWorkflowNow(
  ctx: ServerContext,
  workflowId: string
): Promise<{ runId: string; status: string }> {
  const wf = await loadWorkflow(ctx.organizationId, workflowId);
  if (!wf) throw new Error("Workflow not found");
  const event: AutomationEvent = {
    type: "manual",
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    payload: { workflowId, triggeredBy: ctx.userId, at: new Date().toISOString() },
  };
  const res = await runWorkflow(ctx, wf, event);
  return { runId: res.runId, status: res.status };
}
