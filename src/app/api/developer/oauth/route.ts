import { NextResponse } from "next/server";
import { db } from "@/db";
import { oauthClients } from "@/db/schema";
import { z } from "zod";
import { and, eq, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { getCorsHeaders } from "@/lib/api/cors";
import { createOAuthClient } from "@/lib/api/oauth";
import { emitDeveloperEvent } from "@/lib/api/events";
import { logger } from "@/lib/logger";

const createClientSchema = z.object({
  name: z.string().min(2, "Name is required"),
  redirectUris: z.array(z.string().url()).min(1, "At least one redirect URI is required"),
  scopes: z.array(z.string()).default([]),
});

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}

export async function GET(req: Request) {
  const res = await requireApiContext(req, "oauth.clients.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const clients = await db.query.oauthClients.findMany({
    where: and(
      eq(oauthClients.organizationId, ctx.organizationId),
      eq(oauthClients.status, "active")
    ),
    orderBy: (c) => [desc(c.createdAt)],
  });

  return NextResponse.json(
    clients.map((c) => ({
      id: c.id,
      name: c.name,
      clientId: c.clientId,
      redirectUris: c.redirectUris,
      scopes: c.scopes,
      status: c.status,
      createdAt: c.createdAt,
    })),
    { headers: getCorsHeaders(req) }
  );
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "oauth.clients.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const parsed = createClientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400, headers: getCorsHeaders(req) }
      );
    }

    const { client, plaintextSecret } = await createOAuthClient({
      organizationId: ctx.organizationId,
      name: parsed.data.name,
      redirectUris: parsed.data.redirectUris,
      scopes: parsed.data.scopes,
      createdBy: ctx.userId!,
    });

    await emitDeveloperEvent({
      organizationId: ctx.organizationId,
      eventType: "oauth.client.created",
      userId: ctx.userId,
      resourceType: "oauth_client",
      resourceId: client.id,
      metadata: { name: client.name, scopes: client.scopes },
    });

    return NextResponse.json(
      {
        id: client.id,
        name: client.name,
        clientId: client.clientId,
        plaintextSecret,
        redirectUris: client.redirectUris,
        scopes: client.scopes,
        status: client.status,
        createdAt: client.createdAt,
      },
      { status: 201, headers: getCorsHeaders(req) }
    );
  } catch (error) {
    logger.error("Create OAuth client error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: getCorsHeaders(req) }
    );
  }
}
