import { NextResponse } from "next/server";
import { db } from "@/db";
import { crmLeads } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { handleApi, type ServerContext } from "@/lib/session";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/logger";

export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function GET(req: Request) {
  return handleApi(req, "crm.leads.manage", async (ctx: ServerContext) => {
    const rows = await db.query.crmLeads.findMany({
      where: eq(crmLeads.organizationId, ctx.organizationId),
      orderBy: (crmLeads, { desc }) => [desc(crmLeads.createdAt)],
      limit: 100,
    });
    return NextResponse.json({ data: rows }, { headers: getCorsHeaders(req) });
  });
}

export async function POST(req: Request) {
  return handleApi(req, "crm.leads.manage", async (ctx: ServerContext) => {
    try {
      const body = await req.json();
      if (!body.firstName) {
        return NextResponse.json(
          { error: "firstName is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      const [item] = await db
        .insert(crmLeads)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.userId!,
          firstName: body.firstName,
          lastName: body.lastName || null,
          email: body.email || null,
          phone: body.phone || null,
          company: body.company || null,
          source: body.source || "other",
          status: body.status || "new",
          estimatedValue: body.estimatedValue || "0",
        })
        .returning();
      return NextResponse.json(
        { data: item },
        { status: 201, headers: getCorsHeaders(req) }
      );
    } catch (error) {
      logger.error("API create lead error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}

export async function DELETE(req: Request) {
  return handleApi(req, "crm.leads.manage", async (ctx: ServerContext) => {
    try {
      const id = new URL(req.url).searchParams.get("id");
      if (!id) {
        return NextResponse.json(
          { error: "id is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      await db
        .delete(crmLeads)
        .where(
          and(
            eq(crmLeads.id, id),
            eq(crmLeads.organizationId, ctx.organizationId)
          )
        );
      return NextResponse.json(
        { data: { id } },
        { headers: getCorsHeaders(req) }
      );
    } catch (error) {
      logger.error("API delete lead error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}
