import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, invoiceItems, clients, usageRecords } from "@/db/schema";
import { invoiceSchema } from "@/lib/validations";
import { eq, and, desc } from "drizzle-orm";
import {
  generateInvoiceNumber,
  getCurrentMonth,
  PLAN_LIMITS,
  type PlanType,
} from "@/lib/utils";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "invoices.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const rows = await db.query.invoices.findMany({
    where: eq(invoices.organizationId, ctx.organizationId),
    orderBy: (invoices, { desc }) => [desc(invoices.createdAt)],
    with: { client: true, items: true },
  });

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "invoices.create");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const parsed = invoiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const plan = (ctx.organization.plan || "free") as PlanType;
    const limits = PLAN_LIMITS[plan];

    if (limits.invoicesPerMonth !== Infinity) {
      const month = getCurrentMonth();
      const usage = await db.query.usageRecords.findFirst({
        where: and(
          eq(usageRecords.organizationId, ctx.organizationId),
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
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
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

    const month = getCurrentMonth();
    const existingUsage = await db.query.usageRecords.findFirst({
      where: and(
        eq(usageRecords.organizationId, ctx.organizationId),
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
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        month,
        invoicesCreated: 1,
      });
    }

    await logAuditSafe(ctx, {
      action: "invoice.create",
      category: "invoices",
      resourceType: "invoice",
      resourceId: invoice.id,
      description: `Created invoice ${invoice.invoiceNumber}`,
      newValues: { invoiceNumber: invoice.invoiceNumber, total: invoice.total },
    });

    await createNotification({
      organizationId: ctx.organizationId,
      category: "invoices",
      type: "invoice_created",
      title: "Invoice created",
      message: `Invoice ${invoice.invoiceNumber} was created${body.send ? " and sent" : ""}.`,
      priority: "normal",
      deepLink: `/dashboard/invoices/${invoice.id}`,
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Create invoice error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
