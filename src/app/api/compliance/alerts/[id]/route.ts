import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/session";
import { complianceAlertUpdateSchema } from "@/lib/validations";
import { markAlertRead, resolveAlert } from "@/lib/compliance/alerts";
import { logAuditSafe } from "@/lib/audit";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const res = await requireApiContext(req, "compliance.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;
  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = complianceAlertUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    let updated = null;
    if (parsed.data.resolved !== undefined) {
      updated = await resolveAlert(id, ctx.organizationId, parsed.data.resolved);
    }
    if (parsed.data.read !== undefined) {
      updated = await markAlertRead(id, ctx.organizationId, parsed.data.read);
    }

    if (!updated) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    await logAuditSafe(ctx, {
      action: "compliance_alert.update",
      category: "compliance",
      resourceType: "compliance_alert",
      resourceId: id,
      description: `Updated compliance alert`,
      newValues: parsed.data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update compliance alert error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
