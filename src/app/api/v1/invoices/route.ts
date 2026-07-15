import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { clients, invoices, invoiceItems, usageRecords } from "@/db/schema";
import { invoiceSchema } from "@/lib/validations";
import { and, eq, desc } from "drizzle-orm";
import {
  handleApi,
  type ServerContext,
} from "@/lib/session";
import { createInvoice } from "@/lib/invoices/service";
import { getCorsHeaders, corsResponse } from "@/lib/api/cors";
import { getPagination } from "@/lib/pagination";
import { logger } from "@/lib/logger";

export async function OPTIONS(req: Request) {
  return corsResponse(null, 204, req);
}

export async function GET(req: Request) {
  return handleApi(req, "invoices.view", async (ctx: ServerContext) => {
    const url = new URL(req.url);
    const { page, limit, offset } = getPagination({
      page: Number(url.searchParams.get("page")) || undefined,
      limit: Number(url.searchParams.get("limit")) || undefined,
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
  });
}

const invoiceCreateSchema = invoiceSchema.extend({
  send: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  return handleApi(req, "invoices.create", async (ctx: ServerContext) => {
    try {
      const body = await req.json();
      const parsed = invoiceCreateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.errors[0].message },
          { status: 400, headers: getCorsHeaders(req) }
        );
      }

      const { items, send, ...invoiceData } = parsed.data;
      const result = await createInvoice(ctx, {
        ...invoiceData,
        items,
        send,
      });

      return NextResponse.json(
        { data: result.invoice },
        { status: 201, headers: getCorsHeaders(req) }
      );
    } catch (error) {
      logger.error("API create invoice error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Internal server error" },
        { status: 500, headers: getCorsHeaders(req) }
      );
    }
  });
}
