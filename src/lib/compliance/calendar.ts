/**
 * KaziFlow Compliance — Kenya tax calendar
 * ------------------------------------------------------------------
 * Deadline math for Kenyan tax obligations. The flagship obligation is the
 * monthly VAT return, due on the 20th of the month following the tax period.
 * Helpers here are pure (no DB) so they are trivially testable; persistence is
 * handled by the calendar API route and the seed helper below.
 */
import { db } from "@/db";
import { taxCalendar } from "@/db/schema";
import { and, asc, eq, gte, lte } from "drizzle-orm";

export type TaxObligationType = "vat" | "paye" | "income_tax" | "nssf" | "nhif" | "custom";

export interface DeadlineInfo {
  type: TaxObligationType;
  title: string;
  description: string;
  dueDate: Date;
  periodLabel: string;
  daysRemaining: number;
  isOverdue: boolean;
}

/** VAT return for a given tax period (year/monthIndex 0-11) is due the 20th of
 *  the following month. Returns that due date at local midnight. */
export function getVatDeadline(year: number, monthIndex: number): Date {
  // Following month, 20th.
  const dueMonth = monthIndex + 1;
  return new Date(year, dueMonth, 20, 23, 59, 59, 0);
}

/** PAYE / NSSF / NHIF are due the 9th of the following month. */
export function getMonthlyPayrollDeadline(year: number, monthIndex: number): Date {
  return new Date(year, monthIndex + 1, 9, 23, 59, 59, 0);
}

/** The next upcoming VAT deadline relative to `from`. */
export function getNextVatDeadline(from: Date = new Date()): Date {
  const candidate = getVatDeadline(from.getFullYear(), from.getMonth());
  if (candidate.getTime() >= from.getTime()) return candidate;
  // Period rolled over; use next month's period.
  return getVatDeadline(from.getFullYear(), from.getMonth() + 1);
}

export function daysBetween(a: Date, b: Date): number {
  const ms = b.setHours(0, 0, 0, 0) - new Date(a).setHours(0, 0, 0, 0);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Compute upcoming statutory deadlines for the next N months (pure). */
export function getUpcomingDeadlines(
  from: Date = new Date(),
  months = 6
): DeadlineInfo[] {
  const out: DeadlineInfo[] = [];
  for (let i = 0; i < months; i++) {
    const period = new Date(from.getFullYear(), from.getMonth() + i, 1);
    const y = period.getFullYear();
    const m = period.getMonth();
    const periodLabel = `${MONTH_NAMES[m]} ${y}`;

    const vatDue = getVatDeadline(y, m);
    out.push({
      type: "vat",
      title: `VAT Return — ${periodLabel}`,
      description: `Monthly VAT return and payment for the ${periodLabel} tax period.`,
      dueDate: vatDue,
      periodLabel,
      daysRemaining: daysBetween(new Date(), new Date(vatDue)),
      isOverdue: vatDue.getTime() < Date.now(),
    });

    const payrollDue = getMonthlyPayrollDeadline(y, m);
    out.push({
      type: "paye",
      title: `PAYE Return — ${periodLabel}`,
      description: `Monthly PAYE, NSSF and NHIF remittance for ${periodLabel}.`,
      dueDate: payrollDue,
      periodLabel,
      daysRemaining: daysBetween(new Date(), new Date(payrollDue)),
      isOverdue: payrollDue.getTime() < Date.now(),
    });
  }
  return out
    .filter((d) => d.dueDate.getTime() >= from.getTime() - 1000 * 60 * 60 * 24 * 31)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

/** Annual income tax filing deadline: 30 June following the year of income. */
export function getAnnualIncomeTaxDeadline(yearOfIncome: number): Date {
  return new Date(yearOfIncome + 1, 5, 30, 23, 59, 59, 0);
}

export interface CalendarSeedRow {
  organizationId: string;
  title: string;
  description: string;
  dueDate: Date;
  type: string;
  recurring: boolean;
  completed: boolean;
  metadata: Record<string, unknown>;
}

/** Build the default Kenya VAT (and payroll) calendar rows for a full year. */
export function buildDefaultCalendarRows(
  organizationId: string,
  year: number
): CalendarSeedRow[] {
  const rows: CalendarSeedRow[] = [];
  for (let m = 0; m < 12; m++) {
    const periodLabel = `${MONTH_NAMES[m]} ${year}`;
    rows.push({
      organizationId,
      title: `VAT Return — ${periodLabel}`,
      description: `Monthly VAT return and payment for the ${periodLabel} tax period. Due the 20th of the following month.`,
      dueDate: getVatDeadline(year, m),
      type: "vat",
      recurring: true,
      completed: false,
      metadata: { period: periodLabel, statutory: true, source: "kra_default" },
    });
    rows.push({
      organizationId,
      title: `PAYE / NSSF / NHIF — ${periodLabel}`,
      description: `Monthly payroll statutory remittance for ${periodLabel}. Due the 9th of the following month.`,
      dueDate: getMonthlyPayrollDeadline(year, m),
      type: "paye",
      recurring: true,
      completed: false,
      metadata: { period: periodLabel, statutory: true, source: "kra_default" },
    });
  }
  rows.push({
    organizationId,
    title: `Annual Income Tax Return — ${year}`,
    description: `Annual income tax return for the ${year} year of income. Due 30 June ${year + 1}.`,
    dueDate: getAnnualIncomeTaxDeadline(year),
    type: "income_tax",
    recurring: false,
    completed: false,
    metadata: { period: String(year), statutory: true, source: "kra_default" },
  });
  return rows;
}

/**
 * Ensure the default statutory calendar exists for an organization for the
 * given year. Idempotent: only inserts rows that are not already present
 * (matched by title). Returns the number of rows created.
 */
export async function ensureDefaultCalendar(
  organizationId: string,
  year: number = new Date().getFullYear()
): Promise<number> {
  const existing = await db.query.taxCalendar.findMany({
    where: eq(taxCalendar.organizationId, organizationId),
    columns: { title: true },
  });
  const existingTitles = new Set(existing.map((e) => e.title));
  const rows = buildDefaultCalendarRows(organizationId, year).filter(
    (r) => !existingTitles.has(r.title)
  );
  if (rows.length === 0) return 0;
  await db.insert(taxCalendar).values(rows);
  return rows.length;
}

/** List calendar events for an org within an optional date window. */
export async function listCalendarEvents(
  organizationId: string,
  opts: { from?: Date; to?: Date } = {}
) {
  const conditions = [eq(taxCalendar.organizationId, organizationId)];
  if (opts.from) conditions.push(gte(taxCalendar.dueDate, opts.from));
  if (opts.to) conditions.push(lte(taxCalendar.dueDate, opts.to));
  return db.query.taxCalendar.findMany({
    where: and(...conditions),
    orderBy: (t) => [asc(t.dueDate)],
  });
}
