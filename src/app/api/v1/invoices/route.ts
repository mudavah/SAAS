import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, invoiceItems } from "@/db/schema";
import { invoiceSchema } from "@/lib/validations";
import { eq, desc } from "drizzle-orm";
import {
  handleApi,
  type ServerContext,
} from "@/lib/session";
import { generateInvoiceNumber, getCurrentMonth, PLAN_LIMITS } from "@/lib/utils";
import { API_CORS_HEADERS, corsResponse } from "@/lib/api/cors";

export async function OPTIONS() {
  return corsResponse(null, 204);
}

export async function GET(req: Request) {
  return handleApi(req, "invoices.view", async (ctx: ServerContext) => {
    const rows = await db.query.invoices.findMany({
      where: eq(invoices.organizationId, ctx.organizationId),
      orderBy: (invoices, { desc }) => [desc(invoices.createdAt)],
      with: { client: true, items: true },
      limit: 100,
    });
    return NextResponse.json({ invoices: rows }, { headers: API_CORS_HEADERS });
  });
}

export async function POST(req: Request) {
  return handleApi(req, "invoices.create", async (ctx: ServerContext) => {
    try {
      const body = await req.json();
      const parsed = invoiceSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.errors[0].message },
          { status: 400, headers: API_CORS_HEADERS }
        );
      }

      const plan = (ctx.organization.plan || "free") as keyof typeof PLAN_LIMITS;
      const limits = PLAN_LIMITS[plan];
      if (limits.invoicesPerMonth !== Infinity) {
        const month = getCurrentMonth();
        const count = await db.$count(
          invoices,
          eq(invoices.organizationId, ctx.organizationId)
        );
        if (count >= limits.invoicesPerMonth) {
          return NextResponse.json(
            { error: "Plan invoice limit reached." },
            { status: 403, headers: API_CORS_HEADERS }
          );
        }
      }

      const { items, ...invoiceData } = parsed.data;
      const subtotal = items.reduce(
        (s, i) => s + i.quantity * i.unitPrice,
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

      return NextResponse.json(
        { invoice },
        { status: 201, headers: API_CORS_HEADERS }
      );
    } catch (error) {
      console.error("API create invoice error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: API_CORS_HEADERS }
      );
    }
  });
}
