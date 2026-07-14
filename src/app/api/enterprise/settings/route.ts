import { NextResponse } from "next/server";
import { db } from "@/db";
import { enterpriseSettings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "enterprise.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const settings = await db.query.enterpriseSettings.findFirst({
    where: eq(enterpriseSettings.organizationId, ctx.organizationId),
  });

  if (!settings) {
    return NextResponse.json({
      consolidatedReporting: true,
      crossBranchInventoryVisibility: true,
      centralizedProcurement: false,
      branchApprovalRequired: false,
      defaultTransferMethod: "standard",
      autoApproveTransfersBelow: null,
      settings: {},
    });
  }

  return NextResponse.json(settings);
}

export async function PATCH(req: Request) {
  const res = await requireApiContext(req, "enterprise.settings.manage");
  if ("error" in res) return res.error;
  const { ctx } = res;

  try {
    const body = await req.json();

    const existing = await db.query.enterpriseSettings.findFirst({
      where: eq(enterpriseSettings.organizationId, ctx.organizationId),
    });

    let updated;

    if (existing) {
      [updated] = await db
        .update(enterpriseSettings)
        .set({
          consolidatedReporting: body.consolidatedReporting ?? existing.consolidatedReporting,
          crossBranchInventoryVisibility: body.crossBranchInventoryVisibility ?? existing.crossBranchInventoryVisibility,
          centralizedProcurement: body.centralizedProcurement ?? existing.centralizedProcurement,
          branchApprovalRequired: body.branchApprovalRequired ?? existing.branchApprovalRequired,
          defaultTransferMethod: body.defaultTransferMethod ?? existing.defaultTransferMethod,
          autoApproveTransfersBelow: body.autoApproveTransfersBelow ?? existing.autoApproveTransfersBelow,
          settings: body.settings ?? existing.settings,
          updatedAt: new Date(),
        })
        .where(eq(enterpriseSettings.organizationId, ctx.organizationId))
        .returning();
    } else {
      [updated] = await db
        .insert(enterpriseSettings)
        .values({
          organizationId: ctx.organizationId,
          consolidatedReporting: body.consolidatedReporting ?? true,
          crossBranchInventoryVisibility: body.crossBranchInventoryVisibility ?? true,
          centralizedProcurement: body.centralizedProcurement ?? false,
          branchApprovalRequired: body.branchApprovalRequired ?? false,
          defaultTransferMethod: body.defaultTransferMethod || "standard",
          autoApproveTransfersBelow: body.autoApproveTransfersBelow,
          settings: body.settings || {},
        })
        .returning();
    }

    await logAuditSafe(ctx, {
      action: "enterprise.settings.update",
      category: "enterprise",
      resourceType: "enterprise_settings",
      resourceId: updated.id,
      description: "Updated enterprise settings",
      newValues: {
        consolidatedReporting: updated.consolidatedReporting,
        branchApprovalRequired: updated.branchApprovalRequired,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
