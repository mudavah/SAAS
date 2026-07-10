import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptions, users, organizations } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "subscription.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const subs = await db.query.subscriptions.findMany({
    where: eq(subscriptions.organizationId, ctx.organizationId),
    orderBy: (subscriptions, { desc }) => [desc(subscriptions.createdAt)],
  });

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, ctx.organizationId),
    columns: { plan: true },
  });

  return NextResponse.json({ subscriptions: subs, plan: org?.plan });
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "subscription.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const { plan, provider, providerSubscriptionId } = body;

    const [subscription] = await db
      .insert(subscriptions)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        plan: plan || ctx.organization.plan,
        provider: provider || "stripe",
        providerSubscriptionId: providerSubscriptionId || null,
        status: "active",
      })
      .returning();

    await db.update(organizations).set({ plan, updatedAt: new Date() }).where(eq(organizations.id, ctx.organizationId));

    await createAuditLog({
      action: "subscription.create",
      category: "subscription",
      organizationId: ctx.organizationId,
      userId: ctx.userId!,
      resourceType: "subscription",
      resourceId: subscription.id,
      description: `Subscription created for plan ${plan}`,
      newValues: { plan, provider },
    });

    return NextResponse.json({ subscription }, { status: 201 });
  } catch (error) {
    console.error("Subscription error:", error);
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
  }
}
