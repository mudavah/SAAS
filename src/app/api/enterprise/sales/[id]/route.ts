import { NextResponse } from "next/server";
import { db } from "@/db";
import { interBranchSales } from "@/db/schema";
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

  const sale = await db.query.interBranchSales.findFirst({
    where: and(
      eq(interBranchSales.id, id),
      eq(interBranchSales.organizationId, ctx.organizationId)
    ),
  });

  if (!sale) {
    return NextResponse.json({ error: "Sale not found" }, { status: 404 });
  }

  return NextResponse.json(sale);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "enterprise.sales.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  try {
    const body = await req.json();

    const [updated] = await db
      .update(interBranchSales)
      .set({
        saleNumber: body.saleNumber,
        fromBranchId: body.fromBranchId,
        toBranchId: body.toBranchId,
        status: body.status,
        currency: body.currency,
        subtotal: body.subtotal,
        taxRate: body.taxRate,
        taxAmount: body.taxAmount,
        total: body.total,
        notes: body.notes,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(interBranchSales.id, id),
          eq(interBranchSales.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    await logAuditSafe(ctx, {
      action: "enterprise.sale.update",
      category: "enterprise",
      resourceType: "inter_branch_sale",
      resourceId: updated.id,
      description: `Updated sale ${updated.saleNumber}`,
      newValues: { status: updated.status, total: updated.total },
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Update sale error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
