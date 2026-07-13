import { NextResponse } from "next/server";
import { getApiContext } from "@/lib/session";
import {
  ensureOnboardingSteps,
  getOnboardingProgress,
} from "@/lib/onboarding/service";

export async function GET(req: Request) {
  const res = await getApiContext(req);
  if ("error" in res) return res.error;
  const { ctx } = res;

  const steps = await ensureOnboardingSteps();
  const progress = await getOnboardingProgress(ctx);

  return NextResponse.json({ steps, progress });
}
