import { NextResponse } from "next/server";
import { db } from "@/db";
import { procurementSupplierPayments } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { handleApi, type ServerContext } from "@/lib/session";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/logger";

export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function GET(req: Request) {
  return handleApi(req, "purchasing.payments.manage", async (ctx: ServerContext) => {
    const rows = await db.query.procurementSupplierPayments.findMany({
      where: eq(procurementSupplierPayments.organizationId, ctx.organizationId),
      orderBy: (procurementSupplierPayments, { desc }) => [
        desc(procurementSupplierPayments.createdAt),
      ],
      limit: 100,
    });
    return NextResponse.json({ data: rows }, { headers: getCorsHeaders(req) });
  });
}

export async function POST(req: Request) {
  return handleApi(req, "purchasing.payments.manage", async (ctx: ServerContext) => {
    try {
      const body = await req.json();
      if (
        !body.paymentNumber ||
        !body.supplierId ||
        body.amount === undefined ||
        !body.method ||
        !body.paymentDate
      ) {
        return NextResponse.json(
          { error: "paymentNumber, supplierId, amount, method and paymentDate are required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      const [item] = await db
        .insert(procurementSupplierPayments)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.userId!,
          paymentNumber: body.paymentNumber,
          supplierId: body.supplierId,
          purchaseInvoiceId: body.purchaseInvoiceId || null,
          amount: String(body.amount),
          currency: body.currency || "KES",
          method: body.method,
          status: body.status || "pending",
          paymentDate: new Date(body.paymentDate),
          reference: body.reference || null,
          notes: body.notes || null,
        })
        .returning();
      return NextResponse.json(
        { data: item },
        { status: 201, headers: getCorsHeaders(req) }
      );
    } catch (error) {
      logger.error("API create supplier payment error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}

export async function DELETE(req: Request) {
  return handleApi(req, "purchasing.payments.manage", async (ctx: ServerContext) => {
    try {
      const id = new URL(req.url).searchParams.get("id");
      if (!id) {
        return NextResponse.json(
          { error: "id is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      await db
        .delete(procurementSupplierPayments)
        .where(
          and(
            eq(procurementSupplierPayments.id, id),
            eq(procurementSupplierPayments.organizationId, ctx.organizationId)
          )
        );
      return NextResponse.json(
        { data: { id } },
        { headers: getCorsHeaders(req) }
      );
    } catch (error) {
      logger.error("API delete supplier payment error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}
