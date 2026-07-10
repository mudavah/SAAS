import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizationMembers, users } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { getApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import type { PermissionKey } from "@/lib/rbac";

const MANAGE_TEAM: PermissionKey = "team.manage";

function hasPermission(permissions: Set<PermissionKey>, key: PermissionKey): boolean {
  return permissions.has(key);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const res = await getApiContext(_req);
  if ("error" in res) return res.error;
  const { ctx } = res;

  if (!hasPermission(ctx.permissions, MANAGE_TEAM)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const member = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.id, params.id),
      eq(organizationMembers.organizationId, ctx.organizationId)
    ),
  });

  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  await logAuditSafe(ctx as any, {
    action: "user.removed",
    category: "team",
    resourceType: "orgMember",
    resourceId: member.id,
    description: `Removed member ${member.email}`,
  });

  await db.delete(organizationMembers).where(eq(organizationMembers.id, member.id));

  return NextResponse.json({ success: true });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const res = await getApiContext(req);
  if ("error" in res) return res.error;
  const { ctx } = res;

  if (!hasPermission(ctx.permissions, MANAGE_TEAM)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { roleType } = await req.json().catch(() => ({ roleType: undefined })) as Record<string, string | undefined>;

  if (roleType) {
    await db.update(organizationMembers)
      .set({ roleType: roleType as any })
      .where(and(eq(organizationMembers.id, params.id), eq(organizationMembers.organizationId, ctx.organizationId)));

    await logAuditSafe(ctx as any, {
      action: "user.role_updated",
      category: "team",
      resourceType: "orgMember",
      resourceId: params.id,
      description: `Updated role to ${roleType}`,
    });
  }

  return NextResponse.json({ success: true });
}
