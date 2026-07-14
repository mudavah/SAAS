import { NextResponse } from "next/server";
import { db } from "@/db";
import { crmQuotations } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { handleApi, type ServerContext } from "@/lib/session";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";

export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function GET(req: Request) {
  return handleApi(req, "crm.quotations.manage", async (ctx: ServerContext) => {
    const rows = await db.query.crmQuotations.findMany({
      where: eq(crmQuotations.organizationId, ctx.organizationId),
      orderBy: (crmQuotations, { desc }) => [desc(crmQuotations.createdAt)],
      limit: 100,
    });
    return NextResponse.json({ data: rows }, { headers: getCorsHeaders(req) });
  });
}

export async function POST(req: Request) {
  return handleApi(req, "crm.quotations.manage", async (ctx: ServerContext) => {
    try {
      const body = await req.json();
      if (!body.quotationNumber) {
        return NextResponse.json(
          { error: "quotationNumber is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      const [item] = await db
        .insert(crmQuotations)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.userId!,
          quotationNumber: body.quotationNumber,
          companyId: body.companyId || null,
          contactId: body.contactId || null,
          leadId: body.leadId || null,
          dealId: body.dealId || null,
          status: body.status || "draft",
          version: body.version || 1,
          validUntil: body.validUntil ? new Date(body.validUntil) : null,
          currency: body.currency || "KES",
          subtotal: body.subtotal || "0",
          taxRate: body.taxRate || "16",
          taxAmount: body.taxAmount || "0",
          total: body.total || "0",
          notes: body.notes || null,
          terms: body.terms || null,
        })
        .returning();
      return NextResponse.json(
        { data: item },
        { status: 201, headers: getCorsHeaders(req) }
      );
    } catch (error) {
      console.error("API create quotation error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}

export async function DELETE(req: Request) {
  return handleApi(req, "crm.quotations.manage", async (ctx: ServerContext) => {
    try {
      const id = new URL(req.url).searchParams.get("id");
      if (!id) {
        return NextResponse.json(
          { error: "id is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      await db
        .delete(crmQuotations)
        .where(
          and(
            eq(crmQuotations.id, id),
            eq(crmQuotations.organizationId, ctx.organizationId)
          )
        );
      return NextResponse.json(
        { data: { id } },
        { headers: getCorsHeaders(req) }
      );
    } catch (error) {
      console.error("API delete quotation error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}
