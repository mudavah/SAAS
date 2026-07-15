import { NextResponse } from "next/server";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { getCorsHeaders } from "@/lib/api/cors";
import { emitDeveloperEvent } from "@/lib/api/events";
import { ALL_PERMISSION_KEYS } from "@/lib/rbac";
import { logger } from "@/lib/logger";

const updateKeySchema = z.object({
  name: z.string().min(2).optional(),
  scopes: z.array(z.string()).optional(),
  status: z.enum(["active", "inactive", "revoked"]).optional(),
});

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "api.keys.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const key = await db.query.apiKeys.findFirst({
    where: and(
      eq(apiKeys.id, id),
      eq(apiKeys.organizationId, ctx.organizationId)
    ),
  });

  if (!key) {
    return NextResponse.json({ error: "API key not found" }, { status: 404, headers: getCorsHeaders(req) });
  }

  try {
    const body = await req.json();
    const parsed = updateKeySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400, headers: getCorsHeaders(req) }
      );
    }

    if (parsed.data.scopes) {
      const invalid = parsed.data.scopes.filter(
        (s) => s !== "*" && !ALL_PERMISSION_KEYS.includes(s as never)
      );
      if (invalid.length > 0) {
        return NextResponse.json(
          { error: `Invalid scopes: ${invalid.join(", ")}` },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
    }

    const [updated] = await db
      .update(apiKeys)
      .set(parsed.data)
      .where(
        and(eq(apiKeys.id, id), eq(apiKeys.organizationId, ctx.organizationId))
      )
      .returning();

    return NextResponse.json(
      {
        id: updated.id,
        name: updated.name,
        keyPrefix: updated.keyPrefix,
        scopes: updated.scopes,
        status: updated.status,
        expiresAt: updated.expiresAt,
        lastUsedAt: updated.lastUsedAt,
        createdAt: updated.createdAt,
      },
      { headers: getCorsHeaders(req) }
    );
  } catch (error) {
    logger.error("Update API key error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
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
  const res = await requireApiContext(req, "api.keys.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const key = await db.query.apiKeys.findFirst({
    where: and(
      eq(apiKeys.id, id),
      eq(apiKeys.organizationId, ctx.organizationId)
    ),
  });

  if (!key) {
    return NextResponse.json({ error: "API key not found" }, { status: 404, headers: getCorsHeaders(req) });
  }

  await db
    .update(apiKeys)
    .set({ status: "revoked", revokedAt: new Date(), revokedBy: ctx.userId! })
    .where(
      and(eq(apiKeys.id, id), eq(apiKeys.organizationId, ctx.organizationId))
    );

  await emitDeveloperEvent({
    organizationId: ctx.organizationId,
    eventType: "api.key.revoked",
    userId: ctx.userId,
    resourceType: "api_key",
    resourceId: id,
    metadata: { name: key.name },
  });

  return NextResponse.json({ success: true }, { headers: getCorsHeaders(req) });
}
