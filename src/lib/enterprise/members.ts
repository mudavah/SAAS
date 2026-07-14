/**
 * KaziFlow — Enterprise Branch Members service
 * ------------------------------------------------------------------
 * Manages the users assigned to a branch and their per-branch roles/permissions.
 * All operations are scoped by organizationId + branchId.
 */
import { db } from "@/db";
import {
  enterpriseBranches,
  branchMembers,
  type BranchMember,
  type RoleType,
} from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import type { ServerContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { emitTimelineEvent } from "@/lib/timeline";
import { EnterpriseError, requirePermission, notFound } from "./core";

/** Ensure the branch exists and belongs to the caller's organization. */
async function assertBranch(ctx: ServerContext, branchId: string): Promise<void> {
  const branch = await db.query.enterpriseBranches.findFirst({
    where: and(
      eq(enterpriseBranches.id, branchId),
      eq(enterpriseBranches.organizationId, ctx.organizationId)
    ),
    columns: { id: true },
  });
  if (!branch) notFound("Branch not found");
}

export interface AddBranchMemberInput {
  userId: string;
  roleType?: RoleType;
  customRoleId?: string | null;
  permissions?: string[];
  isPrimary?: boolean;
}

export async function addBranchMember(
  ctx: ServerContext,
  branchId: string,
  data: AddBranchMemberInput
): Promise<BranchMember> {
  requirePermission(ctx, "enterprise.members.manage");
  if (!data.userId) throw new EnterpriseError("userId is required", 400);
  await assertBranch(ctx, branchId);

  const existing = await db.query.branchMembers.findFirst({
    where: and(
      eq(branchMembers.branchId, branchId),
      eq(branchMembers.userId, data.userId),
      eq(branchMembers.organizationId, ctx.organizationId)
    ),
    columns: { id: true },
  });
  if (existing) throw new EnterpriseError("User is already a member of this branch", 409);

  const [member] = await db
    .insert(branchMembers)
    .values({
      organizationId: ctx.organizationId,
      branchId,
      userId: data.userId,
      roleType: data.roleType ?? "employee",
      customRoleId: data.customRoleId ?? null,
      permissions: data.permissions ?? [],
      isPrimary: data.isPrimary ?? false,
    })
    .returning();

  await logAuditSafe(ctx, {
    action: "enterprise.branch_member.add",
    category: "enterprise",
    resourceType: "branch_member",
    resourceId: member.id,
    description: `Added user ${data.userId} to branch ${branchId}`,
    newValues: { branchId, roleType: member.roleType },
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "enterprise.branch_member.added",
    title: `Member added to branch`,
    description: `User ${data.userId}`,
    resourceType: "branch_member",
    resourceId: member.id,
  });

  return member;
}

export async function updateBranchMember(
  ctx: ServerContext,
  memberId: string,
  data: {
    roleType?: RoleType;
    customRoleId?: string | null;
    permissions?: string[];
    isPrimary?: boolean;
  }
): Promise<BranchMember> {
  requirePermission(ctx, "enterprise.members.manage");
  const member = await db.query.branchMembers.findFirst({
    where: and(
      eq(branchMembers.id, memberId),
      eq(branchMembers.organizationId, ctx.organizationId)
    ),
  });
  if (!member) notFound("Branch member not found");

  const [updated] = await db
    .update(branchMembers)
    .set({
      roleType: data.roleType ?? member.roleType,
      customRoleId: data.customRoleId !== undefined ? data.customRoleId : member.customRoleId,
      permissions: data.permissions ?? member.permissions,
      isPrimary: data.isPrimary ?? member.isPrimary,
    })
    .where(eq(branchMembers.id, memberId))
    .returning();

  await logAuditSafe(ctx, {
    action: "enterprise.branch_member.update",
    category: "enterprise",
    resourceType: "branch_member",
    resourceId: memberId,
    description: `Updated branch member ${memberId}`,
    newValues: { roleType: updated.roleType },
  });

  return updated;
}

export async function removeBranchMember(
  ctx: ServerContext,
  memberId: string
): Promise<{ id: string; removed: true }> {
  requirePermission(ctx, "enterprise.members.manage");
  const member = await db.query.branchMembers.findFirst({
    where: and(
      eq(branchMembers.id, memberId),
      eq(branchMembers.organizationId, ctx.organizationId)
    ),
  });
  if (!member) notFound("Branch member not found");

  await db
    .delete(branchMembers)
    .where(
      and(
        eq(branchMembers.id, memberId),
        eq(branchMembers.organizationId, ctx.organizationId)
      )
    );

  await logAuditSafe(ctx, {
    action: "enterprise.branch_member.remove",
    category: "enterprise",
    resourceType: "branch_member",
    resourceId: memberId,
    description: `Removed branch member ${memberId}`,
  });

  return { id: memberId, removed: true };
}

export async function listBranchMembers(
  ctx: ServerContext,
  branchId: string
): Promise<BranchMember[]> {
  requirePermission(ctx, "enterprise.view");
  await assertBranch(ctx, branchId);

  return db.query.branchMembers.findMany({
    where: and(
      eq(branchMembers.branchId, branchId),
      eq(branchMembers.organizationId, ctx.organizationId)
    ),
    orderBy: [desc(branchMembers.isPrimary), desc(branchMembers.createdAt)],
  });
}
