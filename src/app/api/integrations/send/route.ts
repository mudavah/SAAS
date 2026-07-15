import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { dispatch } from "@/lib/integrations";
import { IntegrationError } from "@/lib/integrations/core";

export async function POST(req: Request) {
  const res = await requireApiContext(req, "integrations.sync");
  if ("error" in res) return res.error;
  const { ctx } = res;
  try {
    const body = await req.json();
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
    console.error("Dispatch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
