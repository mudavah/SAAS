import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventoryCategories } from "@/db/schema";
import { inventoryCategorySchema } from "@/lib/validations";
import { eq, asc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "inventory.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const categories = await db.query.inventoryCategories.findMany({
    where: eq(inventoryCategories.organizationId, ctx.organizationId),
    orderBy: (categories) => [asc(categories.name)],
  });

  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "inventory.products.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const parsed = inventoryCategorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const [category] = await db
      .insert(inventoryCategories)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        ...parsed.data,
      })
      .returning();

    await logAuditSafe(ctx, {
      action: "inventory_category.create",
      category: "inventory",
      resourceType: "inventory_category",
      resourceId: category.id,
      description: `Created inventory category ${category.name}`,
      newValues: { name: category.name },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Create category error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
