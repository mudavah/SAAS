import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { dispatch } from "@/lib/integrations";
import { IntegrationError } from "@/lib/integrations/core";
import { logger } from "@/lib/logger";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const res = await requireApiContext(req, "integrations.sync");
  if ("error" in res) return res.error;
  const { ctx } = res;
  try {
    const body = await req.json();
    // The dispatch service resolves the active integration of the channel
    // category; here we scope the send to this specific integration by checking
    // ownership before delegating.
    const { getIntegration } = await import("@/lib/integrations");
    const integration = await getIntegration(ctx, id);
    if (integration.category !== body.channel) {
      return NextResponse.json(
        { error: `Integration is not a ${body.channel} channel` },
        { status: 400 }
      );
    }
    const result = await dispatch(ctx, {
      channel: body.channel,
      to: body.to,
      subject: body.subject,
      body: body.body,
      template: body.template,
      meta: body.meta,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof IntegrationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logger.error("Send integration error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
