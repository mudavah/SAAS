/**
 * KaziFlow — Natural Language Business Queries
 * ------------------------------------------------------------------
 * Answers plain-English business questions using a controlled set of safe,
 * org-scoped aggregations. For security, the model NEVER executes arbitrary
 * SQL — it maps the recognized intent to pre-approved queries and returns a
 * human-readable answer plus a transparent `plan`.
 */
import { db } from "@/db";
import {
  invoices,
  payments,
  expenses,
  clients,
  inventoryProducts,
  inventoryStock,
} from "@/db/schema";
import { and, eq, sql, gte, desc } from "drizzle-orm";
import { callOpenAI } from "./copilot";

export interface NlQueryResult {
  query: string;
  intent: string;
  entities: Record<string, unknown>;
  plan: string[];
  answer: string;
  model: string;
}

function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

async function sumPayments(orgId: string, since: Date): Promise<number> {
  const [r] = await db
    .select({ total: sql<number>`coalesce(sum(${payments.amount}),0)` })
    .from(payments)
    .where(and(eq(payments.organizationId, orgId), eq(payments.status, "completed"), gte(payments.createdAt, since)));
  return Number(r?.total ?? 0);
}

async function invoiceTotals(orgId: string) {
  const [row] = await db
    .select({
      outstanding: sql<number>`coalesce(sum(${invoices.total}),0) filter (where ${invoices.status} not in ('paid','cancelled'))`,
      overdueCount: sql<number>`count(*) filter (where ${invoices.status} = 'overdue')`,
      overdueAmount: sql<number>`coalesce(sum(${invoices.total}),0) filter (where ${invoices.status} = 'overdue')`,
    })
    .from(invoices)
    .where(eq(invoices.organizationId, orgId));
  return {
    outstanding: Number(row?.outstanding ?? 0),
    overdueCount: Number(row?.overdueCount ?? 0),
    overdueAmount: Number(row?.overdueAmount ?? 0),
  };
}

async function monthlyExpenses(orgId: string, since: Date): Promise<number> {
  const [r] = await db
    .select({ total: sql<number>`coalesce(sum(${expenses.amount}),0)` })
    .from(expenses)
    .where(and(eq(expenses.organizationId, orgId), gte(expenses.createdAt, since)));
  return Number(r?.total ?? 0);
}

async function lowStockCount(orgId: string): Promise<number> {
  const [r] = await db
    .select({ count: sql<number>`count(*)` })
    .from(inventoryStock)
    .innerJoin(inventoryProducts, eq(inventoryStock.productId, inventoryProducts.id))
    .where(and(eq(inventoryProducts.organizationId, orgId), sql`coalesce(${inventoryStock.quantity},0) <= ${inventoryProducts.reorderPoint}`));
  return Number(r?.count ?? 0);
}

async function topClients(orgId: string, limit = 5) {
  const rows = await db
    .select({
      clientId: invoices.clientId,
      total: sql<number>`coalesce(sum(${invoices.total}),0)`,
    })
    .from(invoices)
    .where(and(eq(invoices.organizationId, orgId), sql`${invoices.clientId} is not null`))
    .groupBy(invoices.clientId)
    .orderBy(desc(sql`sum(${invoices.total})`))
    .limit(limit);
  const names = new Map(
    (await db.query.clients.findMany({ where: eq(clients.organizationId, orgId) })).map((c) => [c.id, c.name])
  );
  return rows.map((r) => ({ name: names.get(r.clientId as string) ?? "Unknown", total: Number(r.total) }));
}

export async function answerBusinessQuery(organizationId: string, query: string): Promise<NlQueryResult> {
  const q = query.toLowerCase();
  const since = startOfMonth();
  const plan: string[] = [];
  let intent = "unknown";
  let answer = "";

  if (/revenue|sales|income|earned/.test(q)) {
    intent = "revenue";
    plan.push("SUM(payments.amount) WHERE status=completed AND created_at >= month_start");
    const rev = await sumPayments(organizationId, since);
    answer = `Revenue this month is KES ${rev.toLocaleString()}.`;
  } else if (/outstanding|unpaid|receivable/.test(q)) {
    intent = "outstanding";
    plan.push("SUM(invoices.total) WHERE status NOT IN (paid, cancelled)");
    const t = await invoiceTotals(organizationId);
    answer = `Outstanding invoices total KES ${t.outstanding.toLocaleString()}.`;
  } else if (/overdue/.test(q)) {
    intent = "overdue";
    plan.push("COUNT/SUM(invoices) WHERE status=overdue");
    const t = await invoiceTotals(organizationId);
    answer = `You have ${t.overdueCount} overdue invoice(s) totalling KES ${t.overdueAmount.toLocaleString()}.`;
  } else if (/expense|spend|cost/.test(q)) {
    intent = "expenses";
    plan.push("SUM(expenses.amount) WHERE created_at >= month_start");
    const e = await monthlyExpenses(organizationId, since);
    answer = `Expenses this month are KES ${e.toLocaleString()}.`;
  } else if (/top client|best client|biggest client/.test(q)) {
    intent = "top_clients";
    plan.push("GROUP BY invoices.client_id ORDER BY SUM(total) DESC LIMIT 5");
    const top = await topClients(organizationId);
    answer = top.length
      ? `Top clients: ${top.map((c) => `${c.name} (KES ${c.total.toLocaleString()})`).join(", ")}.`
      : "No invoiced clients yet.";
  } else if (/low stock|reorder|inventory level/.test(q)) {
    intent = "low_stock";
    plan.push("COUNT(inventory_stock) WHERE quantity <= reorder_point");
    const n = await lowStockCount(organizationId);
    answer = `${n} product(s) are at or below their reorder point.`;
  } else if (/cash flow|cashflow|liquidity/.test(q)) {
    intent = "cash_flow";
    plan.push("revenue - expenses for current month");
    const rev = await sumPayments(organizationId, since);
    const exp = await monthlyExpenses(organizationId, since);
    answer = `Net cash flow this month: KES ${(rev - exp).toLocaleString()} (revenue KES ${rev.toLocaleString()}, expenses KES ${exp.toLocaleString()}).`;
  } else {
    intent = "unsupported";
    answer =
      "I can answer questions about revenue, outstanding/overdue invoices, expenses, cash flow, top clients and low stock. Try: \"What is my revenue this month?\"";
  }

  // Optional LLM polish.
  let model = "rules";
  if (intent !== "unsupported" && process.env.OPENAI_API_KEY) {
    try {
      answer = await callOpenAI(
        "You are a concise business analyst. Answer in one sentence, Kenyan SME context.",
        `Question: ${query}\nFact: ${answer}`,
        []
      );
      model = "openai";
    } catch {
      /* keep rule-based answer */
    }
  }

  return {
    query,
    intent,
    entities: { organizationId },
    plan,
    answer,
    model,
  };
}
