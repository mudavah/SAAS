import { NextResponse } from "next/server";
import { db } from "@/db";
import { crmCompanies } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { handleApi, type ServerContext } from "@/lib/session";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/logger";

export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function GET(req: Request) {
  return handleApi(req, "crm.view", async (ctx: ServerContext) => {
    const rows = await db.query.crmCompanies.findMany({
      where: eq(crmCompanies.organizationId, ctx.organizationId),
      orderBy: (crmCompanies, { desc }) => [desc(crmCompanies.createdAt)],
      limit: 100,
    });
    return NextResponse.json({ data: rows }, { headers: getCorsHeaders(req) });
  });
}

export async function POST(req: Request) {
  return handleApi(req, "crm.contacts.manage", async (ctx: ServerContext) => {
    try {
      const body = await req.json();
      if (!body.name) {
        return NextResponse.json(
          { error: "name is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      const [item] = await db
        .insert(crmCompanies)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.userId!,
          name: body.name,
          email: body.email || null,
          phone: body.phone || null,
          website: body.website || null,
          industry: body.industry || null,
          size: body.size || null,
          description: body.description || null,
          address: body.address || null,
          city: body.city || null,
          country: body.country || "Kenya",
          taxId: body.taxId || null,
        })
        .returning();
      return NextResponse.json(
        { data: item },
        { status: 201, headers: getCorsHeaders(req) }
      );
    } catch (error) {
      logger.error("API create company error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
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
        .delete(crmCompanies)
        .where(
          and(
            eq(crmCompanies.id, id),
            eq(crmCompanies.organizationId, ctx.organizationId)
          )
        );
      return NextResponse.json(
        { data: { id } },
        { headers: getCorsHeaders(req) }
      );
    } catch (error) {
      logger.error("API delete company error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}
