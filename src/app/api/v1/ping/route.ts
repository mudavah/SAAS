import { NextResponse } from "next/server";
import { getApiContext } from "@/lib/session";
import { API_CORS_HEADERS, corsResponse } from "@/lib/api/cors";

// CORS preflight
export async function OPTIONS() {
  return corsResponse(null, 204);
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
    { headers: API_CORS_HEADERS }
  );
}
