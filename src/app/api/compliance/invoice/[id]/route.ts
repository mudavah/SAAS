import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { db } from "@/db";
import { etimsInvoices } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import type { EtimsInvoice } from "@/db/schema";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "compliance.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const { id } = await params;

  const record = await db.query.etimsInvoices.findFirst({
    where: and(
      eq(etimsInvoices.id, id),
      eq(etimsInvoices.organizationId, ctx.organizationId)
    ),
    with: { invoice: { with: { client: true } } },
  });

  if (!record) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }

  return NextResponse.json(record as EtimsInvoice);
}
