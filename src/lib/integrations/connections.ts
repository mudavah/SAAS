/**
 * KaziFlow — Integration Hub connections service
 * ------------------------------------------------------------------
 * Connect/disconnect/update integration connections, with secret encryption,
 * RBAC gating, audit logging, timeline emissions, and non-breaking bridges to
 * the existing payment engine (payment_provider_configs) and eTIMS/compliance.
 */
import { db } from "@/db";
import {
  integrations,
  integrationOauthTokens,
  paymentProviderConfigs,
  type Integration,
} from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import type { ServerContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { emitTimelineEvent } from "@/lib/timeline";
import { getCatalogEntry, isKnownProvider } from "./catalog";
import {
  IntegrationError,
  requirePermission,
  notFound,
  encryptIntegrationSecrets,
  decryptIntegrationSecrets,
} from "./core";
import { getAdapter } from "./adapters";
import type { ConnectionView } from "./adapters/types";

const PAYMENT_PROVIDERS = ["mpesa", "pesapal", "flutterwave", "stripe"];

export interface ConnectInput {
  provider: string;
  name: string;
  config?: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  enabled?: boolean;
  environment?: string;
  authType?: string;
  linkedConfigId?: string;
  metadata?: Record<string, unknown>;
}

export interface ConnectionSummary extends Integration {
  catalog?: ReturnType<typeof getCatalogEntry>;
}

export async function listIntegrations(
  ctx: ServerContext,
  opts: { category?: string; status?: string } = {}
): Promise<ConnectionSummary[]> {
  requirePermission(ctx, "integrations.view");
  const conditions = [eq(integrations.organizationId, ctx.organizationId)];
  if (opts.category) conditions.push(eq(integrations.category, opts.category as any));
  if (opts.status) conditions.push(eq(integrations.status, opts.status as any));

  const rows = await db.query.integrations.findMany({
    where: and(...conditions),
    orderBy: [desc(integrations.createdAt)],
  });
  return rows.map((r) => ({ ...r, catalog: getCatalogEntry(r.provider) }));
}

export async function getIntegration(
  ctx: ServerContext,
  id: string
): Promise<ConnectionSummary> {
  requirePermission(ctx, "integrations.view");
  const row = await db.query.integrations.findFirst({
    where: and(
      eq(integrations.id, id),
      eq(integrations.organizationId, ctx.organizationId)
    ),
  });
  if (!row) notFound("Integration not found");
  return { ...row, catalog: getCatalogEntry(row.provider) };
}

/** Returns a decrypted, adapter-ready view of a connection. */
export async function toConnectionView(
  row: Integration
): Promise<ConnectionView> {
  const { config, credentials } = decryptIntegrationSecrets(
    row.provider,
    row.config,
    row.credentials
  );
  const token = await db.query.integrationOauthTokens.findFirst({
    where: eq(integrationOauthTokens.integrationId, row.id),
  });
  return {
    integrationId: row.id,
    provider: row.provider,
    organizationId: row.organizationId,
    category: row.category,
    enabled: row.enabled,
    config,
    credentials,
    hasToken: !!token,
  };
}

export async function connectIntegration(
  ctx: ServerContext,
  input: ConnectInput
): Promise<Integration> {
  requirePermission(ctx, "integrations.manage");
  if (!ctx.userId) throw new IntegrationError("Missing user context", 401);

  const entry = getCatalogEntry(input.provider);
  if (!entry || !isKnownProvider(input.provider)) {
    throw new IntegrationError(`Unknown provider: ${input.provider}`, 400);
  }
  if (!input.name || !input.name.trim()) {
    throw new IntegrationError("Connection name is required", 400);
  }

  const { config, credentials } = encryptIntegrationSecrets(
    input.provider,
    input.config || {},
    input.credentials || {}
  );

  const [row] = await db
    .insert(integrations)
    .values({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      category: entry.category,
      provider: input.provider,
      name: input.name.trim(),
      authType: (input.authType as any) || entry.authType,
      status: "pending",
      enabled: input.enabled ?? true,
      environment: input.environment || "production",
      config,
      credentials,
      linkedConfigId: input.linkedConfigId || null,
      metadata: input.metadata || {},
    })
    .returning();

  // Bridge payment providers into the existing payment engine so POS/invoicing
  // continue to work unchanged.
  if (PAYMENT_PROVIDERS.includes(input.provider)) {
    await bridgePaymentProvider(ctx, row, credentials, input.config || {});
  }

  await logAuditSafe(ctx, {
    action: "integration.connect",
    category: "integrations",
    resourceType: "integration",
    resourceId: row.id,
    description: `Connected ${entry.name} (${row.name})`,
    newValues: { provider: row.provider, name: row.name },
  });
  await emitTimelineEvent({
    userId: ctx.userId,
    organizationId: ctx.organizationId,
    eventType: "integration.connected",
    title: `Connected ${entry.name}`,
    description: `${entry.name} (${row.name}) was connected to your organization.`,
    resourceType: "integration",
    resourceId: row.id,
    metadata: { provider: row.provider },
  });

  return row;
}

export async function updateIntegration(
  ctx: ServerContext,
  id: string,
  patch: {
    name?: string;
    config?: Record<string, unknown>;
    credentials?: Record<string, unknown>;
    enabled?: boolean;
    environment?: string;
    linkedConfigId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<Integration> {
  requirePermission(ctx, "integrations.manage");
  const existing = await db.query.integrations.findFirst({
    where: and(
      eq(integrations.id, id),
      eq(integrations.organizationId, ctx.organizationId)
    ),
  });
  if (!existing) notFound("Integration not found");

  const nextConfig = patch.config ? { ...existing.config, ...patch.config } : (existing.config ?? {});
  const nextCreds = patch.credentials
    ? { ...existing.credentials, ...patch.credentials }
    : (existing.credentials ?? {});
  const { config, credentials } = encryptIntegrationSecrets(
    existing.provider,
    nextConfig,
    nextCreds
  );

  const [row] = await db
    .update(integrations)
    .set({
      name: patch.name ?? existing.name,
      config,
      credentials,
      enabled: patch.enabled ?? existing.enabled,
      environment: patch.environment ?? existing.environment,
      linkedConfigId: patch.linkedConfigId !== undefined ? patch.linkedConfigId : existing.linkedConfigId,
      metadata: patch.metadata ? { ...existing.metadata, ...patch.metadata } : existing.metadata,
      status: "pending",
      updatedAt: new Date(),
    })
    .where(eq(integrations.id, id))
    .returning();

  if (PAYMENT_PROVIDERS.includes(existing.provider)) {
    await bridgePaymentProvider(ctx, row, credentials, nextConfig);
  }

  await logAuditSafe(ctx, {
    action: "integration.update",
    category: "integrations",
    resourceType: "integration",
    resourceId: id,
    description: `Updated ${existing.provider} (${existing.name})`,
  });
  await emitTimelineEvent({
    userId: ctx.userId ?? null,
    organizationId: ctx.organizationId,
    eventType: "integration.updated",
    title: `Updated ${existing.provider}`,
    description: `Integration ${existing.name} was updated.`,
    resourceType: "integration",
    resourceId: id,
  });

  return row;
}

export async function disconnectIntegration(
  ctx: ServerContext,
  id: string
): Promise<void> {
  requirePermission(ctx, "integrations.manage");
  const existing = await db.query.integrations.findFirst({
    where: and(
      eq(integrations.id, id),
      eq(integrations.organizationId, ctx.organizationId)
    ),
  });
  if (!existing) notFound("Integration not found");

  await db
    .update(integrations)
    .set({ status: "disconnected", enabled: false, updatedAt: new Date() })
    .where(eq(integrations.id, id));

  // Soft-disable the bridged payment config.
  if (PAYMENT_PROVIDERS.includes(existing.provider) && existing.linkedConfigId) {
    await db
      .update(paymentProviderConfigs)
      .set({ enabled: false, updatedAt: new Date() })
      .where(eq(paymentProviderConfigs.id, existing.linkedConfigId));
  }

  await logAuditSafe(ctx, {
    action: "integration.disconnect",
    category: "integrations",
    resourceType: "integration",
    resourceId: id,
    description: `Disconnected ${existing.provider} (${existing.name})`,
  });
  await emitTimelineEvent({
    userId: ctx.userId ?? null,
    organizationId: ctx.organizationId,
    eventType: "integration.disconnected",
    title: `Disconnected ${existing.provider}`,
    description: `${existing.name} was disconnected.`,
    resourceType: "integration",
    resourceId: id,
  });
}

export async function setEnabled(
  ctx: ServerContext,
  id: string,
  enabled: boolean
): Promise<Integration> {
  requirePermission(ctx, "integrations.manage");
  const existing = await db.query.integrations.findFirst({
    where: and(
      eq(integrations.id, id),
      eq(integrations.organizationId, ctx.organizationId)
    ),
  });
  if (!existing) notFound("Integration not found");
  const [row] = await db
    .update(integrations)
    .set({
      enabled,
      status: enabled ? existing.status : "disconnected",
      updatedAt: new Date(),
    })
    .where(eq(integrations.id, id))
    .returning();
  return row;
}

async function bridgePaymentProvider(
  ctx: ServerContext,
  integration: Integration,
  credentials: Record<string, unknown> | null,
  config: Record<string, unknown> | null
) {
  const provider = integration.provider;
  const existing = await db.query.paymentProviderConfigs.findFirst({
    where: and(
      eq(paymentProviderConfigs.organizationId, ctx.organizationId),
      eq(paymentProviderConfigs.provider, provider)
    ),
  });
  const values = {
    provider,
    enabled: integration.enabled,
    environment: integration.environment,
    apiKey: (credentials?.apiKey as string) ?? null,
    apiSecret: (credentials?.apiSecret as string) ?? null,
    webhookSecret: (credentials?.webhookSecret as string) ?? null,
    shortcode: (config?.shortcode as string) ?? null,
    passkey: (credentials?.passkey as string) ?? null,
    callbackUrl: (config?.callbackUrl as string) ?? null,
    merchantId: (config?.merchantId as string) ?? null,
    settings: config ?? {},
    updatedAt: new Date(),
  };
  if (existing) {
    const [updated] = await db
      .update(paymentProviderConfigs)
      .set(values)
      .where(eq(paymentProviderConfigs.id, existing.id))
      .returning();
    await db
      .update(integrations)
      .set({ linkedConfigId: existing.id, updatedAt: new Date() })
      .where(eq(integrations.id, integration.id));
    return updated;
  }
  const [created] = await db
    .insert(paymentProviderConfigs)
    .values({ organizationId: ctx.organizationId, ...values })
    .returning();
  await db
    .update(integrations)
    .set({ linkedConfigId: created.id, updatedAt: new Date() })
    .where(eq(integrations.id, integration.id));
  return created;
}
