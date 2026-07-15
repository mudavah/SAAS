import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import {
  getIntegrationInsights,
  generateIntegrationInsights,
} from "@/lib/integrations";
import { IntegrationError } from "@/lib/integrations/core";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  const res = await requireApiContext(req, "integrations.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  try {
    const body = await req.json().catch(() => ({}));
    const recommendations = body.generate
      ? await generateIntegrationInsights(ctx)
      : await getIntegrationInsights(ctx);
    return NextResponse.json({ data: recommendations });
  } catch (error) {
    if (error instanceof IntegrationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logger.error("Integration AI error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const res = await requireApiContext(req, "integrations.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const recommendations = await getIntegrationInsights(ctx);
  return NextResponse.json({ data: recommendations });
}
