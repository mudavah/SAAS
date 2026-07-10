import { NextResponse } from "next/server";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "clients.delete");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const { id } = await params;

  const client = await db.query.clients.findFirst({
    where: and(
      eq(clients.id, id),
      eq(clients.organizationId, ctx.organizationId)
    ),
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  await db
    .delete(clients)
    .where(
      and(
        eq(clients.id, id),
        eq(clients.organizationId, ctx.organizationId)
      )
    );

  await logAuditSafe(ctx, {
    action: "client.delete",
    category: "clients",
    resourceType: "client",
    resourceId: id,
    description: `Deleted client ${client.name}`,
    oldValues: { name: client.name, email: client.email },
  });

  return NextResponse.json({ success: true });
}
