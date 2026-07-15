import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { getApplicants, createApplicant } from "@/lib/hr/service";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "hr.recruitment.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const applicants = await getApplicants(ctx.organizationId);
  return NextResponse.json(applicants);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "hr.recruitment.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const result = await createApplicant(ctx, body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.applicant, { status: result.status });
  } catch (error) {
    logger.error("Create applicant error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
