import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventoryBrands } from "@/db/schema";
import { inventoryBrandSchema } from "@/lib/validations";
import { eq, asc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "inventory.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const brands = await db.query.inventoryBrands.findMany({
    where: eq(inventoryBrands.organizationId, ctx.organizationId),
    orderBy: (brands) => [asc(brands.name)],
  });

  return NextResponse.json(brands);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "inventory.products.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const parsed = inventoryBrandSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const [brand] = await db
      .insert(inventoryBrands)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        ...parsed.data,
      })
      .returning();

    await logAuditSafe(ctx, {
      action: "inventory_brand.create",
      category: "inventory",
      resourceType: "inventory_brand",
      resourceId: brand.id,
      description: `Created inventory brand ${brand.name}`,
      newValues: { name: brand.name },
    });

    return NextResponse.json(brand, { status: 201 });
  } catch (error) {
    logger.error("Create brand error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
