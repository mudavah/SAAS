import { NextResponse } from "next/server";
import { db } from "@/db";
import { hrDepartments } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { handleApi, type ServerContext } from "@/lib/session";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";

export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function GET(req: Request) {
  return handleApi(req, "hr.departments.manage", async (ctx: ServerContext) => {
    const rows = await db.query.hrDepartments.findMany({
      where: eq(hrDepartments.organizationId, ctx.organizationId),
      orderBy: (hrDepartments, { desc }) => [desc(hrDepartments.createdAt)],
      limit: 100,
    });
    return NextResponse.json({ data: rows }, { headers: getCorsHeaders(req) });
  });
}

export async function POST(req: Request) {
  return handleApi(req, "hr.departments.manage", async (ctx: ServerContext) => {
    try {
      const body = await req.json();
      if (!body.name) {
        return NextResponse.json(
          { error: "name is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      const [item] = await db
        .insert(hrDepartments)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.userId!,
          name: body.name,
          description: body.description || null,
          parentDepartmentId: body.parentDepartmentId || null,
          managerId: body.managerId || null,
          costCenter: body.costCenter || null,
          isActive: body.isActive ?? true,
        })
        .returning();
      return NextResponse.json(
        { data: item },
        { status: 201, headers: getCorsHeaders(req) }
      );
    } catch (error) {
      console.error("API create department error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}

export async function DELETE(req: Request) {
  return handleApi(req, "hr.departments.manage", async (ctx: ServerContext) => {
    try {
      const id = new URL(req.url).searchParams.get("id");
      if (!id) {
        return NextResponse.json(
          { error: "id is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      await db
        .delete(hrDepartments)
        .where(
          and(
            eq(hrDepartments.id, id),
            eq(hrDepartments.organizationId, ctx.organizationId)
          )
        );
      return NextResponse.json(
        { data: { id } },
        { headers: getCorsHeaders(req) }
      );
    } catch (error) {
      console.error("API delete department error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}
