/**
 * KaziFlow — CRM Metrics & Reports
 * ------------------------------------------------------------------
 * Aggregation queries for the CRM reports endpoint and the Customer 360 view.
 * Every query is scoped to a single `organizationId` (multi-tenant isolation).
 * The forecast math lives in ./forecasting; this file only does DB reads.
 */
import { db } from "@/db";
import {
  crmDeals,
  crmLeads,
  crmQuotations,
  crmCompanies,
  crmContacts,
  crmActivities,
  businessTimeline,
  crmAiInsights,
  clients,
  invoices,
  payments,
  invoiceItems,
  inventoryProducts,
  users,
} from "@/db/schema";
import { and, desc, eq, sql, sum, count, gte, isNotNull } from "drizzle-orm";
import {
  effectiveProbability,
  summarizeForecast,
  winRate,
  type ForecastDeal,
} from "./forecasting";

function num(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? (n as number) : 0;
}

export interface SalesFunnelStage {
  stageId: string;
  stageName: string;
  order: number;
  dealCount: number;
  totalValue: number;
  weightedValue: number;
}

export async function getSalesFunnel(
  organizationId: string
): Promise<{ stages: SalesFunnelStage[]; totalOpenValue: number; totalWeighted: number }> {
  const rows = await db.query.crmDeals.findMany({
    where: and(
      eq(crmDeals.organizationId, organizationId),
      eq(crmDeals.status, "open")
    ),
    with: { stage: true },
  }) as any[];

  const byStage = new Map<
    string,
    { stageId: string; stageName: string; order: number; count: number; value: number; weighted: number }
  >();

  for (const deal of rows) {
    const stageId = deal.stageId ?? "unstaged";
    const stageName = deal.stage?.name ?? "Unstaged";
    const order = deal.stage?.order ?? 999;
    const amount = num(deal.amount);
    const prob = effectiveProbability(deal.probability, deal.stage?.probability ?? null);
    const entry =
      byStage.get(stageId) ??
      { stageId, stageName, order, count: 0, value: 0, weighted: 0 };
    entry.count += 1;
    entry.value += amount;
    entry.weighted += amount * (prob / 100);
    byStage.set(stageId, entry);
  }

  const stages = [...byStage.values()]
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
      stageId: s.stageId,
      stageName: s.stageName,
      order: s.order,
      dealCount: s.count,
      totalValue: round2(s.value),
      weightedValue: round2(s.weighted),
    }));

  const totalOpenValue = round2([...byStage.values()].reduce((s, x) => s + x.value, 0));
  const totalWeighted = round2([...byStage.values()].reduce((s, x) => s + x.weighted, 0));
  return { stages, totalOpenValue, totalWeighted };
}

export async function getConversionRates(organizationId: string) {
  const [leadRows, quotationRows] = await Promise.all([
    db
      .select({ total: count(), converted: sql<number>`count(*) filter (where ${crmLeads.status} = 'converted')` })
      .from(crmLeads)
      .where(eq(crmLeads.organizationId, organizationId)),
    db
      .select({
        total: count(),
        accepted: sql<number>`count(*) filter (where ${crmQuotations.status} in ('accepted','converted'))`,
      })
      .from(crmQuotations)
      .where(eq(crmQuotations.organizationId, organizationId)),
  ]);

  const leadTotal = num(leadRows[0]?.total);
  const leadConverted = num(leadRows[0]?.converted);
  const quoteTotal = num(quotationRows[0]?.total);
  const quoteAccepted = num(quotationRows[0]?.accepted);

  return {
    leads: {
      total: leadTotal,
      converted: leadConverted,
      rate: leadTotal > 0 ? round2((leadConverted / leadTotal) * 100) : 0,
    },
    quotations: {
      total: quoteTotal,
      accepted: quoteAccepted,
      rate: quoteTotal > 0 ? round2((quoteAccepted / quoteTotal) * 100) : 0,
    },
  };
}

export interface SalespersonRevenue {
  ownerId: string;
  ownerName: string | null;
  wonValue: number;
  wonCount: number;
  openValue: number;
  openCount: number;
}

