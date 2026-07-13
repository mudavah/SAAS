import { NextResponse } from "next/server";
import { getApiContext } from "@/lib/session";
import { ensureOnboardingSteps } from "@/lib/onboarding/service";

export async function GET(req: Request) {
  const res = await getApiContext(req);
  if ("error" in res) return res.error;

  const steps = await ensureOnboardingSteps();
  return NextResponse.json({ steps });
}
