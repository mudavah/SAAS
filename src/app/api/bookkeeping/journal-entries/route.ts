import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { journalEntries, journalEntryLines } from "@/db/schema";
import { journalEntrySchema } from "@/lib/validations";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await db.query.journalEntries.findMany({
    where: eq(journalEntries.userId, session.user.id),
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
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
        userId: session.user.id,
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

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Create journal entry error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
