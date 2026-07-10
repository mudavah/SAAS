import { NextResponse } from "next/server";
import { getApiContext } from "@/lib/session";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";

// CORS preflight
export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function GET(req: Request) {
  const res = await getApiContext(req);
  if ("error" in res) return res.error;
  return NextResponse.json(
    {
      ok: true,
      service: "KaziFlow Public API",
      version: "v1",
      organization: res.ctx.organizationId,
    },
    { headers: getCorsHeaders(req) }
  );
}
