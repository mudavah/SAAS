import { requireApiContext } from "@/lib/session";
import { getCorsHeaders } from "@/lib/api/cors";
import { getOpenApiResponse } from "@/lib/api/openapi";

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}

export async function GET(req: Request) {
  const res = await requireApiContext(req, "api.docs.view");
  if ("error" in res) return res.error;
  return getOpenApiResponse();
}
