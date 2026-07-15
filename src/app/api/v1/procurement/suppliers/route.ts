import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventorySuppliers } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { handleApi, type ServerContext } from "@/lib/session";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/logger";

export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function GET(req: Request) {
  return handleApi(req, "purchasing.suppliers.manage", async (ctx: ServerContext) => {
    const rows = await db.query.inventorySuppliers.findMany({
      where: eq(inventorySuppliers.organizationId, ctx.organizationId),
      orderBy: (inventorySuppliers, { desc }) => [desc(inventorySuppliers.createdAt)],
      limit: 100,
    });
    return NextResponse.json({ data: rows }, { headers: getCorsHeaders(req) });
  });
}

export async function POST(req: Request) {
  return handleApi(req, "purchasing.suppliers.manage", async (ctx: ServerContext) => {
    try {
      const body = await req.json();
      if (!body.name) {
        return NextResponse.json(
          { error: "name is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      const [item] = await db
        .insert(inventorySuppliers)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.userId!,
          name: body.name,
          contactName: body.contactName || null,
          email: body.email || null,
          phone: body.phone || null,
          website: body.website || null,
          address: body.address || null,
          city: body.city || null,
          country: body.country || "Kenya",
          taxId: body.taxId || null,
          category: body.category || null,
          notes: body.notes || null,
          paymentTerms: body.paymentTerms || null,
          leadTimeDays: body.leadTimeDays || null,
          preferredCurrency: body.preferredCurrency || "KES",
          rating: body.rating || null,
          isActive: body.isActive ?? true,
        })
        .returning();
      return NextResponse.json(
        { data: item },
        { status: 201, headers: getCorsHeaders(req) }
      );
    } catch (error) {
      logger.error("API create procurement supplier error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}

export async function DELETE(req: Request) {
  return handleApi(req, "purchasing.suppliers.manage", async (ctx: ServerContext) => {
    try {
      const id = new URL(req.url).searchParams.get("id");
      if (!id) {
        return NextResponse.json(
          { error: "id is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      await db
        .delete(inventorySuppliers)
        .where(
          and(
            eq(inventorySuppliers.id, id),
            eq(inventorySuppliers.organizationId, ctx.organizationId)
          )
        );
      return NextResponse.json(
        { data: { id } },
        { headers: getCorsHeaders(req) }
      );
    } catch (error) {
      logger.error("API delete procurement supplier error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}
