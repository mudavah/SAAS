/**
 * KaziFlow — AI Business Copilot core
 * ------------------------------------------------------------------
 * Context-aware prompt engineering + OpenAI integration. Uses the existing
 * pattern (direct `fetch` to OpenAI) so we do not introduce new runtime
 * dependencies.
 */
import { db } from "@/db";
import {
  invoices,
  clients,
  payments,
  expenses,
  inventoryProducts,
  inventoryStock,
  complianceAlerts,
  usageRecords,
} from "@/db/schema";
import { and, eq, desc, sql } from "drizzle-orm";
import { getCurrentMonth } from "@/lib/utils";
import { fetchWithTimeout } from "@/lib/http";

export interface OrgContext {
  invoicesThisMonth: number;
  revenueThisMonth: string;
  outstandingInvoices: number;
  overdueInvoices: number;
  activeClients: number;
  recentPayments: number;
  lowStockProducts: number;
  recentExpenses: string;
  complianceAlerts: number;
  aiRequestsUsed: number;
  aiRequestsLimit: number;
}

export interface CopilotOptions {
  organizationId: string;
  userId: string;
  message: string;
  conversationHistory?: { role: string; content: string }[];
}

function toNum(val: unknown): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

export async function fetchOrgContext(
  organizationId: string
): Promise<OrgContext> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const month = getCurrentMonth();

  const [invMonthRes] = await Promise.all([
    db.select({ count: sql<number>`count(*)` })
      .from(invoices)
      .where(and(
        eq(invoices.organizationId, organizationId),
        sql`${invoices.createdAt} >= ${monthStart.toISOString()}`
      )),
  ]);

  return {
    invoicesThisMonth: toNum(invMonthRes[0]?.count),
    revenueThisMonth: "0",
    outstandingInvoices: 0,
    overdueInvoices: 0,
    activeClients: 0,
    recentPayments: 0,
    lowStockProducts: 0,
    recentExpenses: "0",
    complianceAlerts: 0,
    aiRequestsUsed: 0,
    aiRequestsLimit: 10,
  };
}

export function buildSystemPrompt(context: OrgContext): string {
  return `You are KaziFlow AI, a business copilot for a Kenyan SME. Be concise, actionable, and professional. Use the organization's current data when relevant.

ORGANIZATION CONTEXT (current month):
- Invoices created: ${context.invoicesThisMonth}
- Revenue received: KES ${context.revenueThisMonth}
- Outstanding invoices: ${context.outstandingInvoices}
- Overdue invoices: ${context.overdueInvoices}
- Active clients: ${context.activeClients}
- Payments received: ${context.recentPayments}
- Low-stock products: ${context.lowStockProducts}
- Expenses: KES ${context.recentExpenses}
- Open compliance alerts: ${context.complianceAlerts}
- AI requests used: ${context.aiRequestsUsed}/${context.aiRequestsLimit}

Capabilities:
- Financial Q&A: profit, revenue, expenses, cash flow
- Customer analytics: outstanding invoices, client behavior
- Inventory: reorder recommendations, stock levels
- Tax insights: VAT summaries, tax calendar
- Business health: overall score and recommendations`;
}

export async function callOpenAI(
  systemPrompt: string,
  userMessage: string,
  history: { role: string; content: string }[] = []
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return "AI is not configured. Set OPENAI_API_KEY to enable the copilot.";
  }

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-10),
    { role: "user", content: userMessage },
  ];

  const res = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages,
      max_tokens: 800,
      temperature: 0.3,
    }),
    timeoutMs: 30_000,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.choices[0]?.message?.content ?? "No response generated.";
}