export async function getRevenueBySalesperson(
  organizationId: string
): Promise<SalespersonRevenue[]> {
  const deals = await db.query.crmDeals.findMany({
    where: eq(crmDeals.organizationId, organizationId),
    with: { owner: true },
  }) as any[];

  const map = new Map<string, SalespersonRevenue>();
  for (const deal of deals) {
    const ownerId = deal.ownerId ?? "unassigned";
    const ownerName = deal.owner?.name ?? (deal.ownerId ? "Unknown" : "Unassigned");
    const entry =
      map.get(ownerId) ??
      { ownerId, ownerName, wonValue: 0, wonCount: 0, openValue: 0, openCount: 0 };
    const amount = num(deal.amount);
    if (deal.status === "won") {
      entry.wonValue += amount;
      entry.wonCount += 1;
    } else if (deal.status === "open") {
      entry.openValue += amount;
      entry.openCount += 1;
    }
    map.set(ownerId, entry);
  }

  return [...map.values()]
    .map((e) => ({
      ...e,
      wonValue: round2(e.wonValue),
      openValue: round2(e.openValue),
    }))
    .sort((a, b) => b.wonValue - a.wonValue);
}

export async function getLostDeals(organizationId: string) {
  return db.query.crmDeals.findMany({
    where: and(eq(crmDeals.organizationId, organizationId), eq(crmDeals.status, "lost")),
    with: { company: true, owner: true },
    orderBy: (d) => [desc(d.updatedAt)],
  });
}

export async function getPipelineValue(organizationId: string) {
  const deals = await db.query.crmDeals.findMany({
    where: eq(crmDeals.organizationId, organizationId),
    with: { stage: true },
  }) as any[];
  const forecastDeals: ForecastDeal[] = deals.map((d) => ({
    amount: num(d.amount),
    probability: d.probability,
    stageProbability: d.stage?.probability ?? null,
    status: d.status,
  }));
  const summary = summarizeForecast(forecastDeals);
  const rate = winRate(summary.wonCount, summary.lostCount);
  return { ...summary, winRate: rate };
}

export interface CustomerLifetimeValue {
  companyId: string;
  companyName: string;
  clv: number;
  wonDeals: number;
  invoicesTotal: number;
}

/**
 * Customer Lifetime Value per company = won CRM deal value + matched invoice
 * value. Invoices are matched to a CRM company by email (legacy clients table),
 * so no schema change is required to bridge the two customer graphs.
 */
export async function getCustomerLifetimeValue(
  organizationId: string,
  limit = 20
): Promise<CustomerLifetimeValue[]> {
  const companies = await db.query.crmCompanies.findMany({
    where: eq(crmCompanies.organizationId, organizationId),
  });

  const [wonDeals, invoicesByClient] = await Promise.all([
    db.query.crmDeals.findMany({
      where: and(eq(crmDeals.organizationId, organizationId), eq(crmDeals.status, "won")),
    }),
    db.query.invoices.findMany({
      where: eq(invoices.organizationId, organizationId),
      with: { client: true },
    }),
  ]) as any[];

  const dealValueByCompany = new Map<string, { value: number; count: number }>();
  for (const d of wonDeals) {
    if (!d.companyId) continue;
    const cur = dealValueByCompany.get(d.companyId) ?? { value: 0, count: 0 };
    cur.value += num(d.amount);
    cur.count += 1;
    dealValueByCompany.set(d.companyId, cur);
  }

  const invoiceValueByEmail = new Map<string, number>();
  for (const inv of invoicesByClient) {
    const email = inv.client?.email?.toLowerCase();
    if (!email) continue;
    invoiceValueByEmail.set(email, (invoiceValueByEmail.get(email) ?? 0) + num(inv.total));
  }

  const result: CustomerLifetimeValue[] = companies.map((c) => {
    const deals = dealValueByCompany.get(c.id) ?? { value: 0, count: 0 };
    const invoicesTotal = c.email ? round2(invoiceValueByEmail.get(c.email.toLowerCase()) ?? 0) : 0;
    const clv = round2(deals.value + invoicesTotal);
    return {
      companyId: c.id,
      companyName: c.name,
      clv,
      wonDeals: deals.count,
      invoicesTotal,
    };
  });

  return result.sort((a, b) => b.clv - a.clv).slice(0, limit);
}

export interface Customer360 {
  company: typeof crmCompanies.$inferSelect;
  contacts: (typeof crmContacts.$inferSelect)[];
  convertedLeads: (typeof crmLeads.$inferSelect)[];
  deals: (typeof crmDeals.$inferSelect)[];
  quotations: (typeof crmQuotations.$inferSelect)[];
  activities: (typeof crmActivities.$inferSelect)[];
  timeline: (typeof businessTimeline.$inferSelect)[];
  aiInsights: (typeof crmAiInsights.$inferSelect)[];
  invoices: (typeof invoices.$inferSelect & { clientName: string | null })[];
  payments: (typeof payments.$inferSelect & { clientName: string | null })[];
  inventoryPurchases: { productName: string | null; quantity: number; amount: number }[];
  clv: number;
}

