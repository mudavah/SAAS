import { NextResponse } from "next/server";
import { db } from "@/db";
import { taxCalendar } from "@/db/schema";
import { requireApiContext } from "@/lib/session";
import { taxCalendarEventSchema } from "@/lib/validations";
import {
  listCalendarEvents,
  ensureDefaultCalendar,
} from "@/lib/compliance/calendar";
import { logAuditSafe } from "@/lib/audit";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "compliance.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const url = new URL(req.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const seed = url.searchParams.get("seed") === "true";

  // Seed default statutory deadlines the first time the calendar is opened.
  if (seed) {
    try {
      await ensureDefaultCalendar(ctx.organizationId);
    } catch (err) {
      console.error("ensureDefaultCalendar failed:", err);
    }
  }

  const events = await listCalendarEvents(ctx.organizationId, {
    from: fromParam ? new Date(fromParam) : undefined,
    to: toParam ? new Date(toParam) : undefined,
  });

  return NextResponse.json(events);
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "compliance.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const parsed = taxCalendarEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const [event] = await db
      .insert(taxCalendar)
      .values({
        organizationId: ctx.organizationId,
        title: parsed.data.title,
        description: parsed.data.description,
        dueDate: parsed.data.dueDate,
        type: parsed.data.type,
        recurring: parsed.data.recurring,
      })
      .returning();

    await logAuditSafe(ctx, {
      action: "tax_calendar.create",
      category: "compliance",
      resourceType: "tax_calendar",
      resourceId: event.id,
      description: `Added tax calendar event: ${event.title}`,
      newValues: { title: event.title, dueDate: event.dueDate },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("Create calendar event error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
