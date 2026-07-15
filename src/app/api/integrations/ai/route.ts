import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import {
  getIntegrationInsights,
  generateIntegrationInsights,
} from "@/lib/integrations";
import { IntegrationError } from "@/lib/integrations/core";

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
    console.error("Integration AI error:", error);
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
