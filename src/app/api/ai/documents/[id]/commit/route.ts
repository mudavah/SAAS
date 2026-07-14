import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { aiDocumentCommitSchema } from "@/lib/validations";
import { commitAiDocument } from "@/lib/ai/documents";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await requireApiContext(req, "ai.access");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const parsed = aiDocumentCommitSchema.safeParse({ documentId: id });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  try {
    const result = await commitAiDocument(ctx, id);
    return NextResponse.json({ data: result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to commit document" },
      { status: 400 }
    );
  }
}
