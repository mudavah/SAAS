import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { listEnterpriseAudit } from "@/lib/enterprise/delegations";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "enterprise.audit.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const url = new URL(req.url);
  const rows = await listEnterpriseAudit(ctx, {
    category: url.searchParams.get("category") || undefined,
    action: url.searchParams.get("action") || undefined,
    resourceType: url.searchParams.get("resourceType") || undefined,
    limit: Number(url.searchParams.get("limit") || "50"),
    offset: Number(url.searchParams.get("offset") || "0"),
  });
  return NextResponse.json({ logs: rows });
}
