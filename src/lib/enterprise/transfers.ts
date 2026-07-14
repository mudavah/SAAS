/**
 * KaziFlow — Enterprise Inter-Branch Transfers service
 * ------------------------------------------------------------------
 * Stock movements between branches. Numbers follow
 * TRANS-{ORG_CODE}-{YYYYMMDD}-{SEQ}. Lifecycle: draft → pending → in_transit →
 * received → completed (or cancelled). All queries scoped by organizationId.
 */
import { db } from "@/db";
import {
  enterpriseBranches,
  interBranchTransfers,
  interBranchTransferItems,
  type InterBranchTransfer,
  type InterBranchTransferItem,
  type TransferStatus,
} from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import type { ServerContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { emitTimelineEvent } from "@/lib/timeline";
import { EnterpriseError, requirePermission, notFound, generateNumber } from "./core";

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

async function getTransferOrThrow(
  ctx: ServerContext,
  transferId: string,
  forUpdate = false
): Promise<InterBranchTransfer> {
  const transfer = await db.query.interBranchTransfers.findFirst({
    where: and(
      eq(interBranchTransfers.id, transferId),
      eq(interBranchTransfers.organizationId, ctx.organizationId)
    ),
  });
  if (!transfer) notFound("Transfer not found");
  return transfer;
}

export interface TransferItemInput {
  productId: string;
  quantity: number | string;
  unitCost: number | string;
  receivedQuantity?: number | string;
  notes?: string | null;
}

export interface CreateTransferInput {
  fromBranchId: string;
  toBranchId: string;
  notes?: string | null;
  items: TransferItemInput[];
}

export async function createTransfer(
  ctx: ServerContext,
  data: CreateTransferInput
): Promise<InterBranchTransfer> {
  requirePermission(ctx, "enterprise.transfers.manage");
  if (!data.fromBranchId || !data.toBranchId) {
    throw new EnterpriseError("fromBranchId and toBranchId are required", 400);
  }
  if (data.fromBranchId === data.toBranchId) {
    throw new EnterpriseError("Source and destination branches must differ", 400);
  }
  if (!data.items?.length) {
    throw new EnterpriseError("At least one item is required", 400);
  }
  await assertBranchInOrg(ctx, data.fromBranchId);
  await assertBranchInOrg(ctx, data.toBranchId);

  const transferNumber = await generateNumber(
    "TRANS",
    interBranchTransfers,
    interBranchTransfers.createdAt,
    ctx.organizationId
  );

  const [transfer] = await db
    .insert(interBranchTransfers)
    .values({
      organizationId: ctx.organizationId,
      userId: ctx.userId!,
      transferNumber,
      fromBranchId: data.fromBranchId,
      toBranchId: data.toBranchId,
      status: "draft",
      notes: data.notes ?? null,
    })
    .returning();

  await db.insert(interBranchTransferItems).values(
    data.items.map((it) => ({
      organizationId: ctx.organizationId,
      transferId: transfer.id,
      productId: it.productId,
      quantity: String(it.quantity),
      unitCost: String(it.unitCost),
      receivedQuantity: String(it.receivedQuantity ?? 0),
      notes: it.notes ?? null,
    }))
  );

  await logAuditSafe(ctx, {
    action: "enterprise.transfer.create",
    category: "enterprise",
    resourceType: "inter_branch_transfer",
    resourceId: transfer.id,
    description: `Created transfer ${transfer.transferNumber}`,
    newValues: { fromBranchId: transfer.fromBranchId, toBranchId: transfer.toBranchId },
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "enterprise.transfer.created",
    title: `Transfer ${transfer.transferNumber} created`,
    resourceType: "inter_branch_transfer",
    resourceId: transfer.id,
  });

  return transfer;
}

export async function getTransfer(
  ctx: ServerContext,
  transferId: string
): Promise<InterBranchTransfer & { items: InterBranchTransferItem[] }> {
  requirePermission(ctx, "enterprise.view");
  const transfer = await getTransferOrThrow(ctx, transferId);
  const items = await db.query.interBranchTransferItems.findMany({
    where: and(
      eq(interBranchTransferItems.transferId, transferId),
      eq(interBranchTransferItems.organizationId, ctx.organizationId)
    ),
  });
  return { ...transfer, items };
}

export interface ListTransfersOptions {
  fromBranchId?: string;
  toBranchId?: string;
  status?: TransferStatus;
}

export async function listTransfers(
  ctx: ServerContext,
  opts: ListTransfersOptions = {}
): Promise<InterBranchTransfer[]> {
  requirePermission(ctx, "enterprise.view");
  const conditions = [
    eq(interBranchTransfers.organizationId, ctx.organizationId),
    opts.fromBranchId ? eq(interBranchTransfers.fromBranchId, opts.fromBranchId) : undefined,
    opts.toBranchId ? eq(interBranchTransfers.toBranchId, opts.toBranchId) : undefined,
    opts.status ? eq(interBranchTransfers.status, opts.status) : undefined,
  ].filter(Boolean) as ReturnType<typeof eq>[];

  return db.query.interBranchTransfers.findMany({
    where: and(...conditions),
    orderBy: [desc(interBranchTransfers.createdAt)],
  });
}

const ALLOWED_STATUS_TRANSITIONS: Record<TransferStatus, TransferStatus[]> = {
  draft: ["pending", "cancelled"],
  pending: ["in_transit", "cancelled"],
  in_transit: ["received", "cancelled"],
  received: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  rejected: [],
};

export async function updateTransferStatus(
  ctx: ServerContext,
  transferId: string,
  status: TransferStatus
): Promise<InterBranchTransfer> {
  requirePermission(ctx, "enterprise.transfers.manage");
  const transfer = await getTransferOrThrow(ctx, transferId);
  if (!ALLOWED_STATUS_TRANSITIONS[transfer.status].includes(status)) {
    throw new EnterpriseError(
      `Cannot move transfer from '${transfer.status}' to '${status}'`,
      400
    );
  }

  const [updated] = await db
    .update(interBranchTransfers)
    .set({ status, updatedAt: new Date() })
    .where(eq(interBranchTransfers.id, transferId))
    .returning();

  await logAuditSafe(ctx, {
    action: "enterprise.transfer.update_status",
    category: "enterprise",
    resourceType: "inter_branch_transfer",
    resourceId: transferId,
    description: `Transfer ${updated.transferNumber} → ${status}`,
    newValues: { status },
  });

  return updated;
}

export interface ReceiveTransferInput {
  items?: { itemId: string; receivedQuantity: number | string }[];
}

export async function receiveTransfer(
  ctx: ServerContext,
  transferId: string,
  data: ReceiveTransferInput = {}
): Promise<InterBranchTransfer> {
  requirePermission(ctx, "enterprise.transfers.manage");
  const transfer = await getTransferOrThrow(ctx, transferId);
  if (transfer.status !== "in_transit") {
    throw new EnterpriseError("Only in-transit transfers can be received", 400);
  }

  if (data.items?.length) {
    for (const item of data.items) {
      await db
        .update(interBranchTransferItems)
        .set({ receivedQuantity: String(item.receivedQuantity) })
        .where(
          and(
            eq(interBranchTransferItems.id, item.itemId),
            eq(interBranchTransferItems.transferId, transferId),
            eq(interBranchTransferItems.organizationId, ctx.organizationId)
          )
        );
    }
  } else {
    await db
      .update(interBranchTransferItems)
      .set({ receivedQuantity: sql`${interBranchTransferItems.quantity}` })
      .where(
        and(
          eq(interBranchTransferItems.transferId, transferId),
          eq(interBranchTransferItems.organizationId, ctx.organizationId)
        )
      );
  }

  const [updated] = await db
    .update(interBranchTransfers)
    .set({
      status: "received",
      receivedBy: ctx.userId,
      receivedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(interBranchTransfers.id, transferId))
    .returning();

  await logAuditSafe(ctx, {
    action: "enterprise.transfer.receive",
    category: "enterprise",
    resourceType: "inter_branch_transfer",
    resourceId: transferId,
    description: `Transfer ${updated.transferNumber} received`,
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "enterprise.transfer.received",
    title: `Transfer ${updated.transferNumber} received`,
    resourceType: "inter_branch_transfer",
    resourceId: transferId,
  });

  return updated;
}

export async function completeTransfer(
  ctx: ServerContext,
  transferId: string
): Promise<InterBranchTransfer> {
  requirePermission(ctx, "enterprise.transfers.manage");
  const transfer = await getTransferOrThrow(ctx, transferId);
  if (transfer.status !== "received") {
    throw new EnterpriseError("Only received transfers can be completed", 400);
  }

  const [updated] = await db
    .update(interBranchTransfers)
    .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
    .where(eq(interBranchTransfers.id, transferId))
    .returning();

  await logAuditSafe(ctx, {
    action: "enterprise.transfer.complete",
    category: "enterprise",
    resourceType: "inter_branch_transfer",
    resourceId: transferId,
    description: `Transfer ${updated.transferNumber} completed`,
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "enterprise.transfer.completed",
    title: `Transfer ${updated.transferNumber} completed`,
    resourceType: "inter_branch_transfer",
    resourceId: transferId,
  });

  return updated;
}

export async function cancelTransfer(
  ctx: ServerContext,
  transferId: string
): Promise<InterBranchTransfer> {
  requirePermission(ctx, "enterprise.transfers.manage");
  const transfer = await getTransferOrThrow(ctx, transferId);
  if (transfer.status === "completed") {
    throw new EnterpriseError("Completed transfers cannot be cancelled", 400);
  }

  const [updated] = await db
    .update(interBranchTransfers)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(interBranchTransfers.id, transferId))
    .returning();

  await logAuditSafe(ctx, {
    action: "enterprise.transfer.cancel",
    category: "enterprise",
    resourceType: "inter_branch_transfer",
    resourceId: transferId,
    description: `Transfer ${updated.transferNumber} cancelled`,
  });

  return updated;
}

export type { InterBranchTransferItem };
