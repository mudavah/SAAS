import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { inventoryWarehouses } from "@/db/schema";
import { inventoryWarehouseSchema } from "@/lib/validations";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const warehouses = await db.query.inventoryWarehouses.findMany({
    where: eq(inventoryWarehouses.userId, session.user.id),
    orderBy: (warehouses) => [asc(warehouses.name)],
  });

  return NextResponse.json(warehouses);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
        userId: session.user.id,
        ...parsed.data,
      })
      .returning();

    return NextResponse.json(warehouse, { status: 201 });
  } catch (error) {
    console.error("Create warehouse error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
