import { NextResponse } from "next/server";
import { db } from "@/db";
import { procurementSupplierReturns } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { handleApi, type ServerContext } from "@/lib/session";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";

export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function GET(req: Request) {
  return handleApi(req, "purchasing.returns.manage", async (ctx: ServerContext) => {
    const rows = await db.query.procurementSupplierReturns.findMany({
      where: eq(procurementSupplierReturns.organizationId, ctx.organizationId),
      orderBy: (procurementSupplierReturns, { desc }) => [
        desc(procurementSupplierReturns.createdAt),
      ],
      limit: 100,
    });
    return NextResponse.json({ data: rows }, { headers: getCorsHeaders(req) });
  });
}

export async function POST(req: Request) {
  return handleApi(req, "purchasing.returns.manage", async (ctx: ServerContext) => {
    try {
      const body = await req.json();
      if (!body.returnNumber || !body.returnDate) {
        return NextResponse.json(
          { error: "returnNumber and returnDate are required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      const [item] = await db
        .insert(procurementSupplierReturns)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.userId!,
          returnNumber: body.returnNumber,
          grnId: body.grnId || null,
          purchaseOrderId: body.purchaseOrderId || null,
          supplierId: body.supplierId || null,
          returnDate: new Date(body.returnDate),
          status: body.status || "draft",
          reason: body.reason || null,
          total: body.total || "0",
          notes: body.notes || null,
        })
        .returning();
      return NextResponse.json(
        { data: item },
        { status: 201, headers: getCorsHeaders(req) }
      );
    } catch (error) {
      console.error("API create supplier return error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}

export async function DELETE(req: Request) {
  return handleApi(req, "purchasing.returns.manage", async (ctx: ServerContext) => {
    try {
      const id = new URL(req.url).searchParams.get("id");
      if (!id) {
        return NextResponse.json(
          { error: "id is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      await db
        .delete(procurementSupplierReturns)
        .where(
          and(
            eq(procurementSupplierReturns.id, id),
            eq(procurementSupplierReturns.organizationId, ctx.organizationId)
          )
        );
      return NextResponse.json(
        { data: { id } },
        { headers: getCorsHeaders(req) }
      );
    } catch (error) {
      console.error("API delete supplier return error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}
