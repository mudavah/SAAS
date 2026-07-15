import { NextResponse } from "next/server";
import { db } from "@/db";
import { interBranchTransferItems } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(_req, "enterprise.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const items = await db.query.interBranchTransferItems.findMany({
    where: and(
      eq(interBranchTransferItems.organizationId, ctx.organizationId),
      eq(interBranchTransferItems.transferId, id)
    ),
    orderBy: [desc(interBranchTransferItems.createdAt)],
  });

  return NextResponse.json(items);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "enterprise.transfers.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  try {
    const body = await req.json();

    if (!body.productId || !body.quantity) {
      return NextResponse.json(
        { error: "productId and quantity are required" },
        { status: 400 }
      );
    }

    const [item] = await db
      .insert(interBranchTransferItems)
      .values({
        organizationId: ctx.organizationId,
        transferId: id,
        productId: body.productId,
        quantity: body.quantity,
        unitCost: body.unitCost || "0",
        receivedQuantity: body.receivedQuantity || "0",
        notes: body.notes,
      })
      .returning();

    await logAuditSafe(ctx, {
      action: "enterprise_transfer_item.create",
      category: "enterprise",
      resourceType: "inter_branch_transfer_item",
      resourceId: item.id,
      description: `Added item to transfer ${id}`,
      newValues: { transferId: id, productId: body.productId, quantity: body.quantity },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    logger.error("Add transfer item error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(_req, "enterprise.transfers.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  try {
    const body = await _req.json();
    const itemId = body.itemId;

    if (!itemId) {
      return NextResponse.json(
        { error: "itemId is required in body" },
        { status: 400 }
      );
    }

    const deleted = await db
      .delete(interBranchTransferItems)
      .where(
        and(
          eq(interBranchTransferItems.id, itemId),
          eq(interBranchTransferItems.transferId, id),
          eq(interBranchTransferItems.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!deleted.length) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    await logAuditSafe(ctx, {
      action: "enterprise_transfer_item.delete",
      category: "enterprise",
      resourceType: "inter_branch_transfer_item",
      resourceId: itemId,
      description: `Removed item from transfer ${id}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Remove transfer item error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
