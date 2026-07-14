import { NextResponse } from "next/server";
import { db } from "@/db";
import { branchPricing } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(_req, "enterprise.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const pricing = await db.query.branchPricing.findMany({
    where: and(
      eq(branchPricing.organizationId, ctx.organizationId),
      eq(branchPricing.branchId, id)
    ),
    orderBy: [desc(branchPricing.createdAt)],
  });

  return NextResponse.json(pricing);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "enterprise.branches.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  try {
    const body = await req.json();

    const [pricing] = await db
      .insert(branchPricing)
      .values({
        organizationId: ctx.organizationId,
        branchId: id,
        productId: body.productId,
        categoryId: body.categoryId,
        priceAdjustmentType: body.priceAdjustmentType || "percentage",
        priceAdjustmentValue: body.priceAdjustmentValue || "0",
        minPrice: body.minPrice,
        maxPrice: body.maxPrice,
        effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : undefined,
        effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : undefined,
        isActive: body.isActive ?? true,
      })
      .returning();

    await logAuditSafe(ctx, {
      action: "enterprise.branch_pricing.create",
      category: "enterprise",
      resourceType: "branch_pricing",
      resourceId: pricing.id,
      description: `Set pricing for branch ${id}`,
      newValues: { branchId: id, productId: body.productId, categoryId: body.categoryId },
    });

    return NextResponse.json(pricing, { status: 201 });
  } catch (error) {
    console.error("Set branch pricing error:", error);
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
  const res = await requireApiContext(_req, "enterprise.branches.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  try {
    const body = await _req.json();
    const pricingId = body.pricingId;

    if (!pricingId) {
      return NextResponse.json(
        { error: "pricingId is required in body" },
        { status: 400 }
      );
    }

    const deleted = await db
      .delete(branchPricing)
      .where(
        and(
          eq(branchPricing.id, pricingId),
          eq(branchPricing.branchId, id),
          eq(branchPricing.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!deleted.length) {
      return NextResponse.json({ error: "Pricing not found" }, { status: 404 });
    }

    await logAuditSafe(ctx, {
      action: "enterprise.branch_pricing.delete",
      category: "enterprise",
      resourceType: "branch_pricing",
      resourceId: pricingId,
      description: `Removed pricing for branch ${id}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove branch pricing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
