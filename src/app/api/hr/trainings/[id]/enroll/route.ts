import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { enrollEmployeeInTraining } from "@/lib/hr/service";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: routeId } = await params;
  const res = await requireApiContext(_req, "hr.training.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await _req.json();
    const result = await enrollEmployeeInTraining(ctx, {
      ...body,
      trainingId: routeId,
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.enrollment, { status: result.status });
  } catch (error) {
    console.error("Enroll employee error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
