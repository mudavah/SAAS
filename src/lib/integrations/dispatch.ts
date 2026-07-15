/**
 * KaziFlow — Integration Hub dispatch (unified messaging)
 * ------------------------------------------------------------------
 * Routes sendEmail / sendSms / sendWhatsApp / sendPush to the organization's
 * active integration of that category, enqueues an integration_event, records
 * an activity log, and emits timeline events on success/failure.
 */
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import type { ServerContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { emitTimelineEvent } from "@/lib/timeline";
import { requirePermission, notFound, IntegrationError } from "./core";
import { toConnectionView } from "./connections";
import { getAdapter } from "./adapters";
import { enqueueEvent, logActivity } from "./activity";

type Channel = "email" | "sms" | "whatsapp" | "push";

const CHANNEL_CATEGORY: Record<Channel, string> = {
  email: "email",
  sms: "sms",
  whatsapp: "whatsapp",
  push: "push",
};

export interface DispatchInput {
  channel: Channel;
  to: string;
  subject?: string;
  body: string;
  template?: string;
  meta?: Record<string, unknown>;
}

export interface DispatchResult {
  ok: boolean;
  message: string;
  integrationId?: string;
  externalId?: string;
  status: "sent" | "queued" | "failed";
}

async function resolveActiveIntegration(
  ctx: ServerContext,
  channel: Channel
): Promise<{ id: string; provider: string } | null> {
  const row = await db.query.integrations.findFirst({
    where: and(
      eq(integrations.organizationId, ctx.organizationId),
      eq(integrations.category, CHANNEL_CATEGORY[channel] as any),
      eq(integrations.enabled, true)
    ),
    orderBy: [desc(integrations.healthStatus), desc(integrations.createdAt)],
  });
  return row ? { id: row.id, provider: row.provider } : null;
}

export async function dispatch(
  ctx: ServerContext,
  input: DispatchInput
): Promise<DispatchResult> {
  requirePermission(ctx, "integrations.sync");
  if (!input.to || !input.body) {
    throw new IntegrationError("Recipient and body are required", 400);
  }

  const integration = await resolveActiveIntegration(ctx, input.channel);
  if (!integration) {
    await logAuditSafe(ctx, {
      action: "integration.dispatch",
      category: "integrations",
      description: `No active ${input.channel} integration configured.`,
    });
    return {
      ok: false,
      status: "failed",
      message: `No active ${input.channel} integration is connected.`,
    };
  }

  const row = await db.query.integrations.findFirst({
    where: eq(integrations.id, integration.id),
  });
  if (!row) notFound("Integration not found");

  const view = await toConnectionView(row);
  const adapter = getAdapter(row.provider);
  const start = Date.now();

  try {
    if (!adapter || !adapter.send) {
      throw new IntegrationError("This integration does not support sending", 400);
    }
    const result = await adapter.send(view, {
      to: input.to,
      subject: input.subject,
      body: input.body,
      template: input.template,
      meta: input.meta,
    });

    await logActivity(
      ctx,
      integration.id,
      {
        action: "message.send",
        status: result.ok ? "success" : "error",
        message: result.message,
        detail: { channel: input.channel, to: input.to },
      },
      Date.now() - start
    );

    await enqueueEvent(ctx, integration.id, {
      direction: "outbound",
      type: "send",
      payload: {
        to: input.to,
        subject: input.subject,
        body: input.body,
        template: input.template,
        meta: input.meta,
      },
    });

    await emitTimelineEvent({
      userId: ctx.userId ?? null,
      organizationId: ctx.organizationId,
      eventType: result.ok ? "integration.message.sent" : "integration.message.failed",
      title: `${input.channel} ${result.ok ? "sent" : "failed"}`,
      description: result.message,
      resourceType: "integration",
      resourceId: integration.id,
    });

    return {
      ok: result.ok,
      status: result.status,
      message: result.message,
      integrationId: integration.id,
      externalId: result.externalId,
    };
  } catch (err) {
    await logActivity(ctx, integration.id, {
      action: "message.send",
      status: "error",
      message: (err as Error).message,
      detail: { channel: input.channel, to: input.to },
    });
    await emitTimelineEvent({
      userId: ctx.userId ?? null,
      organizationId: ctx.organizationId,
      eventType: "integration.message.failed",
      title: `${input.channel} failed`,
      description: (err as Error).message,
      resourceType: "integration",
      resourceId: integration.id,
    });
    return { ok: false, status: "failed", message: (err as Error).message, integrationId: integration.id };
  }
}

export const sendEmail = (ctx: ServerContext, input: Omit<DispatchInput, "channel">) =>
  dispatch(ctx, { ...input, channel: "email" });
export const sendSms = (ctx: ServerContext, input: Omit<DispatchInput, "channel">) =>
  dispatch(ctx, { ...input, channel: "sms" });
export const sendWhatsApp = (ctx: ServerContext, input: Omit<DispatchInput, "channel">) =>
  dispatch(ctx, { ...input, channel: "whatsapp" });
export const sendPush = (ctx: ServerContext, input: Omit<DispatchInput, "channel">) =>
  dispatch(ctx, { ...input, channel: "push" });
