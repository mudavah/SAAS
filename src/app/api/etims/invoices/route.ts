import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { etimsInvoices, invoices, etimsConfig } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const etimsRecords = await db.query.etimsInvoices.findMany({
    where: eq(etimsInvoices.userId, session.user.id),
    orderBy: (records) => [desc(records.createdAt)],
    with: {
      invoice: {
        with: {
          client: true,
        },
      },
    },
  });

  return NextResponse.json(etimsRecords);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { invoiceId } = body;

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 }
      );
    }

    const invoice = await db.query.invoices.findFirst({
      where: and(eq(invoices.id, invoiceId), eq(invoices.userId, session.user.id)),
      with: { client: true, items: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const config = await db.query.etimsConfig.findFirst({
      where: eq(etimsConfig.userId, session.user.id),
    });

    if (!config || !config.isActive) {
      return NextResponse.json(
        { error: "eTIMS is not configured or active" },
        { status: 503 }
      );
    }

    const mockResponse = {
      invoiceNumber: `ETIMS-${Date.now()}`,
      status: "validated",
      message: "Invoice submitted successfully to KRA",
    };

    const [etimsRecord] = await db
      .insert(etimsInvoices)
      .values({
        userId: session.user.id,
        invoiceId: invoice.id,
        etimsInvoiceNumber: mockResponse.invoiceNumber,
        status: "validated",
        submissionResponse: mockResponse,
        submittedAt: new Date(),
      })
      .returning();

    return NextResponse.json(etimsRecord, { status: 201 });
  } catch (error) {
    console.error("Submit to eTIMS error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
