import { NextResponse } from "next/server";
import { db } from "@/db";
import { interBranchTransfers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "enterprise.transfers.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  try {
    const [updated] = await db
      .update(interBranchTransfers)
      .set({
        status: "received",
        receivedBy: ctx.userId,
        receivedAt: new Date(),
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
      action: "enterprise.transfer.receive",
      category: "enterprise",
      resourceType: "inter_branch_transfer",
      resourceId: updated.id,
      description: `Received transfer ${updated.transferNumber}`,
      newValues: { status: "received", receivedBy: ctx.userId },
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Receive transfer error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
