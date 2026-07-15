import { NextResponse } from "next/server";
import { db } from "@/db";
import { apiSandboxSessions, apiKeys } from "@/db/schema";
import { z } from "zod";
import { and, eq, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { getCorsHeaders } from "@/lib/api/cors";
import { createSandboxSession, listSandboxSessions } from "@/lib/api/sandbox";
import { emitDeveloperEvent } from "@/lib/api/events";
import { logger } from "@/lib/logger";

const createSessionSchema = z.object({
  name: z.string().min(2, "Name is required"),
});

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}

export async function GET(req: Request) {
  const res = await requireApiContext(req, "sandbox.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const sessions = await listSandboxSessions(ctx.organizationId);

  return NextResponse.json(
    sessions.map((s) => ({
      id: s.id,
      name: s.name,
      environment: s.environment,
      metadata: s.metadata,
      expiresAt: s.expiresAt,
      createdAt: s.createdAt,
    })),
    { headers: getCorsHeaders(req) }
  );
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "sandbox.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const parsed = createSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400, headers: getCorsHeaders(req) }
      );
    }

    const apiKey = await db.query.apiKeys.findFirst({
      where: and(
        eq(apiKeys.organizationId, ctx.organizationId),
        eq(apiKeys.status, "active")
      ),
      orderBy: (k) => [desc(k.createdAt)],
    });

    if (!apiKey) {
      return NextResponse.json(
        { error: "No active API key found. Create one first." },
        { status: 400, headers: getCorsHeaders(req) }
      );
    }

    const session = await createSandboxSession({
      organizationId: ctx.organizationId,
      apiKeyId: apiKey.id,
      name: parsed.data.name,
    });

    await emitDeveloperEvent({
      organizationId: ctx.organizationId,
      eventType: "api.sandbox.created",
      userId: ctx.userId,
      resourceType: "sandbox_session",
      resourceId: session.id,
      metadata: { name: session.name },
    });

    return NextResponse.json(
      {
        id: session.id,
        name: session.name,
        environment: session.environment,
        metadata: session.metadata,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
      },
      { status: 201, headers: getCorsHeaders(req) }
    );
  } catch (error) {
    logger.error("Create sandbox session error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: getCorsHeaders(req) }
    );
  }
}
