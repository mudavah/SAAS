import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  clients,
  inventoryProducts,
  invoices,
  payments,
  expenses,
} from "@/db/schema";
import { eq, desc, gt, and } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "sync.pull");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const url = new URL(req.url);
    const sinceParam = url.searchParams.get("since");
    const since = sinceParam ? new Date(Number(sinceParam)) : new Date(0);

    const changes: Array<Record<string, unknown>> = [];

    const entityQueries = [
      {
        name: "clients" as const,
        query: db.query.clients.findMany({
          where: and(
            eq(clients.organizationId, ctx.organizationId),
            gt(clients.createdAt, since)
          ),
          orderBy: (clients, { desc }) => [desc(clients.createdAt)],
        }),
      },
      {
        name: "products" as const,
        query: db.query.inventoryProducts.findMany({
          where: and(
            eq(inventoryProducts.organizationId, ctx.organizationId),
            gt(inventoryProducts.createdAt, since)
          ),
          orderBy: (inventoryProducts, { desc }) => [desc(inventoryProducts.createdAt)],
        }),
      },
      {
        name: "invoices" as const,
        query: db.query.invoices.findMany({
          where: and(
            eq(invoices.organizationId, ctx.organizationId),
            gt(invoices.createdAt, since)
          ),
          orderBy: (invoices, { desc }) => [desc(invoices.createdAt)],
        }),
      },
      {
        name: "payments" as const,
        query: db.query.payments.findMany({
          where: and(
            eq(payments.organizationId, ctx.organizationId),
            gt(payments.createdAt, since)
          ),
          orderBy: (payments, { desc }) => [desc(payments.createdAt)],
        }),
      },
      {
        name: "expenses" as const,
        query: db.query.expenses.findMany({
          where: and(
            eq(expenses.organizationId, ctx.organizationId),
            gt(expenses.createdAt, since)
          ),
          orderBy: (expenses, { desc }) => [desc(expenses.createdAt)],
        }),
      },
    ];

    for (const entityQuery of entityQueries) {
      try {
        const records = await entityQuery.query;
        for (const record of records) {
          changes.push({
            ...record,
            entity: entityQuery.name,
          });
        }
      } catch (error) {
        logger.error("Error fetching ${entityQuery.name}:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      }
    }

    return NextResponse.json({
      changes,
      syncedAt: Date.now(),
      count: changes.length,
    });
  } catch (error) {
    logger.error("Sync pull error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
