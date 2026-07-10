import { NextResponse } from "next/server";
import { db } from "@/db";
import { paymentLinks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const link = await db.query.paymentLinks.findFirst({
    where: and(
      eq(paymentLinks.slug, id),
      eq(paymentLinks.isActive, true)
    ),
    with: { invoice: true, client: true },
  });

  if (!link) {
    return NextResponse.json({ error: "Payment link not found" }, { status: 404 });
  }

  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return NextResponse.json({ error: "Payment link has expired" }, { status: 410 });
  }

  if (link.maxUses && link.useCount >= link.maxUses) {
    return NextResponse.json({ error: "Payment link has reached maximum uses" }, { status: 410 });
  }

  const publicLink = {
    type: link.type,
    amount: link.amount,
    currency: link.currency,
    description: link.description,
    provider: link.provider,
    expiresAt: link.expiresAt,
    maxUses: link.maxUses,
    useCount: link.useCount,
    isActive: link.isActive,
    slug: link.slug,
    createdAt: link.createdAt,
  };

  return NextResponse.json(publicLink);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await requireApiContext(req, "payments.create");
  if ("error" in res) return res.error;

  await db.update(paymentLinks).set({ isActive: false }).where(eq(paymentLinks.slug, id));

  return NextResponse.json({ success: true });
}
