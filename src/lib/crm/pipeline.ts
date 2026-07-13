/**
 * KaziFlow — CRM Pipeline Stage bootstrapping
 * ------------------------------------------------------------------
 * Each organization gets its own, fully customizable sales pipeline. When an
 * org first uses the pipeline we seed a sensible default set (including exactly
 * one terminal "Won" and one terminal "Lost" stage) so drag-and-drop works out
 * of the box. Idempotent: safe to call on every pipeline read.
 */
import { db } from "@/db";
import { crmPipelineStages } from "@/db/schema";
import { and, count, eq } from "drizzle-orm";

const DEFAULT_STAGES = [
  { name: "New", order: 0, probability: 10, color: "#64748b", isDefault: true, isWon: false, isLost: false },
  { name: "Qualified", order: 1, probability: 30, color: "#0ea5e9", isDefault: false, isWon: false, isLost: false },
  { name: "Proposal", order: 2, probability: 50, color: "#8b5cf6", isDefault: false, isWon: false, isLost: false },
  { name: "Negotiation", order: 3, probability: 75, color: "#f59e0b", isDefault: false, isWon: false, isLost: false },
  { name: "Won", order: 4, probability: 100, color: "#16a34a", isDefault: false, isWon: true, isLost: false },
  { name: "Lost", order: 5, probability: 0, color: "#ef4444", isDefault: false, isWon: false, isLost: true },
];

export async function ensureDefaultPipelineStages(
  organizationId: string,
  userId: string
): Promise<void> {
  const [existing] = await db
    .select({ count: count() })
    .from(crmPipelineStages)
    .where(eq(crmPipelineStages.organizationId, organizationId));

  if (Number(existing?.count ?? 0) > 0) return;

  await db.insert(crmPipelineStages).values(
    DEFAULT_STAGES.map((s) => ({
      organizationId,
      userId,
      ...s,
    }))
  );
}

export async function getPipelineStages(organizationId: string, userId: string) {
  await ensureDefaultPipelineStages(organizationId, userId);
  return db.query.crmPipelineStages.findMany({
    where: eq(crmPipelineStages.organizationId, organizationId),
    orderBy: (s) => [s.order],
  });
}
