import { NextResponse } from "next/server";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { handleApi, type ServerContext } from "@/lib/session";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/logger";

export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function GET(req: Request) {
  return handleApi(req, "organization.view", async (ctx: ServerContext) => {
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, ctx.organizationId),
    });
    return NextResponse.json({ data: org }, { headers: getCorsHeaders(req) });
  });
}

export async function PATCH(req: Request) {
  return handleApi(req, "organization.update", async (ctx: ServerContext) => {
    try {
      const body = await req.json();
      const [org] = await db
        .update(organizations)
        .set({
          name: body.name,
          logo: body.logo,
          settings: body.settings,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, ctx.organizationId))
        .returning();
      return NextResponse.json(
        { data: org },
        { status: 200, headers: getCorsHeaders(req) }
      );
    } catch (error) {
      logger.error("API update organization error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}
