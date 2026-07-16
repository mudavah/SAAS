import { NextResponse } from "next/server";
import { openApiSpec } from "@/lib/openapi/spec";

/**
 * GET /api/openapi.json
 * Serves the Public API v1 OpenAPI 3.0 document. Intended for the developer
 * portal, codegen (e.g. openapi-typescript), and API marketplaces. CORS-enabled
 * so it can be fetched cross-origin by docs tooling.
 */
export async function GET(req: Request) {
  return NextResponse.json(openApiSpec, {
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}
