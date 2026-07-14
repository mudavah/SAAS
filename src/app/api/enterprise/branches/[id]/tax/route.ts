import { NextResponse } from "next/server";
import { db } from "@/db";
import { branchTaxSettings } from "@/db/schema";
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

  const taxSettings = await db.query.branchTaxSettings.findMany({
    where: and(
      eq(branchTaxSettings.organizationId, ctx.organizationId),
      eq(branchTaxSettings.branchId, id)
    ),
    orderBy: [desc(branchTaxSettings.createdAt)],
  });

  return NextResponse.json(taxSettings);
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

    if (!body.taxName || !body.taxType || body.rate === undefined) {
      return NextResponse.json(
        { error: "taxName, taxType, and rate are required" },
        { status: 400 }
      );
    }

    const [taxSetting] = await db
      .insert(branchTaxSettings)
      .values({
        organizationId: ctx.organizationId,
        branchId: id,
        taxName: body.taxName,
        taxType: body.taxType,
        rate: body.rate,
        isCompound: body.isCompound || false,
        appliesTo: body.appliesTo || "all",
        effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : undefined,
        effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : undefined,
        isActive: body.isActive ?? true,
      })
      .returning();

    await logAuditSafe(ctx, {
      action: "enterprise.branch_tax.create",
      category: "enterprise",
      resourceType: "branch_tax_setting",
      resourceId: taxSetting.id,
      description: `Set tax ${taxSetting.taxName} for branch ${id}`,
      newValues: { branchId: id, taxName: taxSetting.taxName, rate: taxSetting.rate },
    });

    return NextResponse.json(taxSetting, { status: 201 });
  } catch (error) {
    console.error("Set branch tax error:", error);
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
    const taxId = body.taxId;

    if (!taxId) {
      return NextResponse.json(
        { error: "taxId is required in body" },
        { status: 400 }
      );
    }

    const deleted = await db
      .delete(branchTaxSettings)
      .where(
        and(
          eq(branchTaxSettings.id, taxId),
          eq(branchTaxSettings.branchId, id),
          eq(branchTaxSettings.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!deleted.length) {
      return NextResponse.json({ error: "Tax setting not found" }, { status: 404 });
    }

    await logAuditSafe(ctx, {
      action: "enterprise.branch_tax.delete",
      category: "enterprise",
      resourceType: "branch_tax_setting",
      resourceId: taxId,
      description: `Removed tax setting for branch ${id}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove branch tax error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
