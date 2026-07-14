/**
 * KaziFlow — Webhooks
 * ------------------------------------------------------------------
 * Manages webhook subscriptions and event delivery. Supports:
 * - HMAC-SHA256 signature verification
 * - Exponential backoff retries
 * - Event payload templating
 * - Delivery logging and observability
 */

import crypto from "crypto";
import { db } from "@/db";
import { webhooks, webhookDeliveries } from "@/db/schema";
import { eq, and, desc, lt } from "drizzle-orm";
import type { Webhook, WebhookDelivery } from "@/db/schema";

const MAX_DELIVERY_ATTEMPTS = 5;
const INITIAL_RETRY_DELAY_MS = 1000;

// ── Signature Verification ──────────────────────────────────────────────────

export function computeWebhookSignature(
  payload: string,
  secret: string
): string {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
}

export function verifyWebhookSignature(
  payload: string,
  secret: string,
  signature: string
): boolean {
  const expected = computeWebhookSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// ── Webhook CRUD ────────────────────────────────────────────────────────────

export interface CreateWebhookInput {
  organizationId: string;
  name: string;
  url: string;
  events: string[];
  headers?: Record<string, string>;
}

export async function createWebhook(
  input: CreateWebhookInput
): Promise<Webhook> {
  const secret = crypto.randomBytes(24).toString("hex");
  const result = await db
    .insert(webhooks)
    .values({
      organizationId: input.organizationId,
      name: input.name,
      url: input.url,
      secret,
      events: input.events,
      headers: input.headers || {},
    })
    .returning();

  return result[0]!;
}

export async function listWebhooks(organizationId: string): Promise<Webhook[]> {
  return db.query.webhooks.findMany({
    where: eq(webhooks.organizationId, organizationId),
    orderBy: (w) => [desc(w.createdAt)],
  });
}

export async function getWebhook(
  organizationId: string,
  webhookId: string
): Promise<Webhook | null> {
  const webhook = await db.query.webhooks.findFirst({
    where: and(
      eq(webhooks.id, webhookId),
      eq(webhooks.organizationId, organizationId)
    ),
  });
  return webhook ?? null;
}

export async function updateWebhook(
  organizationId: string,
  webhookId: string,
  updates: Partial<Pick<Webhook, "name" | "url" | "events" | "status" | "headers">>
): Promise<Webhook | null> {
  const [webhook] = await db
    .update(webhooks)
    .set({ ...updates, updatedAt: new Date() })
    .where(
      and(
        eq(webhooks.id, webhookId),
        eq(webhooks.organizationId, organizationId)
      )
    )
    .returning();
  return webhook || null;
}

export async function deleteWebhook(
  organizationId: string,
  webhookId: string
): Promise<boolean> {
  const existing = await getWebhook(organizationId, webhookId);
  if (!existing) return false;

  await db
    .delete(webhooks)
    .where(
      and(
        eq(webhooks.id, webhookId),
        eq(webhooks.organizationId, organizationId)
      )
    );
  return true;
}

// ── Event Delivery ──────────────────────────────────────────────────────────

export interface DeliverWebhookInput {
  organizationId: string;
  webhookId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export async function deliverWebhook(
  input: DeliverWebhookInput
): Promise<WebhookDelivery> {
  const webhook = await getWebhook(input.organizationId, input.webhookId);
  if (!webhook || webhook.status !== "active") {
    const fallback: WebhookDelivery = {
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      webhookId: input.webhookId,
      eventType: input.eventType,
      payload: input.payload,
      status: "failed",
      attempts: 0,
      errorMessage: "Webhook is not active",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
    return fallback;
  }

  const [delivery] = await db
    .insert(webhookDeliveries)
    .values({
      organizationId: input.organizationId,
      webhookId: input.webhookId,
      eventType: input.eventType,
      payload: input.payload,
      status: "pending",
      attempts: 0,
    })
    .returning();

  // Enqueue delivery attempt (fire-and-forget)
  attemptDelivery(delivery.id, webhook).catch(console.error);

  return delivery;
}

async function attemptDelivery(
  deliveryId: string,
  webhook: Webhook
): Promise<void> {
  const delivery = await db.query.webhookDeliveries.findFirst({
    where: eq(webhookDeliveries.id, deliveryId),
  });
  if (!delivery) return;

  const payload = JSON.stringify({
    id: delivery.id,
    event: delivery.eventType,
    data: delivery.payload,
    timestamp: new Date().toISOString(),
  });

  const signature = computeWebhookSignature(payload, webhook.secret);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-KaziFlow-Signature": signature,
        "X-KaziFlow-Event": delivery.eventType,
        "X-KaziFlow-Delivery": delivery.id,
        ...webhook.headers,
      },
      body: payload,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const responseBody = await response.text();

    if (response.ok) {
      await db
        .update(webhookDeliveries)
        .set({
          status: "delivered",
          statusCode: response.status,
          responseBody: responseBody.slice(0, 4096),
          attempts: delivery.attempts + 1,
          updatedAt: new Date(),
        })
        .where(eq(webhookDeliveries.id, deliveryId));
    } else {
      await handleFailedDelivery(deliveryId, delivery, response.status, responseBody);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await handleFailedDelivery(deliveryId, delivery, null, message);
  }
}

async function handleFailedDelivery(
  deliveryId: string,
  delivery: WebhookDelivery,
  statusCode: number | null,
  errorBody: string | null
): Promise<void> {
  const nextAttempt = delivery.attempts + 1;

  if (nextAttempt >= MAX_DELIVERY_ATTEMPTS) {
    await db
      .update(webhookDeliveries)
      .set({
        status: "failed",
        statusCode,
        responseBody: errorBody?.slice(0, 4096) || null,
        attempts: nextAttempt,
        errorMessage: "Max delivery attempts exceeded",
        updatedAt: new Date(),
      })
      .where(eq(webhookDeliveries.id, deliveryId));
    return;
  }

  const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, nextAttempt - 1);
  const nextAttemptAt = new Date(Date.now() + delay);

  await db
    .update(webhookDeliveries)
    .set({
      status: "retrying",
      statusCode,
      responseBody: errorBody?.slice(0, 4096) || null,
      attempts: nextAttempt,
      nextAttemptAt,
      errorMessage: `Delivery attempt ${nextAttempt} failed. Retrying.`,
      updatedAt: new Date(),
    })
    .where(eq(webhookDeliveries.id, deliveryId));

  // Schedule retry
  setTimeout(() => {
    db.query.webhookDeliveries.findFirst({
      where: eq(webhookDeliveries.id, deliveryId),
      with: { webhook: true },
    }).then((record) => {
      const webhook = record?.webhook as unknown as Webhook | undefined;
      if (webhook) {
        attemptDelivery(deliveryId, webhook).catch(console.error);
      }
    });
  }, delay);
}

// ── Delivery Queries ─────────────────────────────────────────────────────────

export async function listWebhookDeliveries(
  organizationId: string,
  webhookId?: string,
  status?: string,
  limit = 50
): Promise<WebhookDelivery[]> {
  const conditions = [eq(webhookDeliveries.organizationId, organizationId)];
  if (webhookId) conditions.push(eq(webhookDeliveries.webhookId, webhookId));
  if (status) conditions.push(eq(webhookDeliveries.status, status as any));

  return db.query.webhookDeliveries.findMany({
    where: and(...conditions),
    orderBy: (d) => [desc(d.createdAt)],
    limit,
  });
}

export async function retryWebhookDelivery(
  organizationId: string,
  deliveryId: string
): Promise<WebhookDelivery | null> {
  const delivery = await db.query.webhookDeliveries.findFirst({
    where: and(
      eq(webhookDeliveries.id, deliveryId),
      eq(webhookDeliveries.organizationId, organizationId)
    ),
    with: { webhook: true },
  });

  const webhook = delivery?.webhook as unknown as Webhook | undefined;
  if (!delivery || !webhook) return null;

  await db
    .update(webhookDeliveries)
    .set({
      status: "pending",
      attempts: 0,
      nextAttemptAt: null,
      errorMessage: null,
      updatedAt: new Date(),
    })
    .where(eq(webhookDeliveries.id, deliveryId));

  attemptDelivery(deliveryId, webhook).catch(console.error);
  return delivery;
}
