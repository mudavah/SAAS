import { NextResponse } from "next/server";
import { db } from "@/db";
import { crmDeals } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { handleApi, type ServerContext } from "@/lib/session";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";

export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function GET(req: Request) {
  return handleApi(req, "crm.deals.manage", async (ctx: ServerContext) => {
    const rows = await db.query.crmDeals.findMany({
      where: eq(crmDeals.organizationId, ctx.organizationId),
      orderBy: (crmDeals, { desc }) => [desc(crmDeals.createdAt)],
      limit: 100,
    });
    return NextResponse.json({ data: rows }, { headers: getCorsHeaders(req) });
  });
}

export async function POST(req: Request) {
  return handleApi(req, "crm.deals.manage", async (ctx: ServerContext) => {
    try {
      const body = await req.json();
      if (!body.name) {
        return NextResponse.json(
          { error: "name is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      const [item] = await db
        .insert(crmDeals)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.userId!,
          name: body.name,
          companyId: body.companyId || null,
          contactId: body.contactId || null,
          leadId: body.leadId || null,
          stageId: body.stageId || null,
          amount: body.amount || "0",
          currency: body.currency || "KES",
          status: body.status || "open",
          notes: body.notes || null,
        })
        .returning();
      return NextResponse.json(
        { data: item },
        { status: 201, headers: getCorsHeaders(req) }
      );
    } catch (error) {
      console.error("API create deal error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}

export async function DELETE(req: Request) {
  return handleApi(req, "crm.deals.manage", async (ctx: ServerContext) => {
    try {
      const id = new URL(req.url).searchParams.get("id");
      if (!id) {
        return NextResponse.json(
          { error: "id is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      await db
        .delete(crmDeals)
        .where(
          and(
            eq(crmDeals.id, id),
            eq(crmDeals.organizationId, ctx.organizationId)
          )
        );
      return NextResponse.json(
        { data: { id } },
        { headers: getCorsHeaders(req) }
      );
    } catch (error) {
      console.error("API delete deal error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}
