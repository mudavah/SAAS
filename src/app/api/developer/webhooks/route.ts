import { NextResponse } from "next/server";
import { db } from "@/db";
import { webhooks } from "@/db/schema";
import { z } from "zod";
import { and, eq, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { getCorsHeaders } from "@/lib/api/cors";
import { createWebhook } from "@/lib/api/webhooks";
import { emitDeveloperEvent } from "@/lib/api/events";

const createWebhookSchema = z.object({
  name: z.string().min(2, "Name is required"),
  url: z.string().url("Invalid URL"),
  events: z.array(z.string()).min(1, "At least one event is required"),
  headers: z.record(z.string()).optional(),
});

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}

export async function GET(req: Request) {
  const res = await requireApiContext(req, "webhooks.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const webhookList = await db.query.webhooks.findMany({
    where: and(
      eq(webhooks.organizationId, ctx.organizationId),
      eq(webhooks.status, "active")
    ),
    orderBy: (w) => [desc(w.createdAt)],
  });

  return NextResponse.json(
    webhookList.map((w) => ({
      id: w.id,
      name: w.name,
      url: w.url,
      events: w.events,
      status: w.status,
      headers: w.headers,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    })),
    { headers: getCorsHeaders(req) }
  );
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "webhooks.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const parsed = createWebhookSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400, headers: getCorsHeaders(req) }
      );
    }

    const webhook = await createWebhook({
      organizationId: ctx.organizationId,
      name: parsed.data.name,
      url: parsed.data.url,
      events: parsed.data.events,
      headers: parsed.data.headers,
    });

    await emitDeveloperEvent({
      organizationId: ctx.organizationId,
      eventType: "webhook.created",
      userId: ctx.userId,
      resourceType: "webhook",
      resourceId: webhook.id,
      metadata: { name: webhook.name, url: webhook.url, events: webhook.events },
    });

    return NextResponse.json(
      {
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        status: webhook.status,
        headers: webhook.headers,
        secret: webhook.secret,
        createdAt: webhook.createdAt,
        updatedAt: webhook.updatedAt,
      },
      { status: 201, headers: getCorsHeaders(req) }
    );
  } catch (error) {
    console.error("Create webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: getCorsHeaders(req) }
    );
  }
}
