import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { getOffboardingRecords, createOffboardingRecord } from "@/lib/hr/service";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "hr.offboarding.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const records = await getOffboardingRecords(ctx.organizationId);
  return NextResponse.json(records);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "hr.offboarding.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const result = await createOffboardingRecord(ctx, body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.record, { status: result.status });
  } catch (error) {
    console.error("Create offboarding record error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
