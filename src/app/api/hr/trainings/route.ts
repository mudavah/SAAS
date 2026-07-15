import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { getTrainings, createTraining } from "@/lib/hr/service";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "hr.training.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const trainings = await getTrainings(ctx.organizationId);
  return NextResponse.json(trainings);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "hr.training.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const result = await createTraining(ctx, body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.training, { status: result.status });
  } catch (error) {
    logger.error("Create training error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
