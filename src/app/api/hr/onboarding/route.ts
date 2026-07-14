import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { getOnboardingChecklists, createOnboardingChecklist } from "@/lib/hr/service";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "hr.onboarding.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const url = new URL(req.url);
  const employeeId = url.searchParams.get("employeeId") || undefined;

  const checklists = await getOnboardingChecklists(ctx.organizationId, employeeId);
  return NextResponse.json(checklists);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "hr.onboarding.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const result = await createOnboardingChecklist(ctx, body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.checklist, { status: result.status });
  } catch (error) {
    console.error("Create onboarding checklist error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
