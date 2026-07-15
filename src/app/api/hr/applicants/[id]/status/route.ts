import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { updateApplicantStatus } from "@/lib/hr/service";
import { logger } from "@/lib/logger";

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: routeId } = await params;
  const res = await requireApiContext(_req, "hr.recruitment.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await _req.json();
    const result = await updateApplicantStatus(ctx, routeId, body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.applicant);
  } catch (error) {
    logger.error("Update applicant status error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
