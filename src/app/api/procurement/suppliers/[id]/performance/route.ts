import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventorySuppliers } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { getSupplierPerformance, getSupplierBalance } from "@/lib/procurement/metrics";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await requireApiContext(req, "purchasing.suppliers.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const supplier = await db.query.inventorySuppliers.findFirst({
    where: and(eq(inventorySuppliers.id, id), eq(inventorySuppliers.organizationId, ctx.organizationId)),
    columns: { id: true, name: true, rating: true },
  });
  if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

  const performance = await getSupplierPerformance(
    ctx.organizationId,
    supplier.id,
    supplier.name,
    supplier.rating
  );
  const balance = await getSupplierBalance(ctx.organizationId, supplier.id);
  return NextResponse.json({ ...performance, balance });
}
