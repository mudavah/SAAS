import { NextResponse } from "next/server";
import { db } from "@/db";
import { procurementRfqs } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { handleApi, type ServerContext } from "@/lib/session";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/logger";

export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function GET(req: Request) {
  return handleApi(req, "purchasing.rfq.manage", async (ctx: ServerContext) => {
    const rows = await db.query.procurementRfqs.findMany({
      where: eq(procurementRfqs.organizationId, ctx.organizationId),
      orderBy: (procurementRfqs, { desc }) => [desc(procurementRfqs.createdAt)],
      limit: 100,
    });
    return NextResponse.json({ data: rows }, { headers: getCorsHeaders(req) });
  });
}

export async function POST(req: Request) {
  return handleApi(req, "purchasing.rfq.manage", async (ctx: ServerContext) => {
    try {
      const body = await req.json();
      if (!body.rfqNumber || !body.title) {
        return NextResponse.json(
          { error: "rfqNumber and title are required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      const [item] = await db
        .insert(procurementRfqs)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.userId!,
          rfqNumber: body.rfqNumber,
          title: body.title,
          status: body.status || "draft",
          issuedDate: body.issuedDate ? new Date(body.issuedDate) : null,
          validUntil: body.validUntil ? new Date(body.validUntil) : null,
          notes: body.notes || null,
        })
        .returning();
      return NextResponse.json(
        { data: item },
        { status: 201, headers: getCorsHeaders(req) }
      );
    } catch (error) {
      logger.error("API create rfq error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}

export async function DELETE(req: Request) {
  return handleApi(req, "purchasing.rfq.manage", async (ctx: ServerContext) => {
    try {
      const id = new URL(req.url).searchParams.get("id");
      if (!id) {
        return NextResponse.json(
          { error: "id is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      await db
        .delete(procurementRfqs)
        .where(
          and(
            eq(procurementRfqs.id, id),
            eq(procurementRfqs.organizationId, ctx.organizationId)
          )
        );
      return NextResponse.json(
        { data: { id } },
        { headers: getCorsHeaders(req) }
      );
    } catch (error) {
      logger.error("API delete rfq error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}
