import { NextResponse } from "next/server";
import { db } from "@/db";
import { interBranchTransfers } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "enterprise.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const transfers = await db.query.interBranchTransfers.findMany({
    where: eq(interBranchTransfers.organizationId, ctx.organizationId),
    orderBy: [desc(interBranchTransfers.createdAt)],
  });

  return NextResponse.json(transfers);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "enterprise.transfers.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();

    if (!body.transferNumber || !body.fromBranchId || !body.toBranchId) {
      return NextResponse.json(
        { error: "transferNumber, fromBranchId, and toBranchId are required" },
        { status: 400 }
      );
    }

    const [transfer] = await db
      .insert(interBranchTransfers)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        transferNumber: body.transferNumber,
        fromBranchId: body.fromBranchId,
        toBranchId: body.toBranchId,
        status: body.status || "draft",
        notes: body.notes,
      })
      .returning();

    await logAuditSafe(ctx, {
      action: "enterprise.transfer.create",
      category: "enterprise",
      resourceType: "inter_branch_transfer",
      resourceId: transfer.id,
      description: `Created transfer ${transfer.transferNumber}`,
      newValues: { transferNumber: transfer.transferNumber, fromBranchId: body.fromBranchId, toBranchId: body.toBranchId },
    });

    return NextResponse.json(transfer, { status: 201 });
  } catch (error) {
    console.error("Create transfer error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
