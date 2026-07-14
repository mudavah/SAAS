import { NextResponse } from "next/server";
import { db } from "@/db";
import { oauthClients } from "@/db/schema";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { getCorsHeaders } from "@/lib/api/cors";
import { emitDeveloperEvent } from "@/lib/api/events";

const updateClientSchema = z.object({
  name: z.string().min(2).optional(),
  redirectUris: z.array(z.string().url()).optional(),
  scopes: z.array(z.string()).optional(),
  status: z.enum(["active", "revoked"]).optional(),
});

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "oauth.clients.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const client = await db.query.oauthClients.findFirst({
    where: and(
      eq(oauthClients.id, id),
      eq(oauthClients.organizationId, ctx.organizationId)
    ),
  });

  if (!client) {
    return NextResponse.json({ error: "OAuth client not found" }, { status: 404, headers: getCorsHeaders(req) });
  }

  return NextResponse.json(
    {
      id: client.id,
      name: client.name,
      clientId: client.clientId,
      redirectUris: client.redirectUris,
      scopes: client.scopes,
      status: client.status,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    },
    { headers: getCorsHeaders(req) }
  );
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "oauth.clients.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const client = await db.query.oauthClients.findFirst({
    where: and(
      eq(oauthClients.id, id),
      eq(oauthClients.organizationId, ctx.organizationId)
    ),
  });

  if (!client) {
    return NextResponse.json({ error: "OAuth client not found" }, { status: 404, headers: getCorsHeaders(req) });
  }

  try {
    const body = await req.json();
    const parsed = updateClientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400, headers: getCorsHeaders(req) }
      );
    }

    const [updated] = await db
      .update(oauthClients)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(
        and(eq(oauthClients.id, id), eq(oauthClients.organizationId, ctx.organizationId))
      )
      .returning();

    return NextResponse.json(
      {
        id: updated.id,
        name: updated.name,
        clientId: updated.clientId,
        redirectUris: updated.redirectUris,
        scopes: updated.scopes,
        status: updated.status,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
      { headers: getCorsHeaders(req) }
    );
  } catch (error) {
    console.error("Update OAuth client error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: getCorsHeaders(req) }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "oauth.clients.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const client = await db.query.oauthClients.findFirst({
    where: and(
      eq(oauthClients.id, id),
      eq(oauthClients.organizationId, ctx.organizationId)
    ),
  });

  if (!client) {
    return NextResponse.json({ error: "OAuth client not found" }, { status: 404, headers: getCorsHeaders(req) });
  }

  await db
    .update(oauthClients)
    .set({ status: "revoked", updatedAt: new Date() })
    .where(
      and(eq(oauthClients.id, id), eq(oauthClients.organizationId, ctx.organizationId))
    );

  await emitDeveloperEvent({
    organizationId: ctx.organizationId,
    eventType: "oauth.client.revoked",
    userId: ctx.userId,
    resourceType: "oauth_client",
    resourceId: id,
    metadata: { name: client.name },
  });

  return NextResponse.json({ success: true }, { headers: getCorsHeaders(req) });
}
