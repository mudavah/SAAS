import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { invoices, invoiceItems, clients, usageRecords } from "@/db/schema";
import { invoiceSchema } from "@/lib/validations";
import { eq, and } from "drizzle-orm";
import {
  generateInvoiceNumber,
  getCurrentMonth,
  PLAN_LIMITS,
  type PlanType,
} from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userInvoices = await db.query.invoices.findMany({
    where: eq(invoices.userId, session.user.id),
    orderBy: (invoices, { desc }) => [desc(invoices.createdAt)],
    with: { client: true, items: true },
  });

  return NextResponse.json(userInvoices);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = invoiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    // Check freemium limits
    const plan = (session.user.plan || "free") as PlanType;
    const limits = PLAN_LIMITS[plan];

    if (limits.invoicesPerMonth !== Infinity) {
      const month = getCurrentMonth();
      const usage = await db.query.usageRecords.findFirst({
        where: and(
          eq(usageRecords.userId, session.user.id),
          eq(usageRecords.month, month)
        ),
      });

      if (usage && usage.invoicesCreated >= limits.invoicesPerMonth) {
        return NextResponse.json(
          {
            error: `Free plan limit reached (${limits.invoicesPerMonth} invoices/month). Upgrade to Pro.`,
          },
          { status: 403 }
        );
      }
    }

    const { items, ...invoiceData } = parsed.data;

    const subtotal = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const taxAmount = subtotal * (invoiceData.taxRate / 100);
    const total = subtotal + taxAmount;

    const [invoice] = await db
      .insert(invoices)
      .values({
        userId: session.user.id,
        clientId: invoiceData.clientId || null,
        invoiceNumber: generateInvoiceNumber(),
        issueDate: invoiceData.issueDate,
        dueDate: invoiceData.dueDate,
        currency: invoiceData.currency,
        subtotal: subtotal.toFixed(2),
        taxRate: invoiceData.taxRate.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        total: total.toFixed(2),
        notes: invoiceData.notes,
        terms: invoiceData.terms,
        status: body.send ? "sent" : "draft",
        sentAt: body.send ? new Date() : null,
      })
      .returning();

    await db.insert(invoiceItems).values(
      items.map((item, index) => ({
        invoiceId: invoice.id,
        description: item.description,
        quantity: item.quantity.toFixed(2),
        unitPrice: item.unitPrice.toFixed(2),
        amount: (item.quantity * item.unitPrice).toFixed(2),
        sortOrder: index,
      }))
    );

    // Update usage
    const month = getCurrentMonth();
    const existingUsage = await db.query.usageRecords.findFirst({
      where: and(
        eq(usageRecords.userId, session.user.id),
        eq(usageRecords.month, month)
      ),
    });

    if (existingUsage) {
      await db
        .update(usageRecords)
        .set({ invoicesCreated: existingUsage.invoicesCreated + 1 })
        .where(eq(usageRecords.id, existingUsage.id));
    } else {
      await db.insert(usageRecords).values({
        userId: session.user.id,
        month,
        invoicesCreated: 1,
      });
    }

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Create invoice error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
