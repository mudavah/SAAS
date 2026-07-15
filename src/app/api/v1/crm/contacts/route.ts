import { NextResponse } from "next/server";
import { db } from "@/db";
import { crmContacts } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { handleApi, type ServerContext } from "@/lib/session";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/logger";

export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function GET(req: Request) {
  return handleApi(req, "crm.contacts.manage", async (ctx: ServerContext) => {
    const rows = await db.query.crmContacts.findMany({
      where: eq(crmContacts.organizationId, ctx.organizationId),
      orderBy: (crmContacts, { desc }) => [desc(crmContacts.createdAt)],
      limit: 100,
    });
    return NextResponse.json({ data: rows }, { headers: getCorsHeaders(req) });
  });
}

export async function POST(req: Request) {
  return handleApi(req, "crm.contacts.manage", async (ctx: ServerContext) => {
    try {
      const body = await req.json();
      if (!body.firstName) {
        return NextResponse.json(
          { error: "firstName is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      const [item] = await db
        .insert(crmContacts)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.userId!,
          companyId: body.companyId || null,
          firstName: body.firstName,
          lastName: body.lastName || null,
          email: body.email || null,
          phone: body.phone || null,
          jobTitle: body.jobTitle || null,
          department: body.department || null,
          isPrimary: body.isPrimary ?? false,
          notes: body.notes || null,
        })
        .returning();
      return NextResponse.json(
        { data: item },
        { status: 201, headers: getCorsHeaders(req) }
      );
    } catch (error) {
      logger.error("API create contact error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}

export async function DELETE(req: Request) {
  return handleApi(req, "crm.contacts.manage", async (ctx: ServerContext) => {
    try {
      const id = new URL(req.url).searchParams.get("id");
      if (!id) {
        return NextResponse.json(
          { error: "id is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      await db
        .delete(crmContacts)
        .where(
          and(
            eq(crmContacts.id, id),
            eq(crmContacts.organizationId, ctx.organizationId)
          )
        );
      return NextResponse.json(
        { data: { id } },
        { headers: getCorsHeaders(req) }
      );
    } catch (error) {
      logger.error("API delete contact error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}
