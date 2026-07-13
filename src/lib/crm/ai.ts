/**
 * KaziFlow — AI CRM Assistant (Epic 2)
 * ------------------------------------------------------------------
 * Provides the six AI CRM capabilities required by the spec:
 *   1. Prioritize leads         (rank by score + recency)
 *   2. Predict deal success     (probability + risk factors)
 *   3. Suggest follow-ups       (overdue/open activities & stale leads)
 *   4. Summarize interactions   (condensed customer narrative)
 *   5. Recommend upsells        (based on past purchase categories)
 *   6. Identify inactive customers
 *
 * All generators are deterministic and dependency-free (easy to unit test).
 * The optional LLM layer reuses the existing OpenAI bridge from
 * `@/lib/ai/copilot` to produce natural-language narratives.
 */
import { callOpenAI, buildSystemPrompt } from "@/lib/ai/copilot";
import { scoreLead, type LeadScoringInput } from "./scoring";
import { effectiveProbability } from "./forecasting";

export type CrmAiAction =
  | "prioritize_leads"
  | "predict_deals"
  | "suggest_followups"
  | "summarize_customer"
  | "recommend_upsells"
  | "inactive_customers";

export interface RankedLead {
  id: string;
  name: string;
  score: number;
  tier: "hot" | "warm" | "cold";
  reasons: string[];
  lastActivityAt?: string | null;
}

