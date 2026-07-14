import { NextResponse } from "next/server";
import { db } from "@/db";
import { aiDocuments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { aiDocumentGenerateSchema } from "@/lib/validations";
import { generateAiDocument } from "@/lib/ai/documents";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "ai.access");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const conditions = [eq(aiDocuments.organizationId, ctx.organizationId)];
  if (status) conditions.push(eq(aiDocuments.status, status as any));
  const rows = await db.query.aiDocuments.findMany({
    where: eq(aiDocuments.organizationId, ctx.organizationId),
    orderBy: (d: any) => [desc(d.createdAt)],
    limit: 100,
  });
  return NextResponse.json({ data: rows });
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "ai.access");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const parsed = aiDocumentGenerateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }
  const { documentType, ...input } = parsed.data;

  const doc = await generateAiDocument(ctx, documentType, input);
  return NextResponse.json({ data: doc }, { status: 201 });
}
