import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventorySuppliers } from "@/db/schema";
import { inventorySupplierSchema } from "@/lib/validations";
import { eq, asc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "inventory.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const suppliers = await db.query.inventorySuppliers.findMany({
    where: eq(inventorySuppliers.organizationId, ctx.organizationId),
    orderBy: (suppliers) => [asc(suppliers.name)],
  });

  return NextResponse.json(suppliers);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "inventory.products.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const parsed = inventorySupplierSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const [supplier] = await db
      .insert(inventorySuppliers)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        ...parsed.data,
      })
      .returning();

    await logAuditSafe(ctx, {
      action: "inventory_supplier.create",
      category: "inventory",
      resourceType: "inventory_supplier",
      resourceId: supplier.id,
      description: `Created inventory supplier ${supplier.name}`,
      newValues: { name: supplier.name },
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    console.error("Create supplier error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
