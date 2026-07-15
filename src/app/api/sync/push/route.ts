import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  clients,
  inventoryProducts,
  invoices,
  payments,
  expenses,
} from "@/db/schema";
import { eq, and, desc, gt, sql } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import type { PendingOperation } from "@/lib/offline/schema";
import { logger } from "@/lib/logger";

const ENTITY_SCHEMAS: Record<string, typeof clients | typeof inventoryProducts | typeof invoices | typeof payments | typeof expenses> = {
  clients,
  products: inventoryProducts,
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

    let existing: Record<string, unknown> | undefined | null = null;
    if (entity === "clients") {
      existing = await db.query.clients.findFirst({
        where: and(eq(clients.organizationId, ctx.organizationId), eq(clients.id, entityId)),
      });
    } else if (entity === "products") {
      existing = await db.query.inventoryProducts.findFirst({
        where: and(eq(inventoryProducts.organizationId, ctx.organizationId), eq(inventoryProducts.id, entityId)),
      });
    } else if (entity === "invoices") {
      existing = await db.query.invoices.findFirst({
        where: and(eq(invoices.organizationId, ctx.organizationId), eq(invoices.id, entityId)),
      });
    } else if (entity === "payments") {
      existing = await db.query.payments.findFirst({
        where: and(eq(payments.organizationId, ctx.organizationId), eq(payments.id, entityId)),
      });
    } else if (entity === "expenses") {
      existing = await db.query.expenses.findFirst({
        where: and(eq(expenses.organizationId, ctx.organizationId), eq(expenses.id, entityId)),
      });
    }

    if (operation === "create" && existing) {
      return NextResponse.json(
        { error: "Record already exists", conflict: true, remote: existing },
        { status: 409 }
      );
    }

    if (operation === "update" && existing) {
      const updatedAt = (existing as any).updatedAt ? new Date((existing as any).updatedAt).getTime() : 0;
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

      if (entity === "clients") {
        await db.update(clients).set({ ...payload, updatedAt: new Date() } as any).where(and(eq(clients.id, entityId), eq(clients.organizationId, ctx.organizationId)));
      } else if (entity === "products") {
        await db.update(inventoryProducts).set({ ...payload, updatedAt: new Date() } as any).where(and(eq(inventoryProducts.id, entityId), eq(inventoryProducts.organizationId, ctx.organizationId)));
      } else if (entity === "invoices") {
        await db.update(invoices).set({ ...payload, updatedAt: new Date() } as any).where(and(eq(invoices.id, entityId), eq(invoices.organizationId, ctx.organizationId)));
      } else if (entity === "payments") {
        await db.update(payments).set({ ...payload, updatedAt: new Date() } as any).where(and(eq(payments.id, entityId), eq(payments.organizationId, ctx.organizationId)));
      } else if (entity === "expenses") {
        await db.update(expenses).set({ ...payload, updatedAt: new Date() } as any).where(and(eq(expenses.id, entityId), eq(expenses.organizationId, ctx.organizationId)));
      }

      return NextResponse.json({ success: true, operation: "update" });
    }

    if (operation === "delete" && existing) {
      if (entity === "clients") {
        await db.delete(clients).where(eq(clients.id, entityId));
      } else if (entity === "products") {
        await db.delete(inventoryProducts).where(eq(inventoryProducts.id, entityId));
      } else if (entity === "invoices") {
        await db.delete(invoices).where(eq(invoices.id, entityId));
      } else if (entity === "payments") {
        await db.delete(payments).where(eq(payments.id, entityId));
      } else if (entity === "expenses") {
        await db.delete(expenses).where(eq(expenses.id, entityId));
      }
      return NextResponse.json({ success: true, operation: "delete" });
    }

    if (operation === "create" && !existing) {
      let record: Record<string, unknown> | null = null;
      if (entity === "clients") {
        [record] = await db.insert(clients).values({ ...payload, organizationId: ctx.organizationId, userId: ctx.userId } as any).returning();
      } else if (entity === "products") {
        [record] = await db.insert(inventoryProducts).values({ ...payload, organizationId: ctx.organizationId, userId: ctx.userId } as any).returning();
      } else if (entity === "invoices") {
        [record] = await db.insert(invoices).values({ ...payload, organizationId: ctx.organizationId, userId: ctx.userId } as any).returning();
      } else if (entity === "payments") {
        [record] = await db.insert(payments).values({ ...payload, organizationId: ctx.organizationId, userId: ctx.userId } as any).returning();
      } else if (entity === "expenses") {
        [record] = await db.insert(expenses).values({ ...payload, organizationId: ctx.organizationId, userId: ctx.userId } as any).returning();
      }

      return NextResponse.json({ success: true, operation: "create", record }, { status: 201 });
    }

    return NextResponse.json(
      { error: "Invalid operation or record not found" },
      { status: 400 }
    );
  } catch (error) {
    logger.error("Sync push error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
