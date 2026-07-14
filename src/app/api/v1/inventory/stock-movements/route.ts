import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventoryStockMovements } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { handleApi, type ServerContext } from "@/lib/session";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";

export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function GET(req: Request) {
  return handleApi(req, "inventory.view", async (ctx: ServerContext) => {
    const rows = await db.query.inventoryStockMovements.findMany({
      where: eq(inventoryStockMovements.organizationId, ctx.organizationId),
      orderBy: (inventoryStockMovements, { desc }) => [
        desc(inventoryStockMovements.createdAt),
      ],
      limit: 100,
    });
    return NextResponse.json({ data: rows }, { headers: getCorsHeaders(req) });
  });
}
