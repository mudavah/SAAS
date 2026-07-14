import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { postPayrollJournal } from "@/lib/payroll/service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: routeId } = await params;
  const res = await requireApiContext(req, "payroll.runs.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const result = await postPayrollJournal(ctx, routeId);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ journalEntryId: result.journalEntryId }, { status: result.status });
}