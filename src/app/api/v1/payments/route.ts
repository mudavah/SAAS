import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { handleApi, type ServerContext } from "@/lib/session";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/logger";

export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function GET(req: Request) {
  return handleApi(req, "payments.view", async (ctx: ServerContext) => {
    const rows = await db.query.payments.findMany({
      where: eq(payments.organizationId, ctx.organizationId),
      orderBy: (payments, { desc }) => [desc(payments.createdAt)],
      limit: 100,
    });
    return NextResponse.json({ data: rows }, { headers: getCorsHeaders(req) });
  });
}

export async function POST(req: Request) {
  return handleApi(req, "payments.create", async (ctx: ServerContext) => {
    try {
      const body = await req.json();
      if (body.amount === undefined || !body.method) {
        return NextResponse.json(
          { error: "amount and method are required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      const [item] = await db
        .insert(payments)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.userId!,
          invoiceId: body.invoiceId || null,
          clientId: body.clientId || null,
          amount: String(body.amount),
          currency: body.currency || "KES",
          method: body.method,
          status: body.status || "pending",
          reference: body.reference || null,
          notes: body.notes || null,
          paidAt: body.paidAt ? new Date(body.paidAt) : null,
        })
        .returning();
      return NextResponse.json(
        { data: item },
        { status: 201, headers: getCorsHeaders(req) }
      );
    } catch (error) {
      logger.error("API create payment error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}

export async function DELETE(req: Request) {
  return handleApi(req, "payments.create", async (ctx: ServerContext) => {
    try {
      const id = new URL(req.url).searchParams.get("id");
      if (!id) {
        return NextResponse.json(
          { error: "id is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      await db
        .delete(payments)
        .where(
          and(
            eq(payments.id, id),
            eq(payments.organizationId, ctx.organizationId)
          )
        );
      return NextResponse.json(
        { data: { id } },
        { headers: getCorsHeaders(req) }
      );
    } catch (error) {
      logger.error("API delete payment error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}
