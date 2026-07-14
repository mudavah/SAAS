import { NextResponse } from "next/server";
import { db } from "@/db";
import { aiReports } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { aiReportGenerateSchema } from "@/lib/validations";
import { generateAiReport } from "@/lib/ai/reports";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "ai.access");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const rows = await db.query.aiReports.findMany({
    where: eq(aiReports.organizationId, ctx.organizationId),
    orderBy: (r: any) => [desc(r.createdAt)],
    limit: 50,
  });
  return NextResponse.json({ data: rows });
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "ai.access");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const parsed = aiReportGenerateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const report = await generateAiReport(ctx, parsed.data.type);
  return NextResponse.json({ data: report });
}
