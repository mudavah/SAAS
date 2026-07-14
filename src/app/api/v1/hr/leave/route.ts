import { NextResponse } from "next/server";
import { db } from "@/db";
import { hrLeaveRequests } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { handleApi, type ServerContext } from "@/lib/session";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";

export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function GET(req: Request) {
  return handleApi(req, "hr.leave.manage", async (ctx: ServerContext) => {
    const rows = await db.query.hrLeaveRequests.findMany({
      where: eq(hrLeaveRequests.organizationId, ctx.organizationId),
      orderBy: (hrLeaveRequests, { desc }) => [desc(hrLeaveRequests.createdAt)],
      limit: 100,
    });
    return NextResponse.json({ data: rows }, { headers: getCorsHeaders(req) });
  });
}

export async function POST(req: Request) {
  return handleApi(req, "hr.leave.manage", async (ctx: ServerContext) => {
    try {
      const body = await req.json();
      if (
        !body.employeeId ||
        !body.leaveType ||
        !body.startDate ||
        !body.endDate ||
        body.days === undefined
      ) {
        return NextResponse.json(
          { error: "employeeId, leaveType, startDate, endDate and days are required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      const [item] = await db
        .insert(hrLeaveRequests)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.userId!,
          employeeId: body.employeeId,
          leaveType: body.leaveType,
          startDate: new Date(body.startDate),
          endDate: new Date(body.endDate),
          days: String(body.days),
          reason: body.reason || null,
          status: body.status || "pending",
        })
        .returning();
      return NextResponse.json(
        { data: item },
        { status: 201, headers: getCorsHeaders(req) }
      );
    } catch (error) {
      console.error("API create leave request error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}

export async function DELETE(req: Request) {
  return handleApi(req, "hr.leave.manage", async (ctx: ServerContext) => {
    try {
      const id = new URL(req.url).searchParams.get("id");
      if (!id) {
        return NextResponse.json(
          { error: "id is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      await db
        .delete(hrLeaveRequests)
        .where(
          and(
            eq(hrLeaveRequests.id, id),
            eq(hrLeaveRequests.organizationId, ctx.organizationId)
          )
        );
      return NextResponse.json(
        { data: { id } },
        { headers: getCorsHeaders(req) }
      );
    } catch (error) {
      console.error("API delete leave request error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}
