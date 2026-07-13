import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  clients,
  products,
  invoices,
  payments,
  expenses,
  organizations,
} from "@/db/schema";
import { eq, and, desc, gt, sql } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import type { PendingOperation } from "@/lib/offline/schema";

const ENTITY_SCHEMAS: Record<string, typeof clients | typeof products | typeof invoices | typeof payments | typeof expenses> = {
  clients,
  products,
  invoices,
  payments,
  expenses,
};

export async function POST(req: Request) {
  const res = await requireApiContext(req, "sync.push");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const { operation, entity, entityId, payload, checksum }: PendingOperation = body;

    if (!operation || !entity || !entityId || !payload) {
      return NextResponse.json(
        { error: "Missing required fields: operation, entity, entityId, payload" },
        { status: 400 }
      );
    }

    const schema = ENTITY_SCHEMAS[entity];
    if (!schema) {
      return NextResponse.json(
        { error: `Unsupported entity: ${entity}` },
        { status: 400 }
      );
    }

    const existing = await db.query[entity as "clients" | "products" | "invoices" | "payments" | "expenses"].findFirst({
      where: and(
        eq((schema as { organizationId: typeof organizations.id.types.name }).organizationId, ctx.organizationId),
        eq((schema as { id: typeof clients.id.types.name }).id, entityId)
      ),
    });

    if (operation === "create" && existing) {
      return NextResponse.json(
        { error: "Record already exists", conflict: true, remote: existing },
        { status: 409 }
      );
    }

    if (operation === "update" && existing) {
      const updatedAt = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
      const payloadUpdatedAt = new Date(payload.updatedAt as string).getTime();

      if (payloadUpdatedAt < updatedAt) {
        return NextResponse.json(
          {
            error: "Version conflict: remote version is newer",
            conflict: true,
            remote: existing,
          },
          { status: 409 }
        );
      }

      await db
        .update(schema as any)
        .set({
          ...payload,
          updatedAt: new Date(),
        } as any)
        .where(
          and(
            eq((schema as { id: typeof clients.id.types.name }).id, entityId),
            eq((schema as { organizationId: typeof organizations.id.types.name }).organizationId, ctx.organizationId)
          )
        );

      return NextResponse.json({ success: true, operation: "update" });
    }

    if (operation === "delete" && existing) {
      await db.delete(schema as any).where(eq((schema as { id: typeof clients.id.types.name }).id, entityId));
      return NextResponse.json({ success: true, operation: "delete" });
    }

    if (operation === "create" && !existing) {
      const [record] = await db.insert(schema as any).values({
        ...payload,
        organizationId: ctx.organizationId,
        userId: ctx.userId,
      } as any).returning();

      return NextResponse.json({ success: true, operation: "create", record }, { status: 201 });
    }

    return NextResponse.json(
      { error: "Invalid operation or record not found" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Sync push error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
