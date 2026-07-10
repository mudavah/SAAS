import { NextResponse } from "next/server";
import { db } from "@/db";
import { journalEntries, journalEntryLines } from "@/db/schema";
import { journalEntrySchema } from "@/lib/validations";
import { eq, and, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "bookkeeping.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const entries = await db.query.journalEntries.findMany({
    where: eq(journalEntries.organizationId, ctx.organizationId),
    orderBy: (entries) => [desc(entries.createdAt)],
    with: {
      lines: {
        with: {
          account: true,
        },
      },
    },
  });

  return NextResponse.json(entries);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "bookkeeping.post");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const parsed = journalEntrySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const [entry] = await db
      .insert(journalEntries)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        date: parsed.data.date,
        description: parsed.data.description,
        status: parsed.data.status,
      })
      .returning();

    const lines = parsed.data.lines.map((line) => ({
      journalEntryId: entry.id,
      accountId: line.accountId,
      debit: line.debit.toString(),
      credit: line.credit.toString(),
      description: line.description || null,
    }));

    await db.insert(journalEntryLines).values(lines);

    await logAuditSafe(ctx, {
      action: "journal_entry.create",
      category: "bookkeeping",
      resourceType: "journal_entry",
      resourceId: entry.id,
      description: `Created journal entry ${entry.id}: ${entry.description}`,
      newValues: { date: entry.date, description: entry.description },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Create journal entry error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
