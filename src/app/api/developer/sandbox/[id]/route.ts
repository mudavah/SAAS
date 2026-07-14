import { NextResponse } from "next/server";
import { db } from "@/db";
import { apiSandboxSessions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { getCorsHeaders } from "@/lib/api/cors";
import { emitDeveloperEvent } from "@/lib/api/events";

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "sandbox.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const session = await db.query.apiSandboxSessions.findFirst({
    where: and(
      eq(apiSandboxSessions.id, id),
      eq(apiSandboxSessions.organizationId, ctx.organizationId)
    ),
  });

  if (!session) {
    return NextResponse.json({ error: "Sandbox session not found" }, { status: 404, headers: getCorsHeaders(req) });
  }

  await db
    .delete(apiSandboxSessions)
    .where(
      and(eq(apiSandboxSessions.id, id), eq(apiSandboxSessions.organizationId, ctx.organizationId))
    );

  await emitDeveloperEvent({
    organizationId: ctx.organizationId,
    eventType: "api.sandbox.deleted",
    userId: ctx.userId,
    resourceType: "sandbox_session",
    resourceId: id,
    metadata: { name: session.name },
  });

  return NextResponse.json({ success: true }, { headers: getCorsHeaders(req) });
}
