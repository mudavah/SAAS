import { NextResponse } from "next/server";
import { db } from "@/db";
import { procurementGrns } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { handleApi, type ServerContext } from "@/lib/session";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";

export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function GET(req: Request) {
  return handleApi(req, "purchasing.grn.manage", async (ctx: ServerContext) => {
    const rows = await db.query.procurementGrns.findMany({
      where: eq(procurementGrns.organizationId, ctx.organizationId),
      orderBy: (procurementGrns, { desc }) => [desc(procurementGrns.createdAt)],
      limit: 100,
    });
    return NextResponse.json({ data: rows }, { headers: getCorsHeaders(req) });
  });
}

export async function POST(req: Request) {
  return handleApi(req, "purchasing.grn.manage", async (ctx: ServerContext) => {
    try {
      const body = await req.json();
      if (!body.grnNumber || !body.purchaseOrderId || !body.receivedDate) {
        return NextResponse.json(
          { error: "grnNumber, purchaseOrderId and receivedDate are required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      const [item] = await db
        .insert(procurementGrns)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.userId!,
          grnNumber: body.grnNumber,
          purchaseOrderId: body.purchaseOrderId,
          supplierId: body.supplierId || null,
          receivedDate: new Date(body.receivedDate),
          status: body.status || "draft",
          notes: body.notes || null,
        })
        .returning();
      return NextResponse.json(
        { data: item },
        { status: 201, headers: getCorsHeaders(req) }
      );
    } catch (error) {
      console.error("API create grn error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}

export async function DELETE(req: Request) {
  return handleApi(req, "purchasing.grn.manage", async (ctx: ServerContext) => {
    try {
      const id = new URL(req.url).searchParams.get("id");
      if (!id) {
        return NextResponse.json(
          { error: "id is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      await db
        .delete(procurementGrns)
        .where(
          and(
            eq(procurementGrns.id, id),
            eq(procurementGrns.organizationId, ctx.organizationId)
          )
        );
      return NextResponse.json(
        { data: { id } },
        { headers: getCorsHeaders(req) }
      );
    } catch (error) {
      console.error("API delete grn error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}
