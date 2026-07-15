import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventorySuppliers } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { listSuppliersWithPerformance } from "@/lib/procurement/metrics";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "purchasing.suppliers.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const suppliers = await listSuppliersWithPerformance(ctx.organizationId);
  return NextResponse.json(suppliers);
}

const supplierCreateSchema = (body: any) => {
  if (!body?.name) return { error: "Supplier name is required" };
  return null;
};

export async function POST(req: Request) {
  const res = await requireApiContext(req, "purchasing.suppliers.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const err = supplierCreateSchema(body);
    if (err) return NextResponse.json(err, { status: 400 });

    const [supplier] = await db
      .insert(inventorySuppliers)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        name: body.name,
        contactName: body.contactName ?? null,
        email: body.email ?? null,
        phone: body.phone ?? null,
        website: body.website ?? null,
        address: body.address ?? null,
        city: body.city ?? null,
        country: body.country ?? "Kenya",
        taxId: body.taxId ?? null,
        category: body.category ?? null,
        notes: body.notes ?? null,
        paymentTerms: body.paymentTerms ?? null,
        leadTimeDays: body.leadTimeDays ?? null,
        preferredCurrency: body.preferredCurrency ?? "KES",
        bankName: body.bankName ?? null,
        bankAccount: body.bankAccount ?? null,
        rating: body.rating ?? null,
        isActive: true,
      })
      .returning();

    await logAuditSafe(ctx, {
      action: "procurement.supplier.create",
      category: "purchasing",
      resourceType: "inventory_supplier",
      resourceId: supplier.id,
      description: `Created supplier ${supplier.name}`,
    });
    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    logger.error("Create supplier error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
