import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventoryStockAdjustments } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { handleApi, type ServerContext } from "@/lib/session";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/logger";

export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function POST(req: Request) {
  return handleApi(req, "inventory.stock.adjust", async (ctx: ServerContext) => {
    try {
      const body = await req.json();
      if (!body.productId || !body.warehouseId || !body.quantity || !body.reason) {
        return NextResponse.json(
          { error: "productId, warehouseId, quantity and reason are required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      const [item] = await db
        .insert(inventoryStockAdjustments)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.userId!,
          productId: body.productId,
          warehouseId: body.warehouseId,
          quantity: String(body.quantity),
          reason: body.reason,
        })
        .returning();
      return NextResponse.json(
        { data: item },
        { status: 201, headers: getCorsHeaders(req) }
      );
    } catch (error) {
      logger.error("API create stock adjustment error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}

export async function GET(req: Request) {
  return handleApi(req, "inventory.stock.adjust", async (ctx: ServerContext) => {
    const rows = await db.query.inventoryStockAdjustments.findMany({
      where: eq(inventoryStockAdjustments.organizationId, ctx.organizationId),
      orderBy: (inventoryStockAdjustments, { desc }) => [
        desc(inventoryStockAdjustments.createdAt),
      ],
      limit: 100,
    });
    return NextResponse.json({ data: rows }, { headers: getCorsHeaders(req) });
  });
}

export async function DELETE(req: Request) {
  return handleApi(req, "inventory.stock.adjust", async (ctx: ServerContext) => {
    try {
      const id = new URL(req.url).searchParams.get("id");
      if (!id) {
        return NextResponse.json(
          { error: "id is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      await db
        .delete(inventoryStockAdjustments)
        .where(
          and(
            eq(inventoryStockAdjustments.id, id),
            eq(inventoryStockAdjustments.organizationId, ctx.organizationId)
          )
        );
      return NextResponse.json(
        { data: { id } },
        { headers: getCorsHeaders(req) }
      );
    } catch (error) {
      logger.error("API delete stock adjustment error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}
