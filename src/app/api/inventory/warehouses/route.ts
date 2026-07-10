import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventoryWarehouses } from "@/db/schema";
import { inventoryWarehouseSchema } from "@/lib/validations";
import { eq, asc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "inventory.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const warehouses = await db.query.inventoryWarehouses.findMany({
    where: eq(inventoryWarehouses.organizationId, ctx.organizationId),
    orderBy: (warehouses) => [asc(warehouses.name)],
  });

  return NextResponse.json(warehouses);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "inventory.warehouses.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const parsed = inventoryWarehouseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const [warehouse] = await db
      .insert(inventoryWarehouses)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        ...parsed.data,
      })
      .returning();

    await logAuditSafe(ctx, {
      action: "inventory_warehouse.create",
      category: "inventory",
      resourceType: "inventory_warehouse",
      resourceId: warehouse.id,
      description: `Created inventory warehouse ${warehouse.name}`,
      newValues: { name: warehouse.name },
    });

    return NextResponse.json(warehouse, { status: 201 });
  } catch (error) {
    console.error("Create warehouse error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
