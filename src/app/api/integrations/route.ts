import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import {
  listIntegrations,
  connectIntegration,
} from "@/lib/integrations";
import { publicIntegration } from "@/lib/integrations/serialize";
import { bumpMarketplaceInstall } from "@/lib/integrations/marketplace";
import { IntegrationError } from "@/lib/integrations/core";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "integrations.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const url = new URL(req.url);
  const category = url.searchParams.get("category") || undefined;
  const status = url.searchParams.get("status") || undefined;

  const rows = await listIntegrations(ctx, { category, status });
  return NextResponse.json({ data: rows.map(publicIntegration) });
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "integrations.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    if (!body.provider || !body.name) {
      return NextResponse.json(
        { error: "provider and name are required" },
        { status: 400 }
      );
    }
    const created = await connectIntegration(ctx, {
      provider: body.provider,
      name: body.name,
      config: body.config || {},
      credentials: body.credentials || {},
      enabled: body.enabled,
      environment: body.environment,
      authType: body.authType,
      metadata: body.metadata,
    });
    await logAuditSafe(ctx, {
      action: "integration.marketplace.installed",
      category: "integrations",
      resourceType: "integration",
      resourceId: created.id,
      description: `Installed ${created.provider} (${created.name}) from marketplace`,
    });
    await bumpMarketplaceInstall(created.provider).catch(() => undefined);
    return NextResponse.json({ data: publicIntegration(created) }, { status: 201 });
  } catch (error) {
    if (error instanceof IntegrationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logger.error("Connect integration error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