export function rankLeads(leads: (LeadScoringInput & { id: string; firstName: string; lastName?: string | null; updatedAt?: Date | string | null })[]): RankedLead[] {
  return leads
    .map((l) => {
      const { score, reasons } = scoreLead(l);
      const tier: "hot" | "warm" | "cold" = score >= 70 ? "hot" : score >= 40 ? "warm" : "cold";
      return {
        id: l.id,
        name: `${l.firstName}${l.lastName ? ` ${l.lastName}` : ""}`.trim(),
        score,
        tier,
        reasons,
        lastActivityAt: l.updatedAt ? new Date(l.updatedAt).toISOString() : null,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export interface DealPrediction {
  id: string;
  name: string;
  amount: number;
  probability: number;
  verdict: "likely" | "uncertain" | "at_risk";
  factors: string[];
}

export function predictDeals(
  deals: {
    id: string;
    name: string;
    amount: number | string;
    probability?: number | null;
    stageProbability?: number | null;
    status: string;
    expectedCloseDate?: Date | string | null;
    updatedAt?: Date | string | null;
    activityCount?: number;
  }[]
): DealPrediction[] {
  const now = Date.now();
  return deals
    .filter((d) => d.status === "open")
    .map((d) => {
      const amt = typeof d.amount === "string" ? parseFloat(d.amount) : d.amount;
      const probability = effectiveProbability(d.probability, d.stageProbability);
      const factors: string[] = [];
      let verdict: DealPrediction["verdict"] = "uncertain";

      if (probability >= 60) verdict = "likely";
      else if (probability < 30) verdict = "at_risk";

      if (probability >= 60) factors.push("High stage probability");
      else if (probability < 30) factors.push("Low stage probability");

      if (d.expectedCloseDate) {
        const close = new Date(d.expectedCloseDate).getTime();
        const days = Math.round((close - now) / 86_400_000);
        if (days < 0) factors.push("Close date already passed");
        else if (days <= 14) factors.push(`Closing in ${days} day(s) — act now`);
        else factors.push(`Closing in ${days} days`);
      } else {
        factors.push("No expected close date set");
      }

      if (!d.activityCount || d.activityCount === 0) {
        factors.push("No logged activities — engagement unknown");
      }

      return {
        id: d.id,
        name: d.name,
        amount: Number.isFinite(amt) ? amt : 0,
        probability,
        verdict,
        factors,
      };
    })
    .sort((a, b) => b.probability - a.probability);
}

export interface FollowUpSuggestion {
  resourceType: "lead" | "activity" | "deal";
  resourceId: string;
  title: string;
  reason: string;
  dueAt?: string | null;
  priority: "low" | "medium" | "high";
}

export function suggestFollowUps(
  activities: {
    id: string;
    subject: string;
    status: string;
    dueDate?: Date | string | null;
    priority?: string;
    leadId?: string | null;
    dealId?: string | null;
  }[],
  leads: { id: string; firstName: string; lastName?: string | null; status: string; updatedAt?: Date | string | null }[],
  daysStale = 14
): FollowUpSuggestion[] {
  const suggestions: FollowUpSuggestion[] = [];
  const now = Date.now();

  for (const a of activities) {
    if (a.status !== "planned") continue;
    if (a.dueDate) {
      const due = new Date(a.dueDate).getTime();
      if (due < now) {
        suggestions.push({
          resourceType: "activity",
          resourceId: a.id,
          title: a.subject,
          reason: "Overdue follow-up",
          dueAt: new Date(a.dueDate).toISOString(),
          priority: "high",
        });
      }
    } else {
      suggestions.push({
        resourceType: "activity",
        resourceId: a.id,
        title: a.subject,
        reason: "Open follow-up with no due date",
        priority: "medium",
      });
    }
  }

  for (const l of leads) {
    if (l.status === "converted" || l.status === "lost" || l.status === "unqualified") continue;
    const updated = l.updatedAt ? new Date(l.updatedAt).getTime() : 0;
    const staleDays = updated ? Math.round((now - updated) / 86_400_000) : daysStale + 1;
    if (staleDays >= daysStale) {
      const name = `${l.firstName}${l.lastName ? ` ${l.lastName}` : ""}`.trim();
      suggestions.push({
        resourceType: "lead",
        resourceId: l.id,
        title: `Re-engage ${name}`,
        reason: `No update in ${staleDays} days`,
        priority: staleDays >= daysStale * 2 ? "high" : "medium",
      });
    }
  }

  return suggestions.sort((a, b) => (a.priority === "high" ? -1 : 1) - (b.priority === "high" ? -1 : 1));
}

export interface InactiveCustomer {
  companyId: string;
  companyName: string;
  lastTouchAt: string | null;
  daysInactive: number;
}

export function identifyInactiveCustomers(
  companies: { id: string; name: string; updatedAt?: Date | string | null }[],
  lastActivityByCompany: Record<string, string | null>,
  thresholdDays = 60
): InactiveCustomer[] {
  const now = Date.now();
  const result: InactiveCustomer[] = [];
  for (const c of companies) {
    const last = lastActivityByCompany[c.id] ?? (c.updatedAt ? new Date(c.updatedAt).toISOString() : null);
    const lastMs = last ? new Date(last).getTime() : 0;
    const days = lastMs ? Math.round((now - lastMs) / 86_400_000) : thresholdDays + 1;
    if (days >= thresholdDays) {
      result.push({
        companyId: c.id,
        companyName: c.name,
        lastTouchAt: last,
        daysInactive: days,
      });
    }
  }
  return result.sort((a, b) => b.daysInactive - a.daysInactive);
}

export function summarizeCustomer360(summary: {
  companyName: string;
  wonDeals: number;
  openDeals: number;
  wonValue: number;
  openValue: number;
  quotationCount: number;
  contactCount: number;
  lastActivityAt?: string | null;
  topProducts?: string[];
}): string {
  const parts: string[] = [];
  parts.push(`${summary.companyName} has ${summary.contactCount} contact(s).`);
  parts.push(
    `Sales: ${summary.wonDeals} won deal(s) worth ${format(summary.wonValue)} and ${summary.openDeals} open deal(s) worth ${format(summary.openValue)}.`
  );
  parts.push(`Quotations raised: ${summary.quotationCount}.`);
  if (summary.topProducts?.length) {
    parts.push(`Product interest: ${summary.topProducts.slice(0, 5).join(", ")}.`);
  }
  parts.push(
    summary.lastActivityAt
      ? `Last activity: ${new Date(summary.lastActivityAt).toLocaleDateString()}.`
      : "No recent activity recorded."
  );
  return parts.join(" ");
}

export function recommendUpsells(
  purchasedProductNames: string[],
  availableProductNames: string[]
): string[] {
  if (purchasedProductNames.length === 0) return [];
  // Simple lexical affinity: suggest products that share a token with something
  // the customer already bought but aren't already owned.
  const owned = new Set(purchasedProductNames.map((p) => p.toLowerCase()));
  const tokens = new Set(
    purchasedProductNames.flatMap((p) => p.toLowerCase().split(/[\s\-_/]+/).filter((t) => t.length > 3))
  );
  return availableProductNames
    .filter((p) => !owned.has(p.toLowerCase()))
    .map((p) => ({ name: p, score: p.toLowerCase().split(/[\s\-_/]+/).filter((t) => tokens.has(t)).length }))
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((p) => p.name);
}

/** System prompt tailored to the CRM domain for the LLM layer. */
export function buildCrmSystemPrompt(context: {
  openDeals: number;
  pipelineValue: number;
  hotLeads: number;
  overdueFollowUps: number;
}): string {
  return `${buildSystemPrompt({
    invoicesThisMonth: 0,
    revenueThisMonth: "0",
    outstandingInvoices: 0,
    overdueInvoices: 0,
    activeClients: 0,
    recentPayments: 0,
    lowStockProducts: 0,
    recentExpenses: "0",
    complianceAlerts: 0,
    aiRequestsUsed: 0,
    aiRequestsLimit: 100,
  })}\n\nYou are also the KaziFlow CRM co-pilot. Current CRM state:
- Open deals: ${context.openDeals}
- Pipeline value: KES ${format(context.pipelineValue)}
- Hot leads: ${context.hotLeads}
- Overdue follow-ups: ${context.overdueFollowUps}

Help the user prioritize leads, forecast deals, plan follow-ups and grow accounts. Be concise and concrete.`;
}

/** Optional natural-language generation via the shared OpenAI bridge. */
export async function crmCopilotReply(
  userMessage: string,
  context: Parameters<typeof buildCrmSystemPrompt>[0],
  history: { role: string; content: string }[] = []
): Promise<string> {
  return callOpenAI(buildCrmSystemPrompt(context), userMessage, history);
}

function format(n: number): string {
  return new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(n);
}
