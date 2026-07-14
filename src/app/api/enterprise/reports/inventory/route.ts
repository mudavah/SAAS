import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventoryStock } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "enterprise.reports.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const url = new URL(req.url);
  const warehouseId = url.searchParams.get("warehouseId");

  const conditions = [
    eq(inventoryStock.organizationId, ctx.organizationId),
    warehouseId ? eq(inventoryStock.warehouseId, warehouseId) : undefined,
  ].filter(Boolean) as ReturnType<typeof eq>[];

  const stock = await db.query.inventoryStock.findMany({
    where: conditions.length ? and(...conditions) : undefined,
  });

  const report = stock.map((s) => ({
    warehouseId: s.warehouseId,
    productId: s.productId,
    quantity: s.quantity,
    reservedQuantity: s.reservedQuantity,
    availableQuantity: Number(s.quantity) - Number(s.reservedQuantity),
    avgCost: s.avgCost,
  }));

  return NextResponse.json({ inventory: report });
}
