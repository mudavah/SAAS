import { NextResponse } from "next/server";
import { db } from "@/db";
import { interBranchSales } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "enterprise.sales.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  try {
    const [updated] = await db
      .update(interBranchSales)
      .set({
        status: "completed",
        completedAt: new Date(),
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
      action: "enterprise.sale.complete",
      category: "enterprise",
      resourceType: "inter_branch_sale",
      resourceId: updated.id,
      description: `Completed sale ${updated.saleNumber}`,
      newValues: { status: "completed" },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Complete sale error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
