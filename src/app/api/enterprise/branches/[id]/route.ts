import { NextResponse } from "next/server";
import { db } from "@/db";
import { enterpriseBranches } from "@/db/schema";
import { eq, and } from "drizzle-orm";
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

  const branch = await db.query.enterpriseBranches.findFirst({
    where: and(
      eq(enterpriseBranches.id, id),
      eq(enterpriseBranches.organizationId, ctx.organizationId)
    ),
  });

  if (!branch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  return NextResponse.json(branch);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "enterprise.branches.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  try {
    const body = await req.json();

    const [updated] = await db
      .update(enterpriseBranches)
      .set({
        name: body.name,
        code: body.code,
        address: body.address,
        city: body.city,
        country: body.country,
        phone: body.phone,
        email: body.email,
        managerId: body.managerId,
        timezone: body.timezone,
        currency: body.currency,
        taxId: body.taxId,
        settings: body.settings,
        isDefault: body.isDefault,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(enterpriseBranches.id, id),
          eq(enterpriseBranches.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    await logAuditSafe(ctx, {
      action: "enterprise.branch.update",
      category: "enterprise",
      resourceType: "enterprise_branch",
      resourceId: updated.id,
      description: `Updated branch ${updated.name}`,
      newValues: { name: updated.name, code: updated.code },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update branch error:", error);
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
    const deleted = await db
      .delete(enterpriseBranches)
      .where(
        and(
          eq(enterpriseBranches.id, id),
          eq(enterpriseBranches.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!deleted.length) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    await logAuditSafe(ctx, {
      action: "enterprise.branch.delete",
      category: "enterprise",
      resourceType: "enterprise_branch",
      resourceId: id,
      description: `Deleted branch ${deleted[0].name}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete branch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
