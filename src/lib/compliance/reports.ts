/**
 * KaziFlow Compliance — tax report generation
 * ------------------------------------------------------------------
 * Structures VAT summary data for monthly / quarterly / annual reports from
 * issued invoices. Does not render PDFs; it produces the data the report API
 * returns and persists aggregate totals to the `tax_reports` table.
 */
import { db } from "@/db";
import { invoices, taxReports, type TaxReportType } from "@/db/schema";
import { and, eq, gte, lte, ne } from "drizzle-orm";

// Invoice statuses that represent a real (reportable) sale for VAT purposes.
const REPORTABLE_STATUSES = ["sent", "viewed", "partial", "paid", "overdue"];

export interface TaxReportPeriodInput {
  type: TaxReportType;
  periodStart: Date;
  periodEnd: Date;
}

export interface TaxReportData {
  type: TaxReportType;
  periodStart: string;
  periodEnd: string;
  currency: string;
  totals: {
    totalSales: number; // taxable value (subtotal)
    totalTax: number; // output VAT
    totalGross: number; // sales + tax
    invoiceCount: number;
  };
  monthlyBreakdown: {
    month: string; // YYYY-MM
    label: string;
    sales: number;
    tax: number;
    gross: number;
    invoiceCount: number;
  }[];
  taxRateBreakdown: {
    rate: string;
    sales: number;
    tax: number;
    invoiceCount: number;
  }[];
  statusBreakdown: { status: string; count: number; gross: number }[];
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function num(v: string | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "string" ? parseFloat(v) || 0 : v;
}

/** Standard period bounds helper for a report type anchored on a date. */
export function getPeriodBounds(
  type: TaxReportType,
  anchor: Date
): { periodStart: Date; periodEnd: Date; title: string } {
  const y = anchor.getFullYear();
  if (type === "monthly") {
    const m = anchor.getMonth();
    return {
      periodStart: new Date(y, m, 1, 0, 0, 0, 0),
      periodEnd: new Date(y, m + 1, 0, 23, 59, 59, 999),
      title: `VAT Return — ${MONTH_NAMES[m]} ${y}`,
    };
  }
  if (type === "quarterly") {
    const q = Math.floor(anchor.getMonth() / 3);
    const startMonth = q * 3;
    return {
      periodStart: new Date(y, startMonth, 1, 0, 0, 0, 0),
      periodEnd: new Date(y, startMonth + 3, 0, 23, 59, 59, 999),
      title: `Quarterly VAT Summary — Q${q + 1} ${y}`,
    };
  }
  // annual
  return {
    periodStart: new Date(y, 0, 1, 0, 0, 0, 0),
    periodEnd: new Date(y, 11, 31, 23, 59, 59, 999),
    title: `Annual VAT Summary — ${y}`,
  };
}

/** Compute a full tax report data structure from issued invoices (org-scoped). */
export async function generateTaxReportData(
  organizationId: string,
  input: TaxReportPeriodInput
): Promise<TaxReportData> {
  const rows = await db.query.invoices.findMany({
    where: and(
      eq(invoices.organizationId, organizationId),
      gte(invoices.issueDate, input.periodStart),
      lte(invoices.issueDate, input.periodEnd),
      ne(invoices.status, "draft"),
      ne(invoices.status, "cancelled")
    ),
  });

  const reportable = rows.filter((r) =>
    REPORTABLE_STATUSES.includes(r.status)
  );

  let totalSales = 0;
  let totalTax = 0;
  let totalGross = 0;
  const currency = rows[0]?.currency || "KES";

  const monthly = new Map<
    string,
    { sales: number; tax: number; gross: number; invoiceCount: number }
  >();
  const byRate = new Map<
    string,
    { sales: number; tax: number; invoiceCount: number }
  >();
  const byStatus = new Map<string, { count: number; gross: number }>();

  for (const r of reportable) {
    const sales = num(r.subtotal);
    const tax = num(r.taxAmount);
    const gross = num(r.total);
    totalSales += sales;
    totalTax += tax;
    totalGross += gross;

    const mk = monthKey(new Date(r.issueDate));
    const mBucket = monthly.get(mk) ?? {
      sales: 0,
      tax: 0,
      gross: 0,
      invoiceCount: 0,
    };
    mBucket.sales += sales;
    mBucket.tax += tax;
    mBucket.gross += gross;
    mBucket.invoiceCount += 1;
    monthly.set(mk, mBucket);

    const rate = `${num(r.taxRate)}%`;
    const rBucket = byRate.get(rate) ?? { sales: 0, tax: 0, invoiceCount: 0 };
    rBucket.sales += sales;
    rBucket.tax += tax;
    rBucket.invoiceCount += 1;
    byRate.set(rate, rBucket);
  }

  for (const r of rows) {
    const sBucket = byStatus.get(r.status) ?? { count: 0, gross: 0 };
    sBucket.count += 1;
    sBucket.gross += num(r.total);
    byStatus.set(r.status, sBucket);
  }

  const round = (n: number) => Math.round(n * 100) / 100;

  const monthlyBreakdown = Array.from(monthly.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => {
      const [yy, mm] = month.split("-");
      return {
        month,
        label: `${MONTH_NAMES[Number(mm) - 1]} ${yy}`,
        sales: round(v.sales),
        tax: round(v.tax),
        gross: round(v.gross),
        invoiceCount: v.invoiceCount,
      };
    });

  const taxRateBreakdown = Array.from(byRate.entries()).map(([rate, v]) => ({
    rate,
    sales: round(v.sales),
    tax: round(v.tax),
    invoiceCount: v.invoiceCount,
  }));

  const statusBreakdown = Array.from(byStatus.entries()).map(([status, v]) => ({
    status,
    count: v.count,
    gross: round(v.gross),
  }));

  return {
    type: input.type,
    periodStart: input.periodStart.toISOString(),
    periodEnd: input.periodEnd.toISOString(),
    currency,
    totals: {
      totalSales: round(totalSales),
      totalTax: round(totalTax),
      totalGross: round(totalGross),
      invoiceCount: reportable.length,
    },
    monthlyBreakdown,
    taxRateBreakdown,
    statusBreakdown,
  };
}

/** Generate and persist a tax report. Returns the stored row plus computed data. */
export async function createTaxReport(
  organizationId: string,
  userId: string,
  input: TaxReportPeriodInput
): Promise<{ report: typeof taxReports.$inferSelect; data: TaxReportData }> {
  const data = await generateTaxReportData(organizationId, input);

  const [report] = await db
    .insert(taxReports)
    .values({
      organizationId,
      userId,
      type: input.type,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      totalSales: String(data.totals.totalSales),
      totalTax: String(data.totals.totalTax),
      invoiceCount: data.totals.invoiceCount,
      status: "generated",
    })
    .returning();

  return { report, data };
}

/** Recompute the detail data for a stored report row. */
export async function getTaxReportData(
  organizationId: string,
  report: typeof taxReports.$inferSelect
): Promise<TaxReportData> {
  return generateTaxReportData(organizationId, {
    type: report.type,
    periodStart: new Date(report.periodStart),
    periodEnd: new Date(report.periodEnd),
  });
}
