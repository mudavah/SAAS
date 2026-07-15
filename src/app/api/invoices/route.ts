import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, invoiceItems, clients, usageRecords } from "@/db/schema";
import { invoiceSchema } from "@/lib/validations";
import { eq, and, desc } from "drizzle-orm";
import {
  generateInvoiceNumber,
  getCurrentMonth,
  PLAN_LIMITS,
  type PlanType,
} from "@/lib/utils";
import { requireApiContext } from "@/lib/session";
import { createInvoice } from "@/lib/invoices/service";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";
import { getPagination } from "@/lib/pagination";
import { logger } from "@/lib/logger";

export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function GET(req: Request) {
  const res = await requireApiContext(req, "invoices.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const { page, limit, offset } = getPagination({
    page: Number(new URL(req.url).searchParams.get("page")) || undefined,
    limit: Number(new URL(req.url).searchParams.get("limit")) || undefined,
  });

  const [rows, total] = await Promise.all([
    db.query.invoices.findMany({
      where: eq(invoices.organizationId, ctx.organizationId),
      orderBy: (invoices, { desc }) => [desc(invoices.createdAt)],
      with: { client: true, items: true },
      limit,
      offset,
    }),
    Promise.resolve(0),
  ]);

  return NextResponse.json(
    { data: rows, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } },
    { headers: getCorsHeaders(req) }
  );
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "invoices.create");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const parsed = invoiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400, headers: getCorsHeaders(req) }
      );
    }

    const { items, ...invoiceData } = parsed.data;
    const result = await createInvoice(ctx, {
      ...invoiceData,
      items,
      send: (body as { send?: boolean }).send,
    });

    return NextResponse.json({ data: result.invoice }, { status: 201, headers: getCorsHeaders(req) });
  } catch (error) {
    logger.error("Create invoice error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500, headers: getCorsHeaders(req) }
    );
  }
}
