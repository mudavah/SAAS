import { NextResponse } from "next/server";
import { db } from "@/db";
import { branchMembers } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(_req, "enterprise.view");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  const members = await db.query.branchMembers.findMany({
    where: and(
      eq(branchMembers.organizationId, ctx.organizationId),
      eq(branchMembers.branchId, id)
    ),
    orderBy: [desc(branchMembers.createdAt)],
  });

  return NextResponse.json(members);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "enterprise.branches.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  try {
    const body = await req.json();

    if (!body.userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const [member] = await db
      .insert(branchMembers)
      .values({
        organizationId: ctx.organizationId,
        branchId: id,
        userId: body.userId,
        roleType: body.roleType || "employee",
        customRoleId: body.customRoleId,
        permissions: body.permissions || [],
        isPrimary: body.isPrimary || false,
      })
      .returning();

    await logAuditSafe(ctx, {
      action: "enterprise.branch_member.create",
      category: "enterprise",
      resourceType: "branch_member",
      resourceId: member.id,
      description: `Added user ${body.userId} to branch ${id}`,
      newValues: { branchId: id, userId: body.userId, roleType: member.roleType },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error("Add branch member error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(_req, "enterprise.branches.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  try {
    const body = await _req.json();
    const memberId = body.memberId;

    if (!memberId) {
      return NextResponse.json(
        { error: "memberId is required in body" },
        { status: 400 }
      );
    }

    const deleted = await db
      .delete(branchMembers)
      .where(
        and(
          eq(branchMembers.id, memberId),
          eq(branchMembers.branchId, id),
          eq(branchMembers.organizationId, ctx.organizationId)
        )
      )
      .returning();

    if (!deleted.length) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    await logAuditSafe(ctx, {
      action: "enterprise.branch_member.delete",
      category: "enterprise",
      resourceType: "branch_member",
      resourceId: memberId,
      description: `Removed user ${deleted[0].userId} from branch ${id}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove branch member error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
