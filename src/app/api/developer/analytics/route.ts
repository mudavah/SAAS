import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { getCorsHeaders } from "@/lib/api/cors";
import { getApiUsageAnalytics } from "@/lib/api/analytics";

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}

export async function GET(req: Request) {
  const res = await requireApiContext(req, "api.analytics.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const url = new URL(req.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  const apiKeyId = url.searchParams.get("apiKeyId");

  const startDate = start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = end ? new Date(end) : new Date();

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json(
      { error: "Invalid date format. Use ISO dates." },
      { status: 400, headers: getCorsHeaders(req) }
    );
  }

  const analytics = await getApiUsageAnalytics(ctx.organizationId, startDate, endDate);

  return NextResponse.json(
    { analytics, apiKeyId: apiKeyId || null },
    { headers: getCorsHeaders(req) }
  );
}
