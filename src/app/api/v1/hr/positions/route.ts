import { NextResponse } from "next/server";
import { db } from "@/db";
import { hrPositions } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { handleApi, type ServerContext } from "@/lib/session";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/logger";

export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function GET(req: Request) {
  return handleApi(req, "hr.positions.manage", async (ctx: ServerContext) => {
    const rows = await db.query.hrPositions.findMany({
      where: eq(hrPositions.organizationId, ctx.organizationId),
      orderBy: (hrPositions, { desc }) => [desc(hrPositions.createdAt)],
      limit: 100,
    });
    return NextResponse.json({ data: rows }, { headers: getCorsHeaders(req) });
  });
}

export async function POST(req: Request) {
  return handleApi(req, "hr.positions.manage", async (ctx: ServerContext) => {
    try {
      const body = await req.json();
      if (!body.departmentId || !body.title || !body.employmentType) {
        return NextResponse.json(
          { error: "departmentId, title and employmentType are required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      const [item] = await db
        .insert(hrPositions)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.userId!,
          departmentId: body.departmentId,
          title: body.title,
          description: body.description || null,
          employmentType: body.employmentType,
          contractType: body.contractType || null,
          salaryMin: body.salaryMin || null,
          salaryMax: body.salaryMax || null,
          currency: body.currency || "KES",
          isActive: body.isActive ?? true,
        })
        .returning();
      return NextResponse.json(
        { data: item },
        { status: 201, headers: getCorsHeaders(req) }
      );
    } catch (error) {
      logger.error("API create position error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}

export async function DELETE(req: Request) {
  return handleApi(req, "hr.positions.manage", async (ctx: ServerContext) => {
    try {
      const id = new URL(req.url).searchParams.get("id");
      if (!id) {
        return NextResponse.json(
          { error: "id is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      await db
        .delete(hrPositions)
        .where(
          and(
            eq(hrPositions.id, id),
            eq(hrPositions.organizationId, ctx.organizationId)
          )
        );
      return NextResponse.json(
        { data: { id } },
        { headers: getCorsHeaders(req) }
      );
    } catch (error) {
      logger.error("API delete position error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}
