import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventoryProducts } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { handleApi, type ServerContext } from "@/lib/session";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";

export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function GET(req: Request) {
  return handleApi(req, "inventory.products.manage", async (ctx: ServerContext) => {
    const rows = await db.query.inventoryProducts.findMany({
      where: eq(inventoryProducts.organizationId, ctx.organizationId),
      orderBy: (inventoryProducts, { desc }) => [desc(inventoryProducts.createdAt)],
      limit: 100,
    });
    return NextResponse.json({ data: rows }, { headers: getCorsHeaders(req) });
  });
}

export async function POST(req: Request) {
  return handleApi(req, "inventory.products.manage", async (ctx: ServerContext) => {
    try {
      const body = await req.json();
      if (!body.name || body.sellingPrice === undefined || body.sellingPrice === null) {
        return NextResponse.json(
          { error: "name and sellingPrice are required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      const [item] = await db
        .insert(inventoryProducts)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.userId!,
          categoryId: body.categoryId || null,
          brandId: body.brandId || null,
          name: body.name,
          sku: body.sku || null,
          barcode: body.barcode || null,
          description: body.description || null,
          costPrice: body.costPrice || "0",
          sellingPrice: String(body.sellingPrice),
          unit: body.unit || "pcs",
          minStockLevel: body.minStockLevel || 0,
          reorderPoint: body.reorderPoint || 0,
          isActive: body.isActive ?? true,
        })
        .returning();
      return NextResponse.json(
        { data: item },
        { status: 201, headers: getCorsHeaders(req) }
      );
    } catch (error) {
      console.error("API create product error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}

export async function DELETE(req: Request) {
  return handleApi(req, "inventory.products.manage", async (ctx: ServerContext) => {
    try {
      const id = new URL(req.url).searchParams.get("id");
      if (!id) {
        return NextResponse.json(
          { error: "id is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      await db
        .delete(inventoryProducts)
        .where(
          and(
            eq(inventoryProducts.id, id),
            eq(inventoryProducts.organizationId, ctx.organizationId)
          )
        );
      return NextResponse.json(
        { data: { id } },
        { headers: getCorsHeaders(req) }
      );
    } catch (error) {
      console.error("API delete product error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}
