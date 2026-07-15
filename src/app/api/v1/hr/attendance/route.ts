import { NextResponse } from "next/server";
import { db } from "@/db";
import { hrAttendanceRecords } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { handleApi, type ServerContext } from "@/lib/session";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/logger";

export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function GET(req: Request) {
  return handleApi(req, "hr.attendance.manage", async (ctx: ServerContext) => {
    const rows = await db.query.hrAttendanceRecords.findMany({
      where: eq(hrAttendanceRecords.organizationId, ctx.organizationId),
      orderBy: (hrAttendanceRecords, { desc }) => [desc(hrAttendanceRecords.createdAt)],
      limit: 100,
    });
    return NextResponse.json({ data: rows }, { headers: getCorsHeaders(req) });
  });
}

export async function POST(req: Request) {
  return handleApi(req, "hr.attendance.manage", async (ctx: ServerContext) => {
    try {
      const body = await req.json();
      if (!body.employeeId || !body.date || !body.status) {
        return NextResponse.json(
          { error: "employeeId, date and status are required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      const [item] = await db
        .insert(hrAttendanceRecords)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.userId!,
          employeeId: body.employeeId,
          date: new Date(body.date),
          status: body.status,
          clockIn: body.clockIn ? new Date(body.clockIn) : null,
          clockOut: body.clockOut ? new Date(body.clockOut) : null,
          breakMinutes: body.breakMinutes || 0,
          overtimeMinutes: body.overtimeMinutes || 0,
          notes: body.notes || null,
        })
        .returning();
      return NextResponse.json(
        { data: item },
        { status: 201, headers: getCorsHeaders(req) }
      );
    } catch (error) {
      logger.error("API create attendance error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}

export async function DELETE(req: Request) {
  return handleApi(req, "hr.attendance.manage", async (ctx: ServerContext) => {
    try {
      const id = new URL(req.url).searchParams.get("id");
      if (!id) {
        return NextResponse.json(
          { error: "id is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      await db
        .delete(hrAttendanceRecords)
        .where(
          and(
            eq(hrAttendanceRecords.id, id),
            eq(hrAttendanceRecords.organizationId, ctx.organizationId)
          )
        );
      return NextResponse.json(
        { data: { id } },
        { headers: getCorsHeaders(req) }
      );
    } catch (error) {
      logger.error("API delete attendance error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}
