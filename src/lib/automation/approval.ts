/**
 * KaziFlow — Approval workflow engine
 * ------------------------------------------------------------------
 * Creates approval requests from a definition (ordered approver steps) and
 * advances them step-by-step. Every decision is audited, notified and emitted
 * to the Business Timeline. Multi-tenant scoped.
 */
import { db } from "@/db";
import {
  approvalWorkflows,
  approvalRequests,
  approvalSteps,
  organizationMembers,
} from "@/db/schema";
import { and, eq, asc, desc, sql } from "drizzle-orm";
import type { ServerContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { emitTimelineEvent } from "@/lib/timeline";

export interface RequestApprovalInput {
  approvalWorkflowId?: string | null;
  title: string;
  resourceType: string;
  resourceId?: string | null;
  payload?: Record<string, unknown>;
}

export interface ApprovalStepDef {
  order: number;
  label?: string;
  approverRole?: string;
  approverUserId?: string;
}

export async function requestApproval(
  ctx: ServerContext,
  input: RequestApprovalInput
): Promise<typeof approvalRequests.$inferSelect> {
  const { approvalWorkflowId, title, resourceType, resourceId, payload } = input;

  const wf = approvalWorkflowId
    ? await db.query.approvalWorkflows.findFirst({
        where: and(
          eq(approvalWorkflows.id, approvalWorkflowId),
          eq(approvalWorkflows.organizationId, ctx.organizationId)
        ),
      })
    : await db.query.approvalWorkflows.findFirst({
        where: and(
          eq(approvalWorkflows.resourceType, resourceType),
          eq(approvalWorkflows.organizationId, ctx.organizationId),
          eq(approvalWorkflows.active, true),
          eq(approvalWorkflows.isDefault, true)
        ),
      });

  const steps: ApprovalStepDef[] = (wf?.steps as unknown as ApprovalStepDef[]) || [];

  const [req] = await db
    .insert(approvalRequests)
    .values({
      approvalWorkflowId: wf?.id ?? null,
      organizationId: ctx.organizationId,
      userId: ctx.userId!,
      resourceType,
      resourceId: resourceId ?? null,
      title,
      status: steps.length > 0 ? "pending" : "approved",
      currentStep: 0,
      payload: payload ?? {},
    })
    .returning();

  for (const step of steps.sort((a, b) => a.order - b.order)) {
    await db.insert(approvalSteps).values({
      approvalRequestId: req.id,
      organizationId: ctx.organizationId,
      stepOrder: step.order,
      label: step.label ?? `Step ${step.order}`,
      approverRole: step.approverRole ?? null,
      approverUserId: step.approverUserId ?? null,
      status: "pending",
    });
  }

  await logAuditSafe(ctx, {
    action: "approval.request",
    category: "ai",
    resourceType: "approval_request",
    resourceId: req.id,
    description: `Approval requested: ${title}`,
    newValues: { resourceType, resourceId },
  });

  await emitTimelineEvent({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    eventType: "approval.requested",
    title: `Approval requested: ${title}`,
    description: resourceType,
    resourceType: "approval_request",
    resourceId: req.id,
  });

  if (steps.length > 0) {
    await notifyStepApprovers(ctx, req.id, steps[0]);
  }

  return req;
}

async function notifyStepApprovers(
  ctx: ServerContext,
  requestId: string,
  step: { label?: string | null; approverUserId?: string | null }
) {
  await createNotification({
    organizationId: ctx.organizationId,
    category: "ai",
    type: "approval_needed",
    title: "Approval required",
    message: `A ${step.label || "request"} needs your approval.`,
    priority: "high",
    deepLink: `/dashboard/approvals?request=${requestId}`,
    userId: step.approverUserId ?? null,
  });
}

function isEligible(
  ctx: ServerContext,
  step: { approverRole?: string | null; approverUserId?: string | null }
): boolean {
  if (step.approverUserId && step.approverUserId === ctx.userId) return true;
  if (step.approverRole === "any") return true;
  if (!step.approverRole) return true;
  return ctx.roleType === step.approverRole;
}

export async function decideApproval(
  ctx: ServerContext,
  requestId: string,
  decision: "approve" | "reject",
  comment?: string
): Promise<typeof approvalRequests.$inferSelect> {
  const req = await db.query.approvalRequests.findFirst({
    where: and(
      eq(approvalRequests.id, requestId),
      eq(approvalRequests.organizationId, ctx.organizationId)
    ),
    with: { steps: true },
  });
  if (!req) throw new Error("Approval request not found");
  if (req.status !== "pending") throw new Error(`Request is already ${req.status}`);

  const sorted = [...req.steps].sort((a, b) => a.stepOrder - b.stepOrder);
  const step = sorted[req.currentStep];
  if (!step) throw new Error("No pending step");

  if (!isEligible(ctx, step)) {
    throw new Error("You are not an eligible approver for this step");
  }

  await db
    .update(approvalSteps)
    .set({
      status: decision === "approve" ? "approved" : "rejected",
      decidedBy: ctx.userId!,
      decidedAt: new Date(),
      comment: comment ?? null,
    })
    .where(eq(approvalSteps.id, step.id));

  let nextStatus: (typeof approvalRequests.$inferSelect)["status"] = req.status;
  if (decision === "reject") {
    nextStatus = "rejected";
  } else if (req.currentStep + 1 >= sorted.length) {
    nextStatus = "approved";
  }

  const [updated] = await db
    .update(approvalRequests)
    .set({
      status: nextStatus,
      currentStep: decision === "approve" ? req.currentStep + 1 : req.currentStep,
      decidedBy: ctx.userId!,
      decidedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(approvalRequests.id, req.id))
    .returning();

  await logAuditSafe(ctx, {
    action: decision === "approve" ? "approval.approve" : "approval.reject",
    category: "ai",
    resourceType: "approval_request",
    resourceId: req.id,
    description: `${decision === "approve" ? "Approved" : "Rejected"}: ${req.title}`,
    newValues: { step: step.stepOrder, decision },
  });

  await emitTimelineEvent({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    eventType: decision === "approve" ? "approval.approved" : "approval.rejected",
    title: `${decision === "approve" ? "Approved" : "Rejected"}: ${req.title}`,
    description: step.label ?? `Step ${step.stepOrder}`,
    resourceType: "approval_request",
    resourceId: req.id,
  });

  if (nextStatus === "approved" || nextStatus === "rejected") {
    await createNotification({
      organizationId: ctx.organizationId,
      category: "ai",
      type: "approval_decided",
      title: `Approval ${nextStatus}`,
      message: `${req.title} was ${nextStatus}.`,
      priority: "normal",
      deepLink: `/dashboard/approvals?request=${req.id}`,
      userId: req.userId,
    });
  } else {
    await notifyStepApprovers(ctx, req.id, sorted[req.currentStep + 1]);
  }

  return updated;
}

/** List approval requests with their steps for a tenant. */
export async function listApprovalRequests(
  organizationId: string,
  opts: { status?: string; resourceType?: string } = {}
) {
  const conditions = [eq(approvalRequests.organizationId, organizationId)];
  if (opts.status) conditions.push(eq(approvalRequests.status, opts.status as any));
  if (opts.resourceType) conditions.push(eq(approvalRequests.resourceType, opts.resourceType));
  return db.query.approvalRequests.findMany({
    where: and(...conditions),
    with: { steps: { orderBy: (s: any) => [asc(s.stepOrder)] } },
    orderBy: (r: any) => [desc(r.createdAt)],
  });
}

/** Count of members in an organization with a given system role. */
export async function countApproversByRole(
  organizationId: string,
  role: string
): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.roleType, role as any),
        eq(organizationMembers.status, "active")
      )
    );
  return Number(rows[0]?.count ?? 0);
}
