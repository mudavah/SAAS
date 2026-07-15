import { NextResponse } from "next/server";
import { db } from "@/db";
import { payrollRuns } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { handleApi, type ServerContext } from "@/lib/session";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/logger";

export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function GET(req: Request) {
  return handleApi(req, "payroll.runs.manage", async (ctx: ServerContext) => {
    const rows = await db.query.payrollRuns.findMany({
      where: eq(payrollRuns.organizationId, ctx.organizationId),
      orderBy: (payrollRuns, { desc }) => [desc(payrollRuns.createdAt)],
      limit: 100,
    });
    return NextResponse.json({ data: rows }, { headers: getCorsHeaders(req) });
  });
}

export async function POST(req: Request) {
  return handleApi(req, "payroll.runs.manage", async (ctx: ServerContext) => {
    try {
      const body = await req.json();
      if (!body.payrollPeriodId || !body.runNumber) {
        return NextResponse.json(
          { error: "payrollPeriodId and runNumber are required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      const [item] = await db
        .insert(payrollRuns)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.userId!,
          payrollPeriodId: body.payrollPeriodId,
          runNumber: body.runNumber,
          status: body.status || "draft",
          totalEmployees: body.totalEmployees || 0,
          totalGross: body.totalGross || "0",
          totalDeductions: body.totalDeductions || "0",
          totalNet: body.totalNet || "0",
          notes: body.notes || null,
        })
        .returning();
      return NextResponse.json(
        { data: item },
        { status: 201, headers: getCorsHeaders(req) }
      );
    } catch (error) {
      logger.error("API create payroll run error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}

export async function DELETE(req: Request) {
  return handleApi(req, "payroll.runs.manage", async (ctx: ServerContext) => {
    try {
      const id = new URL(req.url).searchParams.get("id");
      if (!id) {
        return NextResponse.json(
          { error: "id is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      await db
        .delete(payrollRuns)
        .where(
          and(
            eq(payrollRuns.id, id),
            eq(payrollRuns.organizationId, ctx.organizationId)
          )
        );
      return NextResponse.json(
        { data: { id } },
        { headers: getCorsHeaders(req) }
      );
    } catch (error) {
      logger.error("API delete payroll run error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}
