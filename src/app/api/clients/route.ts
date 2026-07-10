import { NextResponse } from "next/server";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { clientSchema } from "@/lib/validations";
import { eq, desc, and, count } from "drizzle-orm";
import { PLAN_LIMITS, type PlanType } from "@/lib/utils";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "clients.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const rows = await db.query.clients.findMany({
    where: eq(clients.organizationId, ctx.organizationId),
    orderBy: (clients, { desc }) => [desc(clients.createdAt)],
  });

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "clients.create");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const parsed = clientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const plan = (ctx.organization.plan || "free") as PlanType;
    const limits = PLAN_LIMITS[plan];

    if (limits.clients !== Infinity) {
      const [result] = await db
        .select({ count: count() })
        .from(clients)
        .where(eq(clients.organizationId, ctx.organizationId));

      if (result.count >= limits.clients) {
        return NextResponse.json(
          { error: `Free plan limit reached (${limits.clients} clients). Upgrade to Pro.` },
          { status: 403 }
        );
      }
    }

    const [client] = await db
      .insert(clients)
      .values({
        organizationId: ctx.organizationId,
        userId: ctx.userId!,
        ...parsed.data,
        email: parsed.data.email || null,
      })
      .returning();

    await logAuditSafe(ctx, {
      action: "client.create",
      category: "clients",
      resourceType: "client",
      resourceId: client.id,
      description: `Created client ${client.name}`,
      newValues: { name: client.name, email: client.email },
    });

    await createNotification({
      organizationId: ctx.organizationId,
      category: "organization",
      type: "client_added",
      title: "Client added",
      message: `Client ${client.name} was added.`,
      deepLink: "/dashboard/clients",
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("Create client error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
