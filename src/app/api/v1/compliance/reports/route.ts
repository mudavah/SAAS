import { NextResponse } from "next/server";
import { db } from "@/db";
import { taxReports } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { handleApi, type ServerContext } from "@/lib/session";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";

export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function GET(req: Request) {
  return handleApi(req, "compliance.view", async (ctx: ServerContext) => {
    const rows = await db.query.taxReports.findMany({
      where: eq(taxReports.organizationId, ctx.organizationId),
      orderBy: (taxReports, { desc }) => [desc(taxReports.createdAt)],
      limit: 100,
    });
    return NextResponse.json({ data: rows }, { headers: getCorsHeaders(req) });
  });
}
