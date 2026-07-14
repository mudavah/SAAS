import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { getPaymentExports } from "@/lib/payroll/service";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "payroll.export");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const exports = await getPaymentExports(ctx.organizationId);
  return NextResponse.json(exports);
}
