import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  clients,
  products,
  invoices,
  payments,
  expenses,
} from "@/db/schema";
import { eq, desc, gt, and } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";

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
            gt(clients.updatedAt, since)
          ),
          orderBy: (clients, { desc }) => [desc(clients.updatedAt)],
        }),
      },
      {
        name: "products" as const,
        query: db.query.products.findMany({
          where: and(
            eq(products.organizationId, ctx.organizationId),
            gt(products.updatedAt, since)
          ),
          orderBy: (products, { desc }) => [desc(products.updatedAt)],
        }),
      },
      {
        name: "invoices" as const,
        query: db.query.invoices.findMany({
          where: and(
            eq(invoices.organizationId, ctx.organizationId),
            gt(invoices.updatedAt, since)
          ),
          orderBy: (invoices, { desc }) => [desc(invoices.updatedAt)],
        }),
      },
      {
        name: "payments" as const,
        query: db.query.payments.findMany({
          where: and(
            eq(payments.organizationId, ctx.organizationId),
            gt(payments.updatedAt, since)
          ),
          orderBy: (payments, { desc }) => [desc(payments.updatedAt)],
        }),
      },
      {
        name: "expenses" as const,
        query: db.query.expenses.findMany({
          where: and(
            eq(expenses.organizationId, ctx.organizationId),
            gt(expenses.updatedAt, since)
          ),
          orderBy: (expenses, { desc }) => [desc(expenses.updatedAt)],
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
        console.error(`Error fetching ${entityQuery.name}:`, error);
      }
    }

    return NextResponse.json({
      changes,
      syncedAt: Date.now(),
      count: changes.length,
    });
  } catch (error) {
    console.error("Sync pull error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
