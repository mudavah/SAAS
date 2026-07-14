import { NextResponse } from "next/server";
import { db } from "@/db";
import { interBranchSales } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "enterprise.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const sales = await db.query.interBranchSales.findMany({
    where: eq(interBranchSales.organizationId, ctx.organizationId),
    orderBy: [desc(interBranchSales.createdAt)],
  });

  return NextResponse.json(sales);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "enterprise.sales.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();

    if (!body.saleNumber || !body.fromBranchId || !body.toBranchId) {
      return NextResponse.json(
        { error: "saleNumber, fromBranchId, and toBranchId are required" },
        { status: 400 }
      );
    }

    const [sale] = await db
      .insert(interBranchSales)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        saleNumber: body.saleNumber,
        fromBranchId: body.fromBranchId,
        toBranchId: body.toBranchId,
        status: body.status || "draft",
        currency: body.currency || "KES",
        subtotal: body.subtotal || "0",
        taxRate: body.taxRate || "16",
        taxAmount: body.taxAmount || "0",
        total: body.total || "0",
        notes: body.notes,
      })
      .returning();

    await logAuditSafe(ctx, {
      action: "enterprise.sale.create",
      category: "enterprise",
      resourceType: "inter_branch_sale",
      resourceId: sale.id,
      description: `Created sale ${sale.saleNumber}`,
      newValues: { saleNumber: sale.saleNumber, fromBranchId: body.fromBranchId, toBranchId: body.toBranchId },
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    console.error("Create sale error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
