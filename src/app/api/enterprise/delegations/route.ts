import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { listDelegations, createDelegation, revokeDelegation } from "@/lib/enterprise/delegations";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "enterprise.delegations.manage");
  if ("error" in res) return res.error;
  const rows = await listDelegations(res.ctx);
  return NextResponse.json({ delegations: rows });
}

export async function POST(req: Request) {
  const res = await requireApiContext(req, "enterprise.delegations.manage");
  if ("error" in res) return res.error;
  const body = await req.json().catch(() => ({}));
  try {
    const row = await createDelegation(res.ctx, {
      delegateId: body.delegateId,
      scope: body.scope === "branch" ? "branch" : "organization",
      branchId: body.branchId,
      permissions: Array.isArray(body.permissions) ? body.permissions : [],
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    });
    return NextResponse.json({ delegation: row }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create delegation" },
      { status: 400 }
    );
  }
}
