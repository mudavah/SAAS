import { NextResponse } from "next/server";
import { getApiContext } from "@/lib/session";
import { ensureOnboardingSteps } from "@/lib/onboarding/service";

export async function GET() {
  const res = await getApiContext();
  if ("error" in res) return res.error;

  const steps = await ensureOnboardingSteps();
  return NextResponse.json({ steps });
}
