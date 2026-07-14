import { NextResponse } from "next/server";
import { db } from "@/db";
import { procurementPurchaseInvoices } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { handleApi, type ServerContext } from "@/lib/session";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";

export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function GET(req: Request) {
  return handleApi(req, "purchasing.invoices.manage", async (ctx: ServerContext) => {
    const rows = await db.query.procurementPurchaseInvoices.findMany({
      where: eq(procurementPurchaseInvoices.organizationId, ctx.organizationId),
      orderBy: (procurementPurchaseInvoices, { desc }) => [
        desc(procurementPurchaseInvoices.createdAt),
      ],
      limit: 100,
    });
    return NextResponse.json({ data: rows }, { headers: getCorsHeaders(req) });
  });
}

export async function POST(req: Request) {
  return handleApi(req, "purchasing.invoices.manage", async (ctx: ServerContext) => {
    try {
      const body = await req.json();
      if (
        !body.invoiceNumber ||
        !body.supplierId ||
        !body.issueDate ||
        !body.dueDate
      ) {
        return NextResponse.json(
          { error: "invoiceNumber, supplierId, issueDate and dueDate are required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      const [item] = await db
        .insert(procurementPurchaseInvoices)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.userId!,
          invoiceNumber: body.invoiceNumber,
          supplierId: body.supplierId,
          purchaseOrderId: body.purchaseOrderId || null,
          grnId: body.grnId || null,
          issueDate: new Date(body.issueDate),
          dueDate: new Date(body.dueDate),
          currency: body.currency || "KES",
          subtotal: body.subtotal || "0",
          taxRate: body.taxRate || "16",
          taxAmount: body.taxAmount || "0",
          total: body.total || "0",
          amountPaid: body.amountPaid || "0",
          status: body.status || "received",
          notes: body.notes || null,
        })
        .returning();
      return NextResponse.json(
        { data: item },
        { status: 201, headers: getCorsHeaders(req) }
      );
    } catch (error) {
      console.error("API create purchase invoice error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}

export async function DELETE(req: Request) {
  return handleApi(req, "purchasing.invoices.manage", async (ctx: ServerContext) => {
    try {
      const id = new URL(req.url).searchParams.get("id");
      if (!id) {
        return NextResponse.json(
          { error: "id is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      await db
        .delete(procurementPurchaseInvoices)
        .where(
          and(
            eq(procurementPurchaseInvoices.id, id),
            eq(procurementPurchaseInvoices.organizationId, ctx.organizationId)
          )
        );
      return NextResponse.json(
        { data: { id } },
        { headers: getCorsHeaders(req) }
      );
    } catch (error) {
      console.error("API delete purchase invoice error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}
