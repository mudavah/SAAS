import { NextResponse } from "next/server";
import { db } from "@/db";
import { posSessions } from "@/db/schema";
import { posSessionSchema } from "@/lib/validations";
import { eq, and, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { openSession, closeSession, getActiveSession } from "@/lib/pos/service";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "pos.shift.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const active = await getActiveSession(ctx);
  const recent = await db.query.posSessions.findMany({
    where: eq(posSessions.organizationId, ctx.organizationId),
    orderBy: (s, { desc }) => [desc(s.openedAt)],
    limit: 20,
  });

  return NextResponse.json({ active, recent });
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "pos.shift.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();
    const result = await openSession(ctx, body);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result, { status: result.status });
  } catch (error) {
    console.error("Open session error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
