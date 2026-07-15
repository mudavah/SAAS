import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import {
  getIntegration,
  updateIntegration,
  disconnectIntegration,
} from "@/lib/integrations";
import { publicIntegration } from "@/lib/integrations/serialize";
import { IntegrationError } from "@/lib/integrations/core";
import { logger } from "@/lib/logger";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const res = await requireApiContext(req, "integrations.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  try {
    const row = await getIntegration(ctx, id);
    return NextResponse.json({ data: publicIntegration(row) });
  } catch (error) {
    if (error instanceof IntegrationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Integration not found" }, { status: 404 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const res = await requireApiContext(req, "integrations.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  try {
    const body = await req.json();
    const updated = await updateIntegration(ctx, id, {
      name: body.name,
      config: body.config,
      credentials: body.credentials,
      enabled: body.enabled,
      environment: body.environment,
    });
    return NextResponse.json({ data: publicIntegration(updated) });
  } catch (error) {
    if (error instanceof IntegrationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logger.error("Update integration error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const res = await requireApiContext(req, "integrations.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  try {
    await disconnectIntegration(ctx, id);
    await logAuditSafe(ctx, {
      action: "integration.removed",
      category: "integrations",
      resourceType: "integration",
      resourceId: id,
      description: "Integration disconnected via API",
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof IntegrationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logger.error("Disconnect integration error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
