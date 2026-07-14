import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { getEnterpriseOverview } from "@/lib/enterprise/branch-management";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "enterprise.reports.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const data = await getEnterpriseOverview(ctx.organizationId);
  return NextResponse.json(data);
}
