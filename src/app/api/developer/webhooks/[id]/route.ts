import { NextResponse } from "next/server";
import { db } from "@/db";
import { webhooks } from "@/db/schema";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { getCorsHeaders } from "@/lib/api/cors";
import { emitDeveloperEvent } from "@/lib/api/events";
import { logger } from "@/lib/logger";

const updateWebhookSchema = z.object({
  name: z.string().min(2).optional(),
  url: z.string().url().optional(),
  events: z.array(z.string()).optional(),
  headers: z.record(z.string()).optional(),
  status: z.enum(["active", "paused", "disabled"]).optional(),
});

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "webhooks.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const webhook = await db.query.webhooks.findFirst({
    where: and(
      eq(webhooks.id, id),
      eq(webhooks.organizationId, ctx.organizationId)
    ),
  });

  if (!webhook) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404, headers: getCorsHeaders(req) });
  }

  return NextResponse.json(
    {
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      status: webhook.status,
      headers: webhook.headers,
      createdAt: webhook.createdAt,
      updatedAt: webhook.updatedAt,
    },
    { headers: getCorsHeaders(req) }
  );
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "webhooks.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const webhook = await db.query.webhooks.findFirst({
    where: and(
      eq(webhooks.id, id),
      eq(webhooks.organizationId, ctx.organizationId)
    ),
  });

  if (!webhook) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404, headers: getCorsHeaders(req) });
  }

  try {
    const body = await req.json();
    const parsed = updateWebhookSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400, headers: getCorsHeaders(req) }
      );
    }

    const [updated] = await db
      .update(webhooks)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(
        and(eq(webhooks.id, id), eq(webhooks.organizationId, ctx.organizationId))
      )
      .returning();

    await emitDeveloperEvent({
      organizationId: ctx.organizationId,
      eventType: "webhook.updated",
      userId: ctx.userId,
      resourceType: "webhook",
      resourceId: id,
      metadata: { changes: parsed.data },
    });

    return NextResponse.json(
      {
        id: updated.id,
        name: updated.name,
        url: updated.url,
        events: updated.events,
        status: updated.status,
        headers: updated.headers,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
      { headers: getCorsHeaders(req) }
    );
  } catch (error) {
    logger.error("Update webhook error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
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
  const res = await requireApiContext(req, "webhooks.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const webhook = await db.query.webhooks.findFirst({
    where: and(
      eq(webhooks.id, id),
      eq(webhooks.organizationId, ctx.organizationId)
    ),
  });

  if (!webhook) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404, headers: getCorsHeaders(req) });
  }

  await db
    .delete(webhooks)
    .where(
      and(eq(webhooks.id, id), eq(webhooks.organizationId, ctx.organizationId))
    );

  await emitDeveloperEvent({
    organizationId: ctx.organizationId,
    eventType: "webhook.deleted",
    userId: ctx.userId,
    resourceType: "webhook",
    resourceId: id,
    metadata: { name: webhook.name },
  });

  return NextResponse.json({ success: true }, { headers: getCorsHeaders(req) });
}
