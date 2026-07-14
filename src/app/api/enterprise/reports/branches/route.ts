import { NextResponse } from "next/server";
import { db } from "@/db";
import { branchPerformanceSnapshots, enterpriseBranches } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireApiContext } from "@/lib/session";

export async function GET(req: Request) {
  const res = await requireApiContext(req, "enterprise.reports.view");
  if ("error" in res) return res.error;
  const { ctx } = res;

  const url = new URL(req.url);
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  const conditions = [
    eq(branchPerformanceSnapshots.organizationId, ctx.organizationId),
  ];

  let snapshots = await db.query.branchPerformanceSnapshots.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    orderBy: [desc(branchPerformanceSnapshots.periodStart)],
  });

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    snapshots = snapshots.filter((s) => {
      const d = new Date(s.periodStart);
      return d >= start && d <= end;
    });
  }

  const branches = await db.query.enterpriseBranches.findMany({
    where: eq(enterpriseBranches.organizationId, ctx.organizationId),
  });

  const report = branches.map((branch) => {
    const branchSnapshots = snapshots.filter((s) => s.branchId === branch.id);
    const revenue = branchSnapshots.reduce((sum, s) => sum + (Number(s.revenue) || 0), 0);
    const expenses = branchSnapshots.reduce((sum, s) => sum + (Number(s.expenses) || 0), 0);
    const profit = branchSnapshots.reduce((sum, s) => sum + (Number(s.profit) || 0), 0);
    const salesCount = branchSnapshots.reduce((sum, s) => sum + (s.salesCount || 0), 0);
    const transferCount = branchSnapshots.reduce((sum, s) => sum + (s.transferCount || 0), 0);

    return {
      branchId: branch.id,
      branchName: branch.name,
      branchCode: branch.code,
      revenue,
      expenses,
      profit,
      salesCount,
      transferCount,
      snapshotCount: branchSnapshots.length,
    };
  });

  return NextResponse.json({ branches: report });
}
