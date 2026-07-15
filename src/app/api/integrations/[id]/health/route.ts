import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { runHealthCheck } from "@/lib/integrations";
import { IntegrationError } from "@/lib/integrations/core";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const res = await requireApiContext(req, "integrations.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  try {
    const result = await runHealthCheck(ctx, id);
    return NextResponse.json({
      ok: result.status === "healthy",
      status: result.status,
      message: result.message,
      latencyMs: result.latencyMs,
    });
  } catch (error) {
    if (error instanceof IntegrationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Health check failed" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const res = await requireApiContext(req, "integrations.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  try {
    const result = await runHealthCheck(ctx, id);
    return NextResponse.json({
      ok: result.status === "healthy",
      status: result.status,
      message: result.message,
      latencyMs: result.latencyMs,
    });
  } catch (error) {
    if (error instanceof IntegrationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Health check failed" }, { status: 500 });
  }
}
