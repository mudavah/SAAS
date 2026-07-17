import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { createBillingPortalSession } from "@/lib/stripe";

export async function POST(req: Request) {
  const res = await requireApiContext(req, "subscription.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const user = await db.query.users.findFirst({ where: eq(users.id, ctx.userId!) });
  if (!user?.stripeCustomerId) {
    return NextResponse.json({ error: "No Stripe customer on file." }, { status: 400 });
  }
  try {
    const session = await createBillingPortalSession(user.stripeCustomerId);
    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not open billing portal." },
      { status: 500 }
    );
  }
}
