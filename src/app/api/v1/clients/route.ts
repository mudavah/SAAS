import { NextResponse } from "next/server";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { clientSchema } from "@/lib/validations";
import { eq, desc } from "drizzle-orm";
import { handleApi, type ServerContext } from "@/lib/session";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/logger";

export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function GET(req: Request) {
  return handleApi(req, "clients.view", async (ctx: ServerContext) => {
    const rows = await db.query.clients.findMany({
      where: eq(clients.organizationId, ctx.organizationId),
      orderBy: (clients, { desc }) => [desc(clients.createdAt)],
      limit: 100,
    });
    return NextResponse.json({ clients: rows }, { headers: getCorsHeaders(req) });
  });
}

export async function POST(req: Request) {
  return handleApi(req, "clients.create", async (ctx: ServerContext) => {
    try {
      const body = await req.json();
      const parsed = clientSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.errors[0].message },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }

      const [client] = await db
        .insert(clients)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.userId!,
          ...parsed.data,
          email: parsed.data.email || null,
        })
        .returning();

      return NextResponse.json(
        { client },
        { status: 201, headers: getCorsHeaders(req) }
      );
    } catch (error) {
      logger.error("API create client error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}
