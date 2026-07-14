import { NextResponse } from "next/server";
import { db } from "@/db";
import { posReturns } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { handleApi, type ServerContext } from "@/lib/session";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";

export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function GET(req: Request) {
  return handleApi(req, "pos.returns", async (ctx: ServerContext) => {
    const rows = await db.query.posReturns.findMany({
      where: eq(posReturns.organizationId, ctx.organizationId),
      orderBy: (posReturns, { desc }) => [desc(posReturns.createdAt)],
      limit: 100,
    });
    return NextResponse.json({ data: rows }, { headers: getCorsHeaders(req) });
  });
}

export async function POST(req: Request) {
  return handleApi(req, "pos.returns", async (ctx: ServerContext) => {
    try {
      const body = await req.json();
      if (!body.orderId || !body.returnNumber || !body.reason) {
        return NextResponse.json(
          { error: "orderId, returnNumber and reason are required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      const [item] = await db
        .insert(posReturns)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.userId!,
          orderId: body.orderId,
          returnNumber: body.returnNumber,
          reason: body.reason,
          description: body.description || null,
          subtotal: body.subtotal || "0",
          taxAmount: body.taxAmount || "0",
          total: body.total || "0",
          refundMethod: body.refundMethod,
          refundStatus: body.refundStatus || "pending",
          refundReference: body.refundReference || null,
        })
        .returning();
      return NextResponse.json(
        { data: item },
        { status: 201, headers: getCorsHeaders(req) }
      );
    } catch (error) {
      console.error("API create pos return error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}

export async function DELETE(req: Request) {
  return handleApi(req, "pos.returns", async (ctx: ServerContext) => {
    try {
      const id = new URL(req.url).searchParams.get("id");
      if (!id) {
        return NextResponse.json(
          { error: "id is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      await db
        .delete(posReturns)
        .where(
          and(
            eq(posReturns.id, id),
            eq(posReturns.organizationId, ctx.organizationId)
          )
        );
      return NextResponse.json(
        { data: { id } },
        { headers: getCorsHeaders(req) }
      );
    } catch (error) {
      console.error("API delete pos return error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}
