import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { getProcurementOverview } from "@/lib/enterprise/branch-management";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "enterprise.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const data = await getProcurementOverview(ctx.organizationId);
  return NextResponse.json(data);
}
