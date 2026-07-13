import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { getComplianceHealth } from "@/lib/compliance/engine";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "compliance.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const health = await getComplianceHealth(ctx.organizationId);
  return NextResponse.json(health);
}
