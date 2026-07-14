import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { decideApproval } from "@/lib/automation/approval";
import { approvalDecisionSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await requireApiContext(req, "approvals.approve");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const parsed = approvalDecisionSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  try {
    const updated = await decideApproval(ctx, id, "approve", parsed.data.comment);
    return NextResponse.json({ data: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Approval failed" },
      { status: 400 }
    );
  }
}
