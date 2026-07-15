/**
 * KaziFlow — Developer Platform Event Emission
 * ------------------------------------------------------------------
 * Emits platform events to subscribed webhooks. Integrates with the
 * Business Timeline for auditability. Uses best-effort delivery so
 * that webhook failures never block the main business operation.
 */

import { db } from "@/db";
import { webhooks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { emitTimelineEvent } from "@/lib/timeline";
import { deliverWebhook } from "@/lib/api/webhooks";
import { logger } from "@/lib/logger";

export type DeveloperPlatformEventType =
  | "api.key.created"
  | "api.key.revoked"
  | "oauth.client.created"
  | "oauth.client.revoked"
  | "oauth.token.issued"
  | "oauth.token.revoked"
  | "webhook.created"
  | "webhook.updated"
  | "webhook.deleted"
  | "api.sandbox.created"
  | "api.sandbox.deleted"
  | "integration.connected"
  | "integration.disconnected";

const EVENT_TYPES: Record<DeveloperPlatformEventType, { category: string; description: string }> = {
  "api.key.created": { category: "api", description: "A new API key was created" },
  "api.key.revoked": { category: "api", description: "An API key was revoked" },
  "oauth.client.created": { category: "api", description: "A new OAuth client was registered" },
  "oauth.client.revoked": { category: "api", description: "An OAuth client was revoked" },
  "oauth.token.issued": { category: "api", description: "An OAuth access token was issued" },
  "oauth.token.revoked": { category: "api", description: "An OAuth token was revoked" },
  "webhook.created": { category: "api", description: "A new webhook subscription was created" },
  "webhook.updated": { category: "api", description: "A webhook subscription was updated" },
  "webhook.deleted": { category: "api", description: "A webhook subscription was deleted" },
  "api.sandbox.created": { category: "api", description: "A sandbox session was created" },
  "api.sandbox.deleted": { category: "api", description: "A sandbox session was deleted" },
  "integration.connected": { category: "api", description: "An integration was connected" },
  "integration.disconnected": { category: "api", description: "An integration was disconnected" },
};

export interface EmitDeveloperEventInput {
  organizationId: string;
  eventType: DeveloperPlatformEventType;
  userId?: string | null;
  metadata?: Record<string, unknown> | null;
  resourceType?: string | null;
  resourceId?: string | null;
}

export async function emitDeveloperEvent(input: EmitDeveloperEventInput): Promise<void> {
  const eventDef = EVENT_TYPES[input.eventType];
  if (!eventDef) return;

  try {
    // Emit to Business Timeline
    await emitTimelineEvent({
      organizationId: input.organizationId,
      userId: input.userId ?? null,
      eventType: input.eventType as any,
      title: eventDef.description,
      description: eventDef.description,
      metadata: input.metadata,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
    });

    // Deliver to webhooks
    const orgWebhooks = await db.query.webhooks.findMany({
      where: and(
        eq(webhooks.organizationId, input.organizationId),
        eq(webhooks.status, "active")
      ),
    });

    for (const webhook of orgWebhooks) {
      if (webhook.events.includes(input.eventType)) {
        await deliverWebhook({
          organizationId: input.organizationId,
          webhookId: webhook.id,
          eventType: input.eventType,
          payload: {
            eventType: input.eventType,
            description: eventDef.description,
            metadata: input.metadata,
            resourceType: input.resourceType,
            resourceId: input.resourceId,
            timestamp: new Date().toISOString(),
          },
        });
      }
    }
  } catch (err) {
    logger.error("emitDeveloperEvent failed:", { error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined });
  }
}
