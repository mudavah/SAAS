import { NextResponse } from "next/server";
import { db } from "@/db";
import { hrEmployees } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { handleApi, type ServerContext } from "@/lib/session";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";

export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function GET(req: Request) {
  return handleApi(req, "hr.employees.manage", async (ctx: ServerContext) => {
    const rows = await db.query.hrEmployees.findMany({
      where: eq(hrEmployees.organizationId, ctx.organizationId),
      orderBy: (hrEmployees, { desc }) => [desc(hrEmployees.createdAt)],
      limit: 100,
    });
    return NextResponse.json({ data: rows }, { headers: getCorsHeaders(req) });
  });
}

export async function POST(req: Request) {
  return handleApi(req, "hr.employees.manage", async (ctx: ServerContext) => {
    try {
      const body = await req.json();
      if (
        !body.employeeNumber ||
        !body.firstName ||
        !body.lastName ||
        !body.email ||
        !body.employmentType ||
        !body.hireDate
      ) {
        return NextResponse.json(
          {
            error:
              "employeeNumber, firstName, lastName, email, employmentType and hireDate are required",
          },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      const [item] = await db
        .insert(hrEmployees)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.userId!,
          employeeNumber: body.employeeNumber,
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email,
          phone: body.phone || null,
          address: body.address || null,
          city: body.city || null,
          country: body.country || "Kenya",
          departmentId: body.departmentId || null,
          positionId: body.positionId || null,
          managerId: body.managerId || null,
          employmentType: body.employmentType,
          status: body.status || "active",
          hireDate: new Date(body.hireDate),
          salary: body.salary || null,
          currency: body.currency || "KES",
        })
        .returning();
      return NextResponse.json(
        { data: item },
        { status: 201, headers: getCorsHeaders(req) }
      );
    } catch (error) {
      console.error("API create employee error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}

export async function DELETE(req: Request) {
  return handleApi(req, "hr.employees.manage", async (ctx: ServerContext) => {
    try {
      const id = new URL(req.url).searchParams.get("id");
      if (!id) {
        return NextResponse.json(
          { error: "id is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      await db
        .delete(hrEmployees)
        .where(
          and(
            eq(hrEmployees.id, id),
            eq(hrEmployees.organizationId, ctx.organizationId)
          )
        );
      return NextResponse.json(
        { data: { id } },
        { headers: getCorsHeaders(req) }
      );
    } catch (error) {
      console.error("API delete employee error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}
