import { NextResponse } from "next/server";
import { db } from "@/db";
import { organizationMembers } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { handleApi, type ServerContext } from "@/lib/session";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";

export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function GET(req: Request) {
  return handleApi(req, "team.view", async (ctx: ServerContext) => {
    const rows = await db.query.organizationMembers.findMany({
      where: eq(organizationMembers.organizationId, ctx.organizationId),
      orderBy: (organizationMembers, { desc }) => [
        desc(organizationMembers.createdAt),
      ],
      limit: 100,
    });
    return NextResponse.json({ data: rows }, { headers: getCorsHeaders(req) });
  });
}

export async function POST(req: Request) {
  return handleApi(req, "team.manage", async (ctx: ServerContext) => {
    try {
      const body = await req.json();
      if (!body.email) {
        return NextResponse.json(
          { error: "email is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      const [item] = await db
        .insert(organizationMembers)
        .values({
          organizationId: ctx.organizationId,
          userId: body.userId || ctx.userId!,
          email: body.email,
          name: body.name || null,
          roleType: body.roleType || "employee",
        })
        .returning();
      return NextResponse.json(
        { data: item },
        { status: 201, headers: getCorsHeaders(req) }
      );
    } catch (error) {
      console.error("API create member error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}

export async function PATCH(req: Request) {
  return handleApi(req, "team.manage", async (ctx: ServerContext) => {
    try {
      const id = new URL(req.url).searchParams.get("id");
      if (!id) {
        return NextResponse.json(
          { error: "id is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      const body = await req.json();
      const [item] = await db
        .update(organizationMembers)
        .set({
          name: body.name,
          roleType: body.roleType,
          status: body.status,
          customRoleId: body.customRoleId || null,
        })
        .where(
          and(
            eq(organizationMembers.id, id),
            eq(organizationMembers.organizationId, ctx.organizationId)
          )
        )
        .returning();
      return NextResponse.json(
        { data: item },
        { status: 200, headers: getCorsHeaders(req) }
      );
    } catch (error) {
      console.error("API update member error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}

export async function DELETE(req: Request) {
  return handleApi(req, "team.manage", async (ctx: ServerContext) => {
    try {
      const id = new URL(req.url).searchParams.get("id");
      if (!id) {
        return NextResponse.json(
          { error: "id is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      await db
        .delete(organizationMembers)
        .where(
          and(
            eq(organizationMembers.id, id),
            eq(organizationMembers.organizationId, ctx.organizationId)
          )
        );
      return NextResponse.json(
        { data: { id } },
        { headers: getCorsHeaders(req) }
      );
    } catch (error) {
      console.error("API delete member error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}