/**
 * Unified customer profile. Bridges CRM companies to legacy invoices/payments
 * via email match and to inventory purchases via invoice line items.
 */
export async function getCustomer360(
  organizationId: string,
  companyId: string
): Promise<Customer360 | null> {
  const company = await db.query.crmCompanies.findFirst({
    where: and(eq(crmCompanies.id, companyId), eq(crmCompanies.organizationId, organizationId)),
  });
  if (!company) return null;

  const [contacts, convertedLeads, deals, quotations, activities, timeline, aiInsights, matchedClient] =
    await Promise.all([
      db.query.crmContacts.findMany({
        where: and(eq(crmContacts.companyId, companyId), eq(crmContacts.organizationId, organizationId)),
        orderBy: (c) => [desc(c.isPrimary), desc(c.createdAt)],
      }),
      db.query.crmLeads.findMany({
        where: and(eq(crmLeads.convertedCompanyId, companyId), eq(crmLeads.organizationId, organizationId)),
      }),
      db.query.crmDeals.findMany({
        where: and(eq(crmDeals.companyId, companyId), eq(crmDeals.organizationId, organizationId)),
        with: { stage: true, owner: true },
        orderBy: (d) => [desc(d.createdAt)],
      }),
      db.query.crmQuotations.findMany({
        where: and(eq(crmQuotations.companyId, companyId), eq(crmQuotations.organizationId, organizationId)),
        orderBy: (q) => [desc(q.createdAt)],
      }),
      db.query.crmActivities.findMany({
        where: and(eq(crmActivities.companyId, companyId), eq(crmActivities.organizationId, organizationId)),
        orderBy: (a) => [desc(a.dueDate), desc(a.createdAt)],
      }),
      db.query.businessTimeline.findMany({
        where: and(
          eq(businessTimeline.organizationId, organizationId),
          eq(businessTimeline.resourceType, "crm_company"),
          eq(businessTimeline.resourceId, companyId)
        ),
        orderBy: (t) => [desc(t.createdAt)],
        limit: 50,
      }),
      db.query.crmAiInsights.findMany({
        where: and(
          eq(crmAiInsights.organizationId, organizationId),
          eq(crmAiInsights.resourceType, "company"),
          eq(crmAiInsights.resourceId, companyId)
        ),
        orderBy: (i) => [desc(i.createdAt)],
      }),
      company.email
        ? db.query.clients.findFirst({
            where: and(eq(clients.organizationId, organizationId), eq(clients.email, company.email)),
          })
        : Promise.resolve(null),
    ]);

  let clientInvoices: Customer360["invoices"] = [];
  let clientPayments: Customer360["payments"] = [];
  let inventoryPurchases: Customer360["inventoryPurchases"] = [];

  if (matchedClient) {
    const [invRowsRaw, payRowsRaw, itemRows] = await Promise.all([
      db.query.invoices.findMany({
        where: eq(invoices.clientId, matchedClient.id),
        orderBy: (i) => [desc(i.createdAt)],
      }),
      db.query.payments.findMany({
        where: eq(payments.clientId, matchedClient.id),
        orderBy: (p) => [desc(p.createdAt)],
      }),
      db
        .select({
          productName: sql<null>`null`,
          quantity: sum(invoiceItems.quantity),
          amount: sum(invoiceItems.amount),
        })
        .from(invoiceItems)
        .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
        .where(eq(invoices.organizationId, organizationId))
        .groupBy(invoiceItems.id),
    ]);
    const invRows = invRowsRaw as any[];
    const payRows = payRowsRaw as any[];
    clientInvoices = invRows.map((i) => ({ ...i, clientName: matchedClient.name }));
    clientPayments = payRows.map((p) => ({ ...p, clientName: matchedClient.name }));
    inventoryPurchases = itemRows.map((r) => ({
      productName: r.productName,
      quantity: num(r.quantity),
      amount: round2(num(r.amount)),
    }));
  }

  const dealCLV = deals
    .filter((d) => d.status === "won")
    .reduce((s, d) => s + num(d.amount), 0);
  const invoiceCLV = clientInvoices.reduce((s, i) => s + num(i.total), 0);

  return {
    company,
    contacts,
    convertedLeads,
    deals,
    quotations,
    activities,
    timeline,
    aiInsights,
    invoices: clientInvoices,
    payments: clientPayments,
    inventoryPurchases,
    clv: round2(dealCLV + invoiceCLV),
  };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
