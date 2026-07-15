import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { getIntegration, toConnectionView } from "@/lib/integrations/connections";
import { getAdapter } from "@/lib/integrations/adapters";
import { IntegrationError } from "@/lib/integrations/core";
import { logger } from "@/lib/logger";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const res = await requireApiContext(req, "integrations.sync");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const integration = await getIntegration(ctx, id);
    const view = await toConnectionView(integration);
    const adapter = getAdapter(integration.provider);

    let result = { ok: false, message: "No sync implemented for this provider." };
    if (adapter?.sync) {
      const body = await req.json().catch(() => ({}));
      result = await adapter.sync(view, body);
    }

    if (result.ok) {
      await logAuditSafe(ctx, {
        action: "integration.sync.completed",
        category: "integrations",
        resourceType: "integration",
        resourceId: id,
        description: `Sync completed for ${integration.provider}`,
      });
    } else {
      await logAuditSafe(ctx, {
        action: "integration.sync.failed",
        category: "integrations",
        resourceType: "integration",
        resourceId: id,
        description: `Sync failed for ${integration.provider}: ${result.message}`,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof IntegrationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logger.error("Sync integration error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
