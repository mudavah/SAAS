import { NextResponse } from "next/server";
import { db } from "@/db";
import { payrollPeriods } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { handleApi, type ServerContext } from "@/lib/session";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";

export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function GET(req: Request) {
  return handleApi(req, "payroll.periods.manage", async (ctx: ServerContext) => {
    const rows = await db.query.payrollPeriods.findMany({
      where: eq(payrollPeriods.organizationId, ctx.organizationId),
      orderBy: (payrollPeriods, { desc }) => [desc(payrollPeriods.createdAt)],
      limit: 100,
    });
    return NextResponse.json({ data: rows }, { headers: getCorsHeaders(req) });
  });
}

export async function POST(req: Request) {
  return handleApi(req, "payroll.periods.manage", async (ctx: ServerContext) => {
    try {
      const body = await req.json();
      if (!body.name || !body.startDate || !body.endDate) {
        return NextResponse.json(
          { error: "name, startDate and endDate are required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      const [item] = await db
        .insert(payrollPeriods)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.userId!,
          name: body.name,
          startDate: new Date(body.startDate),
          endDate: new Date(body.endDate),
          status: body.status || "open",
          isLocked: body.isLocked ?? false,
        })
        .returning();
      return NextResponse.json(
        { data: item },
        { status: 201, headers: getCorsHeaders(req) }
      );
    } catch (error) {
      console.error("API create payroll period error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}

export async function DELETE(req: Request) {
  return handleApi(req, "payroll.periods.manage", async (ctx: ServerContext) => {
    try {
      const id = new URL(req.url).searchParams.get("id");
      if (!id) {
        return NextResponse.json(
          { error: "id is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      await db
        .delete(payrollPeriods)
        .where(
          and(
            eq(payrollPeriods.id, id),
            eq(payrollPeriods.organizationId, ctx.organizationId)
          )
        );
      return NextResponse.json(
        { data: { id } },
        { headers: getCorsHeaders(req) }
      );
    } catch (error) {
      console.error("API delete payroll period error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}
