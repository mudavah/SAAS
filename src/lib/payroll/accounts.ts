/**
 * KaziFlow — Payroll / Bookkeeping integration
 * ------------------------------------------------------------------
 * Resolves (creating if necessary) the default accounts used by payroll
 * journals: Salaries & Wages (expense), PAYE Payable (liability),
 * NSSF Payable (liability), NHIF Payable (liability), Housing Levy
 * Payable (liability), Pension Payable (liability), Net Pay (bank
 * asset), and other deduction payables.
 */

import { db } from "@/db";
import {
  chartOfAccounts,
  journalEntries,
  journalEntryLines,
  accountTypeEnum,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";

export interface DefaultPayrollAccountSpec {
  code: string;
  name: string;
  type: (typeof accountTypeEnum.enumValues)[number];
}

export const DEFAULT_PAYROLL_ACCOUNTS: Record<string, DefaultPayrollAccountSpec> = {
  salariesExpense: { code: "6100", name: "Salaries & Wages Expense", type: "expense" },
  nssfPayable: { code: "2401", name: "NSSF Payable", type: "liability" },
  nhifPayable: { code: "2402", name: "NHIF Payable", type: "liability" },
  payePayable: { code: "2403", name: "PAYE Payable", type: "liability" },
  housingLevyPayable: { code: "2404", name: "Housing Levy Payable", type: "liability" },
  pensionPayable: { code: "2405", name: "Pension Payable", type: "liability" },
  otherDeductionsPayable: { code: "2406", name: "Other Deductions Payable", type: "liability" },
  bank: { code: "1100", name: "Bank", type: "asset" },
  cash: { code: "1110", name: "Cash", type: "asset" },
};

/** Find an org account by name+type, creating a sensible default if missing. */
export async function ensurePayrollAccount(
  organizationId: string,
  userId: string,
  key: keyof typeof DEFAULT_PAYROLL_ACCOUNTS
): Promise<string> {
  const spec = DEFAULT_PAYROLL_ACCOUNTS[key];
  const existing = await db.query.chartOfAccounts.findFirst({
    where: and(
      eq(chartOfAccounts.organizationId, organizationId),
      eq(chartOfAccounts.name, spec.name),
      eq(chartOfAccounts.type, spec.type)
    ),
    columns: { id: true },
  });
  if (existing) return existing.id;

  let code = spec.code;
  let suffix = 1;
  while (true) {
    const clash = await db.query.chartOfAccounts.findFirst({
      where: and(
        eq(chartOfAccounts.organizationId, organizationId),
        eq(chartOfAccounts.code, code)
      ),
      columns: { id: true },
    });
    if (!clash) break;
    code = `${spec.code}${suffix++}`;
  }

  const [created] = await db
    .insert(chartOfAccounts)
    .values({
      organizationId,
      userId,
      code,
      name: spec.name,
      type: spec.type,
      isActive: true,
    })
    .returning({ id: chartOfAccounts.id });
  return created.id;
}

export interface PayrollJournalLine {
  accountKey: keyof typeof DEFAULT_PAYROLL_ACCOUNTS;
  debit: number;
  credit: number;
  description?: string;
}

/**
 * Post a balanced payroll journal entry. Automatically resolves the needed
 * default accounts. Returns the created journal entry id.
 */
export async function postPayrollJournalEntry(params: {
  organizationId: string;
  userId: string;
  date: Date;
  description: string;
  lines: PayrollJournalLine[];
  status?: "draft" | "posted";
}): Promise<string> {
  const accountIds: Record<string, string> = {};
  for (const line of params.lines) {
    if (!accountIds[line.accountKey]) {
      accountIds[line.accountKey] = await ensurePayrollAccount(
        params.organizationId,
        params.userId,
        line.accountKey
      );
    }
  }

  const [entry] = await db
    .insert(journalEntries)
    .values({
      organizationId: params.organizationId,
      userId: params.userId,
      date: params.date,
      description: params.description,
      status: params.status ?? "posted",
    })
    .returning({ id: journalEntries.id });

  await db.insert(journalEntryLines).values(
    params.lines.map((line) => ({
      journalEntryId: entry.id,
      accountId: accountIds[line.accountKey],
      debit: line.debit.toFixed(2),
      credit: line.credit.toFixed(2),
      description: line.description ?? null,
    }))
  );

  return entry.id;
}
