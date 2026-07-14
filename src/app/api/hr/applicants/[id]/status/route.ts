import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { updateApplicantStatus } from "@/lib/hr/service";

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const res = await requireApiContext(_req, "hr.recruitment.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await _req.json();
    const result = await updateApplicantStatus(ctx, params.id, body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.applicant);
  } catch (error) {
    console.error("Update applicant status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
