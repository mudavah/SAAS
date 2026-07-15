import { NextResponse } from "next/server";
import { db } from "@/db";
import { taxCalendar } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { taxCalendarUpdateSchema } from "@/lib/validations";
import { logAuditSafe } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "compliance.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = taxCalendarUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const existing = await db.query.taxCalendar.findFirst({
      where: and(
        eq(taxCalendar.id, id),
        eq(taxCalendar.organizationId, ctx.organizationId)
      ),
    });
    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const [updated] = await db
      .update(taxCalendar)
      .set({
        ...parsed.data,
      })
      .where(
        and(
          eq(taxCalendar.id, id),
          eq(taxCalendar.organizationId, ctx.organizationId)
        )
      )
      .returning();

    await logAuditSafe(ctx, {
      action: "tax_calendar.update",
      category: "compliance",
      resourceType: "tax_calendar",
      resourceId: id,
      description: `Updated tax calendar event: ${updated.title}`,
      newValues: parsed.data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Update calendar event error:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "compliance.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const existing = await db.query.taxCalendar.findFirst({
    where: and(
      eq(taxCalendar.id, id),
      eq(taxCalendar.organizationId, ctx.organizationId)
    ),
  });
  if (!existing) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  await db
    .delete(taxCalendar)
    .where(
      and(
        eq(taxCalendar.id, id),
        eq(taxCalendar.organizationId, ctx.organizationId)
      )
    );

  await logAuditSafe(ctx, {
    action: "tax_calendar.delete",
    category: "compliance",
    resourceType: "tax_calendar",
    resourceId: id,
    description: `Deleted tax calendar event: ${existing.title}`,
  });

  return NextResponse.json({ success: true });
}
