import { notFound } from "next/navigation";
import { getPageContext } from "@/lib/session";
import { db } from "@/db";
import { enterpriseBranches, branchMembers, branchPricing, branchTaxSettings, branchPerformanceSnapshots } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import BranchDetailClient from "./client";

export default async function BranchDetailPage({ params }: { params: { id: string } }) {
  const ctx = await getPageContext({ requiredPermission: "enterprise.view" });
  if (!ctx) notFound();

  const branch = await db.query.enterpriseBranches.findFirst({
    where: and(
      eq(enterpriseBranches.id, params.id),
      eq(enterpriseBranches.organizationId, ctx.organizationId)
    ),
  });

  if (!branch) notFound();

  const members = await db.query.branchMembers.findMany({
    where: eq(branchMembers.branchId, params.id),
    with: { user: true },
  });

  const pricing = await db.query.branchPricing.findMany({
    where: eq(branchPricing.branchId, params.id),
  });

  const taxes = await db.query.branchTaxSettings.findMany({
    where: eq(branchTaxSettings.branchId, params.id),
  });

  const performance = await db.query.branchPerformanceSnapshots.findMany({
    where: eq(branchPerformanceSnapshots.branchId, params.id),
    orderBy: [desc(branchPerformanceSnapshots.periodStart)],
    limit: 12,
  });

  return (
    <BranchDetailClient
      branch={branch}
      members={members}
      pricing={pricing}
      taxes={taxes}
      performance={performance}
    />
  );
}
