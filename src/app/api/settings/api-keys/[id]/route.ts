import { NextResponse } from "next/server";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "api.keys.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const { id } = await params;

  const key = await db.query.apiKeys.findFirst({
    where: and(
      eq(apiKeys.id, id),
      eq(apiKeys.organizationId, ctx.organizationId)
    ),
  });

  if (!key) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 });
  }

  await db
    .update(apiKeys)
    .set({ status: "revoked", revokedAt: new Date(), revokedBy: ctx.userId! })
    .where(
      and(
        eq(apiKeys.id, id),
        eq(apiKeys.organizationId, ctx.organizationId)
      )
    );

  await logAuditSafe(ctx, {
    action: "api.key.revoke",
    category: "api",
    resourceType: "api_key",
    resourceId: id,
    description: `Revoked API key "${key.name}"`,
  });

  return NextResponse.json({ success: true });
}
