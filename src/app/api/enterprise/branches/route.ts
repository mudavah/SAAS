import { NextResponse } from "next/server";
import { db } from "@/db";
import { enterpriseBranches } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "enterprise.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const branches = await db.query.enterpriseBranches.findMany({
    where: eq(enterpriseBranches.organizationId, ctx.organizationId),
    orderBy: [desc(enterpriseBranches.isDefault), desc(enterpriseBranches.createdAt)],
  });

  return NextResponse.json(branches);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "enterprise.branches.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();

    if (!body.name || !body.code) {
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 }
      );
    }

    const [branch] = await db
      .insert(enterpriseBranches)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
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
        settings: body.settings || {},
        isDefault: body.isDefault || false,
      })
      .returning();

    await logAuditSafe(ctx, {
      action: "enterprise.branch.create",
      category: "enterprise",
      resourceType: "enterprise_branch",
      resourceId: branch.id,
      description: `Created branch ${branch.name} (${branch.code})`,
      newValues: { name: branch.name, code: branch.code },
    });

    return NextResponse.json(branch, { status: 201 });
  } catch (error) {
    logger.error("Create branch error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
