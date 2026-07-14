/**
 * KaziFlow — Enterprise Settings service
 * ------------------------------------------------------------------
 * Organization-wide enterprise configuration stored in `enterpriseSettings`
 * (one row per organization, enforced by a unique index). Read requires
 * `enterprise.view`; updates require `enterprise.settings.manage`.
 */
import { db } from "@/db";
import {
  enterpriseSettings,
  type EnterpriseSetting,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import type { ServerContext } from "@/lib/session";
import { logAuditSafe } from "@/lib/audit";
import { EnterpriseError, requirePermission, notFound } from "./core";

export interface UpdateEnterpriseSettingsInput {
  consolidatedReporting?: boolean;
  crossBranchInventoryVisibility?: boolean;
  centralizedProcurement?: boolean;
  branchApprovalRequired?: boolean;
  defaultTransferMethod?: string;
  autoApproveTransfersBelow?: number | string | null;
  settings?: Record<string, unknown>;
}

export async function getEnterpriseSettings(
  ctx: ServerContext
): Promise<EnterpriseSetting> {
  requirePermission(ctx, "enterprise.view");
  const row = await db.query.enterpriseSettings.findFirst({
    where: eq(enterpriseSettings.organizationId, ctx.organizationId),
  });
  if (!row) notFound("Enterprise settings not found");
  return row;
}

export async function updateEnterpriseSettings(
  ctx: ServerContext,
  data: UpdateEnterpriseSettingsInput
): Promise<EnterpriseSetting> {
  requirePermission(ctx, "enterprise.settings.manage");
  if (!ctx.userId) throw new EnterpriseError("Missing user context", 401);

  const existing = await db.query.enterpriseSettings.findFirst({
    where: eq(enterpriseSettings.organizationId, ctx.organizationId),
    columns: { id: true },
  });

  let settings: EnterpriseSetting;
  if (existing) {
    const patch: Partial<typeof enterpriseSettings.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (data.consolidatedReporting !== undefined)
      patch.consolidatedReporting = data.consolidatedReporting;
    if (data.crossBranchInventoryVisibility !== undefined)
      patch.crossBranchInventoryVisibility = data.crossBranchInventoryVisibility;
    if (data.centralizedProcurement !== undefined)
      patch.centralizedProcurement = data.centralizedProcurement;
    if (data.branchApprovalRequired !== undefined)
      patch.branchApprovalRequired = data.branchApprovalRequired;
    if (data.defaultTransferMethod !== undefined)
      patch.defaultTransferMethod = data.defaultTransferMethod;
    if (data.autoApproveTransfersBelow !== undefined)
      patch.autoApproveTransfersBelow =
        data.autoApproveTransfersBelow === null
          ? null
          : String(data.autoApproveTransfersBelow);
    if (data.settings !== undefined) patch.settings = data.settings;

    const [updated] = await db
      .update(enterpriseSettings)
      .set(patch)
      .where(eq(enterpriseSettings.id, existing.id))
      .returning();
    settings = updated;
  } else {
    const [created] = await db
      .insert(enterpriseSettings)
      .values({
        organizationId: ctx.organizationId,
        consolidatedReporting: data.consolidatedReporting ?? true,
        crossBranchInventoryVisibility: data.crossBranchInventoryVisibility ?? true,
        centralizedProcurement: data.centralizedProcurement ?? false,
        branchApprovalRequired: data.branchApprovalRequired ?? false,
        defaultTransferMethod: data.defaultTransferMethod ?? "standard",
        autoApproveTransfersBelow:
          data.autoApproveTransfersBelow === null
            ? null
            : data.autoApproveTransfersBelow !== undefined
            ? String(data.autoApproveTransfersBelow)
            : null,
        settings: data.settings ?? {},
      })
      .returning();
    settings = created;
  }

  await logAuditSafe(ctx, {
    action: "enterprise.settings.update",
    category: "enterprise",
    resourceType: "enterprise_settings",
    resourceId: settings.id,
    description: `Updated enterprise settings`,
    newValues: {
      consolidatedReporting: settings.consolidatedReporting,
      branchApprovalRequired: settings.branchApprovalRequired,
    },
  });

  return settings;
}
