import { NextResponse } from "next/server";
import { db } from "@/db";
import { organizationMembers, users } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { getApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { hasPermission, SYSTEM_ROLES, type PermissionKey, type SystemRole } from "@/lib/rbac";

const MANAGE_TEAM: PermissionKey = "team.manage";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const res = await getApiContext(_req);
  if ("error" in res) return res.error;
  const { ctx } = res;

  if (!hasPermission(ctx.permissions, MANAGE_TEAM)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const member = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.id, id),
      eq(organizationMembers.organizationId, ctx.organizationId)
    ),
  });

  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  // Never allow removing an owner unless the caller is also an owner.
  if (member.roleType === "owner" && ctx.roleType !== "owner") {
    return NextResponse.json(
      { error: "Only an owner can remove another owner" },
      { status: 403 }
    );
  }

  // Protect the last owner of the organization from being removed.
  if (member.roleType === "owner") {
    const owners = await db.query.organizationMembers.findMany({
      where: and(
        eq(organizationMembers.organizationId, ctx.organizationId),
        eq(organizationMembers.roleType, "owner"),
        eq(organizationMembers.status, "active")
      ),
      columns: { id: true },
    });
    if (owners.length <= 1) {
      return NextResponse.json(
        { error: "Cannot remove the last owner of the organization" },
        { status: 409 }
      );
    }
  }

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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const res = await getApiContext(req);
  if ("error" in res) return res.error;
  const { ctx } = res;

  if (!hasPermission(ctx.permissions, MANAGE_TEAM)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    roleType?: string;
  };

  let roleType = body.roleType;
  if (roleType && !SYSTEM_ROLES.includes(roleType as SystemRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Only an owner may assign the owner role (prevents privilege escalation).
  if (roleType === "owner" && ctx.roleType !== "owner") {
    return NextResponse.json(
      { error: "Only an owner can assign the owner role" },
      { status: 403 }
    );
  }

  if (roleType) {
    const member = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.id, id),
        eq(organizationMembers.organizationId, ctx.organizationId)
      ),
      columns: { id: true, roleType: true },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Prevent demoting the last remaining owner.
    if (
      member.roleType === "owner" &&
      roleType !== "owner" &&
      ctx.roleType === "owner"
    ) {
      const owners = await db.query.organizationMembers.findMany({
        where: and(
          eq(organizationMembers.organizationId, ctx.organizationId),
          eq(organizationMembers.roleType, "owner"),
          eq(organizationMembers.status, "active")
        ),
        columns: { id: true },
      });
      if (owners.length <= 1) {
        return NextResponse.json(
          { error: "Cannot demote the last owner of the organization" },
          { status: 409 }
        );
      }
    }

    await db
      .update(organizationMembers)
      .set({ roleType: roleType as any })
      .where(
        and(
          eq(organizationMembers.id, id),
          eq(organizationMembers.organizationId, ctx.organizationId)
        )
      );

    await logAuditSafe(ctx as any, {
      action: "user.role_updated",
      category: "team",
      resourceType: "orgMember",
      resourceId: id,
      description: `Updated role to ${roleType}`,
    });
  }

  return NextResponse.json({ success: true });
}
