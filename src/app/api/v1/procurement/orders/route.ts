import { NextResponse } from "next/server";
import { db } from "@/db";
import { procurementPurchaseOrders } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { handleApi, type ServerContext } from "@/lib/session";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";

export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function GET(req: Request) {
  return handleApi(req, "purchasing.po.manage", async (ctx: ServerContext) => {
    const rows = await db.query.procurementPurchaseOrders.findMany({
      where: eq(procurementPurchaseOrders.organizationId, ctx.organizationId),
      orderBy: (procurementPurchaseOrders, { desc }) => [
        desc(procurementPurchaseOrders.createdAt),
      ],
      limit: 100,
    });
    return NextResponse.json({ data: rows }, { headers: getCorsHeaders(req) });
  });
}

export async function POST(req: Request) {
  return handleApi(req, "purchasing.po.manage", async (ctx: ServerContext) => {
    try {
      const body = await req.json();
      if (!body.poNumber || !body.orderDate) {
        return NextResponse.json(
          { error: "poNumber and orderDate are required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      const [item] = await db
        .insert(procurementPurchaseOrders)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.userId!,
          poNumber: body.poNumber,
          requestId: body.requestId || null,
          rfqId: body.rfqId || null,
          supplierId: body.supplierId || null,
          status: body.status || "draft",
          orderDate: new Date(body.orderDate),
          expectedDate: body.expectedDate ? new Date(body.expectedDate) : null,
          currency: body.currency || "KES",
          subtotal: body.subtotal || "0",
          taxRate: body.taxRate || "16",
          taxAmount: body.taxAmount || "0",
          total: body.total || "0",
          notes: body.notes || null,
        })
        .returning();
      return NextResponse.json(
        { data: item },
        { status: 201, headers: getCorsHeaders(req) }
      );
    } catch (error) {
      console.error("API create purchase order error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}

export async function DELETE(req: Request) {
  return handleApi(req, "purchasing.po.manage", async (ctx: ServerContext) => {
    try {
      const id = new URL(req.url).searchParams.get("id");
      if (!id) {
        return NextResponse.json(
          { error: "id is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      await db
        .delete(procurementPurchaseOrders)
        .where(
          and(
            eq(procurementPurchaseOrders.id, id),
            eq(procurementPurchaseOrders.organizationId, ctx.organizationId)
          )
        );
      return NextResponse.json(
        { data: { id } },
        { headers: getCorsHeaders(req) }
      );
    } catch (error) {
      console.error("API delete purchase order error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}
