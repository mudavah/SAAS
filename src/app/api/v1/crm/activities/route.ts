import { NextResponse } from "next/server";
import { db } from "@/db";
import { crmActivities } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { handleApi, type ServerContext } from "@/lib/session";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/logger";

export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function GET(req: Request) {
  return handleApi(req, "crm.activities.manage", async (ctx: ServerContext) => {
    const rows = await db.query.crmActivities.findMany({
      where: eq(crmActivities.organizationId, ctx.organizationId),
      orderBy: (crmActivities, { desc }) => [desc(crmActivities.createdAt)],
      limit: 100,
    });
    return NextResponse.json({ data: rows }, { headers: getCorsHeaders(req) });
  });
}

export async function POST(req: Request) {
  return handleApi(req, "crm.activities.manage", async (ctx: ServerContext) => {
    try {
      const body = await req.json();
      if (!body.type || !body.subject) {
        return NextResponse.json(
          { error: "type and subject are required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      const [item] = await db
        .insert(crmActivities)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.userId!,
          type: body.type,
          subject: body.subject,
          description: body.description || null,
          status: body.status || "planned",
          priority: body.priority || "medium",
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
          leadId: body.leadId || null,
          contactId: body.contactId || null,
          companyId: body.companyId || null,
          dealId: body.dealId || null,
        })
        .returning();
      return NextResponse.json(
        { data: item },
        { status: 201, headers: getCorsHeaders(req) }
      );
    } catch (error) {
      logger.error("API create activity error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}

export async function DELETE(req: Request) {
  return handleApi(req, "crm.activities.manage", async (ctx: ServerContext) => {
    try {
      const id = new URL(req.url).searchParams.get("id");
      if (!id) {
        return NextResponse.json(
          { error: "id is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      await db
        .delete(crmActivities)
        .where(
          and(
            eq(crmActivities.id, id),
            eq(crmActivities.organizationId, ctx.organizationId)
          )
        );
      return NextResponse.json(
        { data: { id } },
        { headers: getCorsHeaders(req) }
      );
    } catch (error) {
      logger.error("API delete activity error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}
