import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  organizationMembers,
  users,
  notifications,
} from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { sendInviteEmail } from "@/lib/email";
import { randomBytes } from "crypto";
import { getApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import type { PermissionKey } from "@/lib/rbac";

const MANAGE_TEAM: PermissionKey = "team.manage";

export async function GET(req: Request) {
  const res = await getApiContext(req, MANAGE_TEAM);
  if ("error" in res) return res.error;
  const { ctx } = res;

  const members = await db.query.organizationMembers.findMany({
    where: and(
      eq(organizationMembers.organizationId, ctx.organizationId)
    ),
    with: { user: true },
    orderBy: [desc(organizationMembers.createdAt)],
  });

  return NextResponse.json({ members });
}

export async function POST(req: NextRequest) {
  const res = await getApiContext(req, MANAGE_TEAM);
  if ("error" in res) return res.error;
  const { ctx } = res;

  const body = await req.json();
  const { email, roleType = "employee" } = body as { email: string; roleType?: string };

  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  const inviteToken = randomBytes(32).toString("hex");

  if (!existingUser) {
    const fakeUserId = `invite-${randomBytes(16).toString("hex")}`;
    const [member] = await db.insert(organizationMembers).values({
      organizationId: ctx.organizationId,
      userId: fakeUserId,
      email,
      roleType: roleType as any,
      status: "invited",
    }).returning();

    await sendInviteEmail({
      to: email,
      orgName: ctx.organization.name,
      inviterName: ctx.name ?? undefined,
      role: roleType,
    });

    await db.insert(notifications).values({
      userId: fakeUserId,
      organizationId: ctx.organizationId,
      category: "organization",
      type: "invitation",
      title: "Pending Invitation",
      message: `Invitation sent to ${email} for ${ctx.organization.name}`,
      priority: "normal",
      read: false,
      archived: false,
      metadata: { inviteToken },
    });

    return NextResponse.json({ member: { ...member, email, roleType, status: "invited" } }, { status: 201 });
  }

  const [member] = await db.insert(organizationMembers).values({
    organizationId: ctx.organizationId,
    userId: existingUser.id,
    email,
    roleType: roleType as any,
    status: "active",
  }).returning();

  return NextResponse.json({ member: { ...existingUser, roleType, status: "active" } }, { status: 201 });
}
