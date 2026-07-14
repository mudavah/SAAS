/**
 * KaziFlow — Enterprise Branch Approval Workflows & Requests
 * ------------------------------------------------------------------
 * Configurable approval workflows per branch plus the requests that flow
 * through them. Scoped by organizationId; requests are additionally scoped by
 * branchId. Approving/rejecting requires `enterprise.approvals.approve`.
 */
import { db } from "@/db";
import {
  enterpriseBranches,
  branchApprovalWorkflows,
  branchApprovalRequests,
  type BranchApprovalWorkflow,
  type BranchApprovalRequest,
  approvalStatusEnum,
} from "@/db/schema";

export type ApprovalStatus = (typeof approvalStatusEnum.enumValues)[number];
import { and, desc, eq } from "drizzle-orm";
import type { ServerContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { emitTimelineEvent } from "@/lib/timeline";
import { EnterpriseError, requirePermission, notFound } from "./core";

async function assertBranchInOrg(ctx: ServerContext, branchId: string): Promise<void> {
  const branch = await db.query.enterpriseBranches.findFirst({
    where: and(
      eq(enterpriseBranches.id, branchId),
      eq(enterpriseBranches.organizationId, ctx.organizationId)
    ),
    columns: { id: true },
  });
  if (!branch) notFound("Branch not found");
}

export interface CreateApprovalWorkflowInput {
  branchId: string;
  name: string;
  description?: string | null;
  resourceType: string;
  steps?: Record<string, unknown>[];
  isDefault?: boolean;
  active?: boolean;
}

export async function createApprovalWorkflow(
  ctx: ServerContext,
  data: CreateApprovalWorkflowInput
): Promise<BranchApprovalWorkflow> {
  requirePermission(ctx, "enterprise.approvals.manage");
  if (!data.name || !data.resourceType) {
    throw new EnterpriseError("name and resourceType are required", 400);
  }
  await assertBranchInOrg(ctx, data.branchId);

  const [workflow] = await db
    .insert(branchApprovalWorkflows)
    .values({
      organizationId: ctx.organizationId,
      userId: ctx.userId!,
      branchId: data.branchId,
      name: data.name,
      description: data.description ?? null,
      resourceType: data.resourceType,
      steps: data.steps ?? [],
      isDefault: data.isDefault ?? false,
      active: data.active ?? true,
    })
    .returning();

  await logAuditSafe(ctx, {
    action: "enterprise.approval_workflow.create",
    category: "enterprise",
    resourceType: "branch_approval_workflow",
    resourceId: workflow.id,
    description: `Created approval workflow ${workflow.name}`,
    newValues: { branchId: workflow.branchId, resourceType: workflow.resourceType },
  });

  return workflow;
}

export async function getApprovalWorkflow(
  ctx: ServerContext,
  workflowId: string
): Promise<BranchApprovalWorkflow> {
  requirePermission(ctx, "enterprise.view");
  const row = await db.query.branchApprovalWorkflows.findFirst({
    where: and(
      eq(branchApprovalWorkflows.id, workflowId),
      eq(branchApprovalWorkflows.organizationId, ctx.organizationId)
    ),
  });
  if (!row) notFound("Approval workflow not found");
  return row;
}

export interface ListApprovalWorkflowsOptions {
  branchId?: string;
  resourceType?: string;
  activeOnly?: boolean;
}

export async function listApprovalWorkflows(
  ctx: ServerContext,
  opts: ListApprovalWorkflowsOptions = {}
): Promise<BranchApprovalWorkflow[]> {
  requirePermission(ctx, "enterprise.view");
  const conditions = [
    eq(branchApprovalWorkflows.organizationId, ctx.organizationId),
    opts.branchId ? eq(branchApprovalWorkflows.branchId, opts.branchId) : undefined,
    opts.resourceType
      ? eq(branchApprovalWorkflows.resourceType, opts.resourceType)
      : undefined,
    opts.activeOnly ? eq(branchApprovalWorkflows.active, true) : undefined,
  ].filter(Boolean) as ReturnType<typeof eq>[];

  return db.query.branchApprovalWorkflows.findMany({
    where: and(...conditions),
    orderBy: [desc(branchApprovalWorkflows.isDefault), desc(branchApprovalWorkflows.createdAt)],
  });
}

export interface UpdateApprovalWorkflowInput {
  name?: string;
  description?: string | null;
  resourceType?: string;
  steps?: Record<string, unknown>[];
  isDefault?: boolean;
  active?: boolean;
}

export async function updateApprovalWorkflow(
  ctx: ServerContext,
  workflowId: string,
  data: UpdateApprovalWorkflowInput
): Promise<BranchApprovalWorkflow> {
  requirePermission(ctx, "enterprise.approvals.manage");
  const workflow = await db.query.branchApprovalWorkflows.findFirst({
    where: and(
      eq(branchApprovalWorkflows.id, workflowId),
      eq(branchApprovalWorkflows.organizationId, ctx.organizationId)
    ),
  });
  if (!workflow) notFound("Approval workflow not found");

  const [updated] = await db
    .update(branchApprovalWorkflows)
    .set({
      name: data.name ?? workflow.name,
      description: data.description !== undefined ? data.description : workflow.description,
      resourceType: data.resourceType ?? workflow.resourceType,
      steps: data.steps ?? workflow.steps,
      isDefault: data.isDefault ?? workflow.isDefault,
      active: data.active ?? workflow.active,
      updatedAt: new Date(),
    })
    .where(eq(branchApprovalWorkflows.id, workflowId))
    .returning();

  await logAuditSafe(ctx, {
    action: "enterprise.approval_workflow.update",
    category: "enterprise",
    resourceType: "branch_approval_workflow",
    resourceId: workflowId,
    description: `Updated approval workflow ${updated.name}`,
  });

  return updated;
}

export interface CreateApprovalRequestInput {
  branchId: string;
  workflowId?: string | null;
  resourceType: string;
  resourceId?: string | null;
  title: string;
  payload?: Record<string, unknown>;
}

export async function createApprovalRequest(
  ctx: ServerContext,
  data: CreateApprovalRequestInput
): Promise<BranchApprovalRequest> {
  requirePermission(ctx, "enterprise.approvals.manage");
  if (!data.title || !data.resourceType) {
    throw new EnterpriseError("title and resourceType are required", 400);
  }
  await assertBranchInOrg(ctx, data.branchId);

  const [request] = await db
    .insert(branchApprovalRequests)
    .values({
      organizationId: ctx.organizationId,
      branchId: data.branchId,
      workflowId: data.workflowId ?? null,
      resourceType: data.resourceType,
      resourceId: data.resourceId ?? null,
      title: data.title,
      status: "pending",
      currentStep: 0,
      payload: data.payload ?? {},
    })
    .returning();

  await logAuditSafe(ctx, {
    action: "enterprise.approval_request.create",
    category: "enterprise",
    resourceType: "branch_approval_request",
    resourceId: request.id,
    description: `Created approval request ${request.title}`,
    newValues: { branchId: request.branchId, resourceType: request.resourceType },
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "enterprise.approval_request.created",
    title: `Approval request: ${request.title}`,
    resourceType: "branch_approval_request",
    resourceId: request.id,
  });

  return request;
}

export async function approveApprovalRequest(
  ctx: ServerContext,
  requestId: string,
  comments?: string
): Promise<BranchApprovalRequest> {
  requirePermission(ctx, "enterprise.approvals.approve");
  const request = await db.query.branchApprovalRequests.findFirst({
    where: and(
      eq(branchApprovalRequests.id, requestId),
      eq(branchApprovalRequests.organizationId, ctx.organizationId)
    ),
  });
  if (!request) notFound("Approval request not found");
  if (request.status !== "pending") {
    throw new EnterpriseError("Request is not pending approval", 400);
  }

  const [updated] = await db
    .update(branchApprovalRequests)
    .set({
      status: "approved" as ApprovalStatus,
      currentStep: request.currentStep + 1,
      decidedBy: ctx.userId,
      decidedAt: new Date(),
      payload: {
        ...request.payload,
        decision: "approved",
        comments: comments ?? null,
      },
      updatedAt: new Date(),
    })
    .where(eq(branchApprovalRequests.id, requestId))
    .returning();

  await logAuditSafe(ctx, {
    action: "enterprise.approval_request.approve",
    category: "enterprise",
    resourceType: "branch_approval_request",
    resourceId: requestId,
    description: `Approved request ${request.title}`,
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "enterprise.approval_request.approved",
    title: `Approval request approved: ${request.title}`,
    resourceType: "branch_approval_request",
    resourceId: requestId,
  });

  return updated;
}

export async function rejectApprovalRequest(
  ctx: ServerContext,
  requestId: string,
  comments?: string
): Promise<BranchApprovalRequest> {
  requirePermission(ctx, "enterprise.approvals.approve");
  const request = await db.query.branchApprovalRequests.findFirst({
    where: and(
      eq(branchApprovalRequests.id, requestId),
      eq(branchApprovalRequests.organizationId, ctx.organizationId)
    ),
  });
  if (!request) notFound("Approval request not found");
  if (request.status !== "pending") {
    throw new EnterpriseError("Request is not pending approval", 400);
  }

  const [updated] = await db
    .update(branchApprovalRequests)
    .set({
      status: "rejected" as ApprovalStatus,
      decidedBy: ctx.userId,
      decidedAt: new Date(),
      payload: {
        ...request.payload,
        decision: "rejected",
        comments: comments ?? null,
      },
      updatedAt: new Date(),
    })
    .where(eq(branchApprovalRequests.id, requestId))
    .returning();

  await logAuditSafe(ctx, {
    action: "enterprise.approval_request.reject",
    category: "enterprise",
    resourceType: "branch_approval_request",
    resourceId: requestId,
    description: `Rejected request ${request.title}`,
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "enterprise.approval_request.rejected",
    title: `Approval request rejected: ${request.title}`,
    resourceType: "branch_approval_request",
    resourceId: requestId,
  });

  return updated;
}

export interface ListApprovalRequestsOptions {
  branchId?: string;
  resourceType?: string;
  status?: ApprovalStatus;
}

export async function listApprovalRequests(
  ctx: ServerContext,
  opts: ListApprovalRequestsOptions = {}
): Promise<BranchApprovalRequest[]> {
  requirePermission(ctx, "enterprise.view");
  const conditions = [
    eq(branchApprovalRequests.organizationId, ctx.organizationId),
    opts.branchId ? eq(branchApprovalRequests.branchId, opts.branchId) : undefined,
    opts.resourceType
      ? eq(branchApprovalRequests.resourceType, opts.resourceType)
      : undefined,
    opts.status ? eq(branchApprovalRequests.status, opts.status) : undefined,
  ].filter(Boolean) as ReturnType<typeof eq>[];

  return db.query.branchApprovalRequests.findMany({
    where: and(...conditions),
    orderBy: [desc(branchApprovalRequests.createdAt)],
  });
}
