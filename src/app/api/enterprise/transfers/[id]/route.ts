import { NextResponse } from "next/server";
import { db } from "@/db";
import { interBranchTransfers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
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

  const transfer = await db.query.interBranchTransfers.findFirst({
    where: and(
      eq(interBranchTransfers.id, id),
      eq(interBranchTransfers.organizationId, ctx.organizationId)
    ),
  });

  if (!transfer) {
    return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
  }

  return NextResponse.json(transfer);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "enterprise.transfers.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  try {
    const body = await req.json();

    const [updated] = await db
      .update(interBranchTransfers)
      .set({
        status: body.status,
        notes: body.notes,
        approvedBy: body.approvedBy,
        approvedAt: body.approvedAt ? new Date(body.approvedAt) : undefined,
        receivedBy: body.receivedBy,
        receivedAt: body.receivedAt ? new Date(body.receivedAt) : undefined,
        completedAt: body.completedAt ? new Date(body.completedAt) : undefined,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(interBranchTransfers.id, id),
          eq(interBranchTransfers.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
    }

    await logAuditSafe(ctx, {
      action: "enterprise.transfer.update",
      category: "enterprise",
      resourceType: "inter_branch_transfer",
      resourceId: updated.id,
      description: `Updated transfer ${updated.transferNumber}`,
      newValues: { status: updated.status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Update transfer error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
