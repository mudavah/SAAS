import { NextResponse } from "next/server";
import { db } from "@/db";
import { procurementBudgets } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { handleApi, type ServerContext } from "@/lib/session";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";

export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function GET(req: Request) {
  return handleApi(req, "purchasing.budget.manage", async (ctx: ServerContext) => {
    const rows = await db.query.procurementBudgets.findMany({
      where: eq(procurementBudgets.organizationId, ctx.organizationId),
      orderBy: (procurementBudgets, { desc }) => [desc(procurementBudgets.createdAt)],
      limit: 100,
    });
    return NextResponse.json({ data: rows }, { headers: getCorsHeaders(req) });
  });
}

export async function POST(req: Request) {
  return handleApi(req, "purchasing.budget.manage", async (ctx: ServerContext) => {
    try {
      const body = await req.json();
      if (!body.name || !body.periodStart || !body.periodEnd || body.amount === undefined) {
        return NextResponse.json(
          { error: "name, periodStart, periodEnd and amount are required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      const [item] = await db
        .insert(procurementBudgets)
        .values({
          organizationId: ctx.organizationId,
          userId: ctx.userId!,
          name: body.name,
          category: body.category || null,
          period: body.period || "monthly",
          periodStart: new Date(body.periodStart),
          periodEnd: new Date(body.periodEnd),
          currency: body.currency || "KES",
          amount: String(body.amount),
          spent: body.spent || "0",
          notes: body.notes || null,
        })
        .returning();
      return NextResponse.json(
        { data: item },
        { status: 201, headers: getCorsHeaders(req) }
      );
    } catch (error) {
      console.error("API create budget error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}

export async function DELETE(req: Request) {
  return handleApi(req, "purchasing.budget.manage", async (ctx: ServerContext) => {
    try {
      const id = new URL(req.url).searchParams.get("id");
      if (!id) {
        return NextResponse.json(
          { error: "id is required" },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }
      await db
        .delete(procurementBudgets)
        .where(
          and(
            eq(procurementBudgets.id, id),
            eq(procurementBudgets.organizationId, ctx.organizationId)
          )
        );
      return NextResponse.json(
        { data: { id } },
        { headers: getCorsHeaders(req) }
      );
    } catch (error) {
      console.error("API delete budget error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}
