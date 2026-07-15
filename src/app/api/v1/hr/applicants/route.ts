import { NextResponse } from "next/server";
import { db } from "@/db";
import { hrApplicants } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { handleApi, type ServerContext } from "@/lib/session";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/logger";

export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function GET(req: Request) {
  return handleApi(req, "hr.recruitment.manage", async (ctx: ServerContext) => {
    const rows = await db.query.hrApplicants.findMany({
      where: eq(hrApplicants.organizationId, ctx.organizationId),
      orderBy: (hrApplicants, { desc }) => [desc(hrApplicants.createdAt)],
      limit: 100,
    });
    return NextResponse.json({ data: rows }, { headers: getCorsHeaders(req) });
  });
}

export async function POST(req: Request) {
  return handleApi(req, "hr.recruitment.manage", async (ctx: ServerContext) => {
    try {
      const body = await req.json();
      if (!body.firstName || !body.lastName || !body.email) {
        return NextResponse.json(
          { error: "firstName, lastName and email are required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      const [item] = await db
        .insert(hrApplicants)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.userId!,
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email,
          phone: body.phone || null,
          positionId: body.positionId || null,
          departmentId: body.departmentId || null,
          status: body.status || "applied",
          resumeUrl: body.resumeUrl || null,
          coverLetter: body.coverLetter || null,
          expectedSalary: body.expectedSalary || null,
          availabilityDate: body.availabilityDate
            ? new Date(body.availabilityDate)
            : null,
          source: body.source || null,
          notes: body.notes || null,
        })
        .returning();
      return NextResponse.json(
        { data: item },
        { status: 201, headers: getCorsHeaders(req) }
      );
    } catch (error) {
      logger.error("API create applicant error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}

export async function DELETE(req: Request) {
  return handleApi(req, "hr.recruitment.manage", async (ctx: ServerContext) => {
    try {
      const id = new URL(req.url).searchParams.get("id");
      if (!id) {
        return NextResponse.json(
          { error: "id is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      await db
        .delete(hrApplicants)
        .where(
          and(
            eq(hrApplicants.id, id),
            eq(hrApplicants.organizationId, ctx.organizationId)
          )
        );
      return NextResponse.json(
        { data: { id } },
        { headers: getCorsHeaders(req) }
      );
    } catch (error) {
      logger.error("API delete applicant error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}
