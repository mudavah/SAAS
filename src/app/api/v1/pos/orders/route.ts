import { NextResponse } from "next/server";
import { db } from "@/db";
import { posOrders } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { handleApi, type ServerContext } from "@/lib/session";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/logger";

export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function GET(req: Request) {
  return handleApi(req, "pos.sales.view", async (ctx: ServerContext) => {
    const rows = await db.query.posOrders.findMany({
      where: eq(posOrders.organizationId, ctx.organizationId),
      orderBy: (posOrders, { desc }) => [desc(posOrders.createdAt)],
      limit: 100,
    });
    return NextResponse.json({ data: rows }, { headers: getCorsHeaders(req) });
  });
}

export async function POST(req: Request) {
  return handleApi(req, "pos.sales.create", async (ctx: ServerContext) => {
    try {
      const body = await req.json();
      if (!body.orderNumber) {
        return NextResponse.json(
          { error: "orderNumber is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      const [item] = await db
        .insert(posOrders)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.userId!,
          sessionId: body.sessionId || null,
          clientId: body.clientId || null,
          warehouseId: body.warehouseId || null,
          orderNumber: body.orderNumber,
          status: body.status || "draft",
          currency: body.currency || "KES",
          subtotal: body.subtotal || "0",
          taxRate: body.taxRate || "16",
          taxAmount: body.taxAmount || "0",
          discount: body.discount || "0",
          total: body.total || "0",
          amountPaid: body.amountPaid || "0",
          changeDue: body.changeDue || "0",
          paymentMethod: body.paymentMethod || null,
          paymentStatus: body.paymentStatus || "pending",
          notes: body.notes || null,
        })
        .returning();
      return NextResponse.json(
        { data: item },
        { status: 201, headers: getCorsHeaders(req) }
      );
    } catch (error) {
      logger.error("API create pos order error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}

export async function DELETE(req: Request) {
  return handleApi(req, "pos.sales.create", async (ctx: ServerContext) => {
    try {
      const id = new URL(req.url).searchParams.get("id");
      if (!id) {
        return NextResponse.json(
          { error: "id is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      await db
        .delete(posOrders)
        .where(
          and(
            eq(posOrders.id, id),
            eq(posOrders.organizationId, ctx.organizationId)
          )
        );
      return NextResponse.json(
        { data: { id } },
        { headers: getCorsHeaders(req) }
      );
    } catch (error) {
      logger.error("API delete pos order error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}
