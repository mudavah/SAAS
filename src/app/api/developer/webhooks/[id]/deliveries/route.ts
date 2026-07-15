import { NextResponse } from "next/server";
import { db } from "@/db";
import { webhookDeliveries } from "@/db/schema";
import { z } from "zod";
import { and, eq, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { getCorsHeaders } from "@/lib/api/cors";
import { listWebhookDeliveries, retryWebhookDelivery } from "@/lib/api/webhooks";
import { logger } from "@/lib/logger";

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

  const deliveries = await listWebhookDeliveries(ctx.organizationId, id, undefined, 50);

  return NextResponse.json(
    deliveries.map((d) => ({
      id: d.id,
      eventType: d.eventType,
      status: d.status,
      statusCode: d.statusCode,
      attempts: d.attempts,
      errorMessage: d.errorMessage,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    })),
    { headers: getCorsHeaders(req) }
  );
}

const retrySchema = z.object({
  deliveryId: z.string(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "webhooks.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = retrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400, headers: getCorsHeaders(req) }
      );
    }

    const delivery = await retryWebhookDelivery(ctx.organizationId, parsed.data.deliveryId);

    if (!delivery) {
      return NextResponse.json({ error: "Delivery not found" }, { status: 404, headers: getCorsHeaders(req) });
    }

    return NextResponse.json(
      {
        id: delivery.id,
        eventType: delivery.eventType,
        status: delivery.status,
        attempts: delivery.attempts,
        errorMessage: delivery.errorMessage,
        createdAt: delivery.createdAt,
        updatedAt: delivery.updatedAt,
      },
      { headers: getCorsHeaders(req) }
    );
  } catch (error) {
    logger.error("Retry webhook delivery error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: getCorsHeaders(req) }
    );
  }
}
