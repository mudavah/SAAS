import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import {
  listComplianceAlerts,
  autoGenerateAlerts,
} from "@/lib/compliance/alerts";
import type { ComplianceAlertSeverity } from "@/db/schema";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "compliance.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const url = new URL(req.url);
  const resolvedParam = url.searchParams.get("resolved");
  const severity = url.searchParams.get("severity") as
    | ComplianceAlertSeverity
    | null;
  const unreadOnly = url.searchParams.get("unreadOnly") === "true";
  const regenerate = url.searchParams.get("regenerate") === "true";

  // Best-effort auto-generation of rule-based alerts on demand.
  if (regenerate && ctx.userId) {
    try {
      await autoGenerateAlerts(ctx.organizationId, ctx.userId);
    } catch (err) {
      logger.error("autoGenerateAlerts failed:", { error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined });
    }
  }

  const alerts = await listComplianceAlerts(ctx.organizationId, {
    resolved:
      resolvedParam === null ? undefined : resolvedParam === "true",
    severity: severity ?? undefined,
    unreadOnly,
  });

  return NextResponse.json(alerts);
}
