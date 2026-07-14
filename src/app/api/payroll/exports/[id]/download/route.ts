import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { buildPaymentExportContent } from "@/lib/payroll/service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: routeId } = await params;
  const res = await requireApiContext(_req, "payroll.export");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const result = await buildPaymentExportContent(ctx.organizationId, routeId);
  if (!result) return NextResponse.json({ error: "Export not found" }, { status: 404 });
  const mime = result.format === "csv" ? "text/csv" : "text/plain";
  return new NextResponse(result.content, {
    status: 200,
    headers: {
      "Content-Type": mime + "; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"" + result.filename + "\"",
    },
  });
}