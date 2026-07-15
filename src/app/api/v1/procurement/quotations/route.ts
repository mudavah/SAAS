import { NextResponse } from "next/server";
import { db } from "@/db";
import { procurementSupplierQuotations } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { handleApi, type ServerContext } from "@/lib/session";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/logger";

export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function GET(req: Request) {
  return handleApi(req, "purchasing.quotations.manage", async (ctx: ServerContext) => {
    const rows = await db.query.procurementSupplierQuotations.findMany({
      where: eq(procurementSupplierQuotations.organizationId, ctx.organizationId),
      orderBy: (procurementSupplierQuotations, { desc }) => [
        desc(procurementSupplierQuotations.createdAt),
      ],
      limit: 100,
    });
    return NextResponse.json({ data: rows }, { headers: getCorsHeaders(req) });
  });
}

export async function POST(req: Request) {
  return handleApi(req, "purchasing.quotations.manage", async (ctx: ServerContext) => {
    try {
      const body = await req.json();
      if (!body.supplierId || !body.quotationNumber || !body.receivedDate) {
        return NextResponse.json(
          { error: "supplierId, quotationNumber and receivedDate are required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      const [item] = await db
        .insert(procurementSupplierQuotations)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.userId!,
          rfqId: body.rfqId || null,
          supplierId: body.supplierId,
          quotationNumber: body.quotationNumber,
          status: body.status || "received",
          receivedDate: new Date(body.receivedDate),
          validUntil: body.validUntil ? new Date(body.validUntil) : null,
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
      logger.error("API create supplier quotation error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}

export async function DELETE(req: Request) {
  return handleApi(req, "purchasing.quotations.manage", async (ctx: ServerContext) => {
    try {
      const id = new URL(req.url).searchParams.get("id");
      if (!id) {
        return NextResponse.json(
          { error: "id is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      await db
        .delete(procurementSupplierQuotations)
        .where(
          and(
            eq(procurementSupplierQuotations.id, id),
            eq(procurementSupplierQuotations.organizationId, ctx.organizationId)
          )
        );
      return NextResponse.json(
        { data: { id } },
        { headers: getCorsHeaders(req) }
      );
    } catch (error) {
      logger.error("API delete supplier quotation error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}
