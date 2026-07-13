/**
 * KaziFlow — Procurement approval workflow (multi-level)
 * ------------------------------------------------------------------
 * When a purchase request or purchase order is submitted, an approval chain is
 * generated from the organization's policy (amount-tier → required role). The
 * policy can be overridden per-organization via
 * `organization.settings.procurementApprovalPolicy`; otherwise a sensible
 * default (manager → administrator → owner by amount) applies.
 */
import { db } from "@/db";
import {
  procurementApprovals,
  organizations,
  type RoleType,
  type ProcurementApproval,
} from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";

export interface ApprovalLevelDef {
  threshold: number;
  roleType: RoleType;
}

/** Default tiered approval policy (amount in minor-agnostic major units). */
export const DEFAULT_APPROVAL_POLICY: ApprovalLevelDef[] = [
  { threshold: 0, roleType: "manager" },
  { threshold: 100_000, roleType: "administrator" },
  { threshold: 1_000_000, roleType: "owner" },
];

function getPolicy(organizationId: string): Promise<ApprovalLevelDef[]> {
  return (async () => {
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
      columns: { settings: true },
    });
    const custom = (org?.settings as { procurementApprovalPolicy?: ApprovalLevelDef[] } | undefined)
      ?.procurementApprovalPolicy;
    if (Array.isArray(custom) && custom.length > 0) return custom;
    return DEFAULT_APPROVAL_POLICY;
  })();
}

/** Resolve the ordered list of approval levels required for a given total. */
export async function resolveApprovalLevels(
  organizationId: string,
  total: number
): Promise<ApprovalLevelDef[]> {
  const policy = await getPolicy(organizationId);
  const sorted = [...policy].sort((a, b) => a.threshold - b.threshold);
  const highest = sorted.filter((l) => total >= l.threshold).pop();
  if (!highest) return [];
  const idx = sorted.indexOf(highest);
  return sorted.slice(0, idx + 1);
}

/** Create the approval chain rows for a resource. Returns the created rows. */
export async function createApprovalChain(params: {
  organizationId: string;
  resourceType: "purchase_request" | "purchase_order";
  resourceId: string;
  total: number;
}): Promise<ProcurementApproval[]> {
  const levels = await resolveApprovalLevels(params.organizationId, params.total);
  if (levels.length === 0) return [];

  const rows = levels.map((level, i) => ({
    organizationId: params.organizationId,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    level: i + 1,
    requiredRoleType: level.roleType,
    status: "pending" as const,
  }));

  return db.insert(procurementApprovals).values(rows).returning();
}

export async function getApprovalChain(
  resourceType: string,
  resourceId: string
): Promise<ProcurementApproval[]> {
  return db.query.procurementApprovals.findMany({
    where: and(
      eq(procurementApprovals.resourceType, resourceType),
      eq(procurementApprovals.resourceId, resourceId)
    ),
    orderBy: (a) => [asc(a.level)],
  });
}

/**
 * Approve the next pending level. Returns the updated chain and whether the
 * resource is now fully approved.
 */
export async function approveNextLevel(params: {
  organizationId: string;
  resourceType: string;
  resourceId: string;
  approverId: string;
  comments?: string;
}): Promise<{ chain: ProcurementApproval[]; fullyApproved: boolean }> {
  const chain = await getApprovalChain(params.resourceType, params.resourceId);
  const pending = chain.find((a) => a.status === "pending");
  if (!pending) {
    return { chain, fullyApproved: chain.every((a) => a.status === "approved") };
  }

  await db
    .update(procurementApprovals)
    .set({
      status: "approved",
      approverId: params.approverId,
      decidedAt: new Date(),
      comments: params.comments ?? null,
    })
    .where(eq(procurementApprovals.id, pending.id));

  const updated = await getApprovalChain(params.resourceType, params.resourceId);
  return {
    chain: updated,
    fullyApproved: updated.every((a) => a.status === "approved"),
  };
}

/** Reject the entire chain (cascades remaining levels to rejected). */
export async function rejectChain(params: {
  organizationId: string;
  resourceType: string;
  resourceId: string;
  approverId: string;
  comments?: string;
}): Promise<ProcurementApproval[]> {
  const chain = await getApprovalChain(params.resourceType, params.resourceId);
  for (const level of chain) {
    if (level.status === "pending" || level.status === "approved") {
      await db
        .update(procurementApprovals)
        .set({
          status: "rejected",
          approverId: params.approverId,
          decidedAt: new Date(),
          comments: params.comments ?? null,
        })
        .where(eq(procurementApprovals.id, level.id));
    }
  }
  return getApprovalChain(params.resourceType, params.resourceId);
}
