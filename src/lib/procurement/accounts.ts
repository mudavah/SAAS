/**
 * KaziFlow — Procurement / Bookkeeping integration
 * ------------------------------------------------------------------
 * Resolves (creating if necessary) the default accounts used by procurement
 * journals: Inventory (asset), Accounts Payable (liability), Bank/Cash (asset),
 * Input VAT (asset). This keeps the module functional even before a tenant has
 * configured a chart of accounts by hand.
 */
import { db } from "@/db";
import {
  chartOfAccounts,
  journalEntries,
  journalEntryLines,
  accountTypeEnum,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";

export interface DefaultAccountSpec {
  code: string;
  name: string;
  type: (typeof accountTypeEnum.enumValues)[number];
}

export const DEFAULT_ACCOUNTS: Record<string, DefaultAccountSpec> = {
  inventory: { code: "1400", name: "Inventory", type: "asset" },
  accountsPayable: { code: "2100", name: "Accounts Payable", type: "liability" },
  bank: { code: "1100", name: "Bank", type: "asset" },
  cash: { code: "1110", name: "Cash", type: "asset" },
  inputVat: { code: "1450", name: "Input VAT (Recoverable)", type: "asset" },
};

/** Find an org account by name+type, creating a sensible default if missing. */
export async function ensureAccount(
  organizationId: string,
  userId: string,
  key: keyof typeof DEFAULT_ACCOUNTS
): Promise<string> {
  const spec = DEFAULT_ACCOUNTS[key];
  const existing = await db.query.chartOfAccounts.findFirst({
    where: and(
      eq(chartOfAccounts.organizationId, organizationId),
      eq(chartOfAccounts.name, spec.name),
      eq(chartOfAccounts.type, spec.type)
    ),
    columns: { id: true },
  });
  if (existing) return existing.id;

  // Make the code unique within the org if needed.
  let code = spec.code;
  let suffix = 1;
  // eslint-disable-next-line no-constant-condition
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

export interface JournalLine {
  accountKey: keyof typeof DEFAULT_ACCOUNTS;
  debit: number;
  credit: number;
  description?: string;
}

/**
 * Post a balanced procurement journal entry. Automatically resolves the needed
 * default accounts. Returns the created journal entry id.
 */
export async function postProcurementJournalEntry(params: {
  organizationId: string;
  userId: string;
  date: Date;
  description: string;
  lines: JournalLine[];
  status?: "draft" | "posted";
}): Promise<string> {
  const accountIds: Record<string, string> = {};
  for (const line of params.lines) {
    if (!accountIds[line.accountKey]) {
      accountIds[line.accountKey] = await ensureAccount(
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
