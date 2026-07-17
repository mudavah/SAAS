import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { revokeDelegation } from "@/lib/enterprise/delegations";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "enterprise.delegations.manage");
  if ("error" in res) return res.error;
  const { id } = await params;
  const row = await revokeDelegation(res.ctx, id);
  if (!row) return NextResponse.json({ error: "Delegation not found" }, { status: 404 });
  return NextResponse.json({ delegation: row });
}
