import { NextResponse } from "next/server";
import { db } from "@/db";
import { paymentLinks, invoices, clients, payments } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { createPayment } from "@/lib/payments/engine";
import { requireApiContext } from "@/lib/session";

function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const random = crypto.getRandomValues(new Uint8Array(8))
    .reduce((acc, b) => acc + chars[b % chars.length], "");
  return random;
}

export async function GET(req: Request) {
  const res = await requireApiContext(req, "payments.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const links = await db.query.paymentLinks.findMany({
    where: eq(paymentLinks.organizationId, ctx.organizationId),
    orderBy: (paymentLinks, { desc }) => [desc(paymentLinks.createdAt)],
    with: { invoice: true, client: true },
  });

  return NextResponse.json({ links });
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "payments.create");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const { type, amount, description, invoiceId, clientId, provider, expiresAt, maxUses } = body;

    let slug = generateSlug();
    let exists = await db.query.paymentLinks.findFirst({
      where: eq(paymentLinks.slug, slug),
    });
    while (exists) {
      slug = generateSlug();
      exists = await db.query.paymentLinks.findFirst({
        where: eq(paymentLinks.slug, slug),
      });
    }

    const [link] = await db
      .insert(paymentLinks)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        type: type || "custom_amount",
        amount: amount || null,
        currency: "KES",
        description: description || null,
        invoiceId: invoiceId || null,
        clientId: clientId || null,
        provider: provider || "mpesa",
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxUses: maxUses || null,
        slug,
      })
      .returning();

    return NextResponse.json({ link }, { status: 201 });
  } catch (error) {
    console.error("Payment link error:", error);
    return NextResponse.json({ error: "Failed to create payment link" }, { status: 500 });
  }
}
